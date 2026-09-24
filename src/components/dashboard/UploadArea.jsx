'use client'

import { useState, useCallback, useEffect, useRef, useMemo, useSyncExternalStore } from 'react'
import { createPortal } from 'react-dom'
import { useDropzone } from 'react-dropzone'
import { useAuth } from '@/components/providers/AuthProvider'
import { Button } from '@/components/ui/button'
import { CardContent } from '@/components/ui/card'
import {
  X, Loader2, CloudUpload,
  CheckCircle2, AlertCircle, RotateCcw, Pause, Play,
  FileText, FileImage, FileVideo, FileAudio, FileArchive, FileIcon,
  Clock, Zap, ChevronDown, ChevronUp
} from 'lucide-react'
import { storageService } from '@/services/storageService'
import { firestoreService } from '@/services/firestoreService'
import { useNotification, useCompletionNotification } from '@/components/providers/NotificationProvider'
import { logger } from '@/lib/logger'
import { motion, AnimatePresence } from 'framer-motion'

/* ═══════════════════════════════════════════════════════════════════════
   HELPERS
   ═════════════════════════════════════════════════════════════════════ */
const fmt = (b) => {
  if (!b || b === 0) return '0 B'
  const k = 1024, u = ['B', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(b) / Math.log(k))
  return parseFloat((b / Math.pow(k, i)).toFixed(1)) + ' ' + u[i]
}
const fmtSpeed = (bps) => bps > 0 ? fmt(bps) + '/s' : ''
const fmtETA = (s) => {
  if (!s || s <= 0 || !isFinite(s)) return ''
  if (s < 60) return `${Math.ceil(s)}s left`
  if (s < 3600) return `${Math.floor(s / 60)}m ${Math.ceil(s % 60)}s left`
  return `${Math.floor(s / 3600)}h ${Math.floor((s % 3600) / 60)}m left`
}
function FileTypeIcon({ type, className }) {
  if (type?.startsWith('image/')) return <FileImage className={className} />
  if (type?.startsWith('video/')) return <FileVideo className={className} />
  if (type?.startsWith('audio/')) return <FileAudio className={className} />
  if (/zip|rar|tar|7z|compress/i.test(type || '')) return <FileArchive className={className} />
  if (/pdf|doc|text|sheet|presentation/i.test(type || '')) return <FileText className={className} />
  return <FileIcon className={className} />
}

const emptySubscribe = () => () => {}
const useIsClient = () => useSyncExternalStore(emptySubscribe, () => true, () => false)

/* ═══════════════════════════════════════════════════════════════════════
   CONSTANTS
   ═════════════════════════════════════════════════════════════════════ */
const MAX_CONCURRENT = 3
const MAX_RETRIES = 3
const DONE_LINGER = 5000

/* ═══════════════════════════════════════════════════════════════════════
   SMOOTH PROGRESS INTERPOLATOR
   
   Firebase fires state_changed per chunk (~256KB-1MB). On fast networks,
   events arrive in bursts with gaps → UI looks like it jumps.
   
   This class smoothly interpolates the displayed progress between real
   Firebase events using requestAnimationFrame, giving 60fps animation
   that feels like Google Drive's pixel-perfect progress tracking.
   ═════════════════════════════════════════════════════════════════════ */
class SmoothProgress {
  constructor() {
    this.current = 0         // displayed value (0-100)
    this.target = 0          // target from Firebase
    this.speed = 0           // bytes/sec
    this.eta = 0
    this.bytesTransferred = 0
    this.totalBytes = 0
    this.status = 'queued'
    this.error = null
    this._raf = null
    this._lastTick = 0
  }

  setTarget(pct, data) {
    this.target = pct
    if (data) {
      this.speed = data.speed ?? this.speed
      this.eta = data.eta ?? this.eta
      this.bytesTransferred = data.bytesTransferred ?? this.bytesTransferred
      this.totalBytes = data.totalBytes ?? this.totalBytes
      if (data.status) this.status = data.status
      if (data.error !== undefined) this.error = data.error
    }
  }

  // Call from rAF loop — eases current toward target
  tick() {
    if (this.status === 'completed') { this.current = 100; return }
    if (this.status === 'error') return
    
    const diff = this.target - this.current
    if (Math.abs(diff) < 0.05) {
      this.current = this.target
    } else {
      // Ease toward target: fast when far, slow when close
      // This creates that smooth Google Drive feel
      this.current += diff * 0.15
    }
  }

  snapshot() {
    return {
      progress: Math.round(this.current * 10) / 10,
      target: this.target,
      speed: this.speed,
      eta: this.eta,
      bytesTransferred: this.bytesTransferred,
      totalBytes: this.totalBytes,
      status: this.status,
      error: this.error,
    }
  }

  destroy() {
    if (this._raf) cancelAnimationFrame(this._raf)
  }
}

/* ═══════════════════════════════════════════════════════════════════════
   MAIN COMPONENT
   ═════════════════════════════════════════════════════════════════════ */
export function UploadArea({ currentFolder, onUploadComplete, onRegisterTrigger }) {
  const { user } = useAuth()
  const { showSuccess, showError } = useNotification()
  const { logUploadCompletion } = useCompletionNotification()

  // UI state
  const [display, setDisplay] = useState([])
  const [isDragActive, setIsDragActive] = useState(false)
  const [panelCollapsed, setPanelCollapsed] = useState(false)
  const [mobileExpanded, setMobileExpanded] = useState(false)

  // Refs for upload management
  const itemsRef = useRef([])        // source of truth for upload items (metadata only)
  const smoothers = useRef({})        // SmoothProgress instances per upload id
  const tasksRef = useRef({})         // Firebase UploadTask refs
  const speedData = useRef({})        // rolling speed samples
  const openFnRef = useRef(null)
  const alive = useRef(true)
  const activeN = useRef(0)
  const queue = useRef([])

  useEffect(() => () => { alive.current = false }, [])

  /* ─── 60fps animation loop ──────────────────────────────────────────
     This is the key difference from the previous approach.
     Instead of setInterval(350ms), we use requestAnimationFrame for
     buttery smooth progress updates. Every ~16ms we:
     1. Tick each smoother (eases displayed progress toward real target)
     2. Build the display array from smoothers + item metadata
     3. Only call setDisplay if something actually changed
  ──────────────────────────────────────────────────────────────────── */
  useEffect(() => {
    let rafId
    let lastSync = 0
    const SYNC_INTERVAL = 100 // sync to React every 100ms (10 fps for state, 60fps for smoothing)

    const loop = (now) => {
      if (!alive.current) return
      rafId = requestAnimationFrame(loop)

      // Tick all smoothers every frame (60fps easing)
      Object.values(smoothers.current).forEach(s => s.tick())

      // Sync to React state at 10fps (avoids excessive re-renders)
      if (now - lastSync < SYNC_INTERVAL) return
      lastSync = now

      const items = itemsRef.current
      if (items.length === 0 && display.length === 0) return

      const next = items.map(item => {
        const sm = smoothers.current[item.id]
        const snap = sm ? sm.snapshot() : {}
        return {
          ...item,
          progress: snap.progress ?? item.progress ?? 0,
          speed: snap.speed ?? 0,
          eta: snap.eta ?? 0,
          status: snap.status ?? item.status,
          error: snap.error ?? item.error,
          bytesTransferred: snap.bytesTransferred ?? 0,
          totalBytes: snap.totalBytes ?? item.totalBytes ?? item.size,
        }
      })

      setDisplay(prev => {
        if (prev.length !== next.length) return next
        for (let i = 0; i < next.length; i++) {
          const p = prev[i], n = next[i]
          if (!p || p.id !== n.id) return next
          if (p.progress !== n.progress || p.status !== n.status ||
            p.speed !== n.speed || p.bytesTransferred !== n.bytesTransferred ||
            p.error !== n.error) return next
        }
        return prev // no changes, skip re-render
      })
    }

    rafId = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(rafId)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  /* ─── Item management ──────────────────────────────────────────── */
  const addItem = useCallback((item) => {
    itemsRef.current = [...itemsRef.current, item]
    smoothers.current[item.id] = new SmoothProgress()
  }, [])

  const removeItem = useCallback((id) => {
    itemsRef.current = itemsRef.current.filter(u => u.id !== id)
    if (smoothers.current[id]) { smoothers.current[id].destroy(); delete smoothers.current[id] }
    delete tasksRef.current[id]
    delete speedData.current[id]
  }, [])

  /* ─── Process one upload ────────────────────────────────────────── */
  const processOne = useCallback((item) => {
    return new Promise((resolve) => {
      if (!user) {
        smoothers.current[item.id]?.setTarget(0, { status: 'error', error: 'Not signed in' })
        return resolve('error')
      }

      const { id, name, file } = item
      const path = `${user.uid}/${id}_${name}`

      // Phase 1: PREPARING
      smoothers.current[id]?.setTarget(0, { status: 'preparing', error: null })
      speedData.current[id] = { samples: [], lastBytes: 0, lastTime: performance.now() }

      try {
        const task = storageService.uploadFileResumable(path, file)
        tasksRef.current[id] = task

        task.on('state_changed',
          /* ── PROGRESS ── */
          (snap) => {
            const realPct = (snap.bytesTransferred / snap.totalBytes) * 100
            const now = performance.now()
            const sd = speedData.current[id]
            let speed = 0, eta = 0

            if (sd) {
              const dt = (now - sd.lastTime) / 1000
              if (dt > 0.15) { // sample speed every 150ms+
                const byteDelta = snap.bytesTransferred - sd.lastBytes
                if (byteDelta > 0) {
                  const instant = byteDelta / dt
                  sd.samples.push(instant)
                  if (sd.samples.length > 10) sd.samples.shift()
                }
                sd.lastBytes = snap.bytesTransferred
                sd.lastTime = now
              }
              if (sd.samples.length > 0) {
                speed = sd.samples.reduce((a, b) => a + b, 0) / sd.samples.length
                const remaining = snap.totalBytes - snap.bytesTransferred
                eta = speed > 0 ? remaining / speed : 0
              }
            }

            // Feed the smoother — it will ease toward this target at 60fps
            smoothers.current[id]?.setTarget(realPct, {
              status: snap.state === 'paused' ? 'paused' : 'uploading',
              speed, eta,
              bytesTransferred: snap.bytesTransferred,
              totalBytes: snap.totalBytes,
            })
          },
          /* ── ERROR ── */
          (err) => {
            if (err.code === 'storage/canceled') {
              removeItem(id)
              return resolve('cancelled')
            }
            logger.error('Upload error:', err)
            const msg = err.code === 'storage/retry-limit-exceeded' ? 'Network error'
              : err.message || 'Upload failed'
            smoothers.current[id]?.setTarget(smoothers.current[id]?.current ?? 0, { status: 'error', error: msg })
            delete tasksRef.current[id]
            showError(`Failed: ${name}`)
            resolve('error')
          },
          /* ── COMPLETE ── */
          async () => {
            // Phase 3: FINALIZING
            smoothers.current[id]?.setTarget(100, {
              status: 'finalizing', speed: 0, eta: 0,
              bytesTransferred: file.size, totalBytes: file.size,
            })

            try {
              const url = await storageService.getDownloadURL(path)
              await firestoreService.createFile(user.uid, {
                filename: name, size: file.size,
                contentType: file.type || 'application/octet-stream',
                storagePath: path, downloadURL: url,
                folderId: currentFolder?.id || null,
              })

              logUploadCompletion(name, false)
              smoothers.current[id]?.setTarget(100, { status: 'completed' })
              delete tasksRef.current[id]

              // Auto-remove after linger
              setTimeout(() => removeItem(id), DONE_LINGER)

              window.dispatchEvent(new CustomEvent('upload:complete', { detail: { fileName: name } }))
              window.dispatchEvent(new CustomEvent('file:operation', { detail: { action: 'upload', fileName: name, size: file.size } }))
              try { localStorage.setItem('quota:update', Date.now().toString()); localStorage.removeItem('quota:update') } catch (_) { }

              showSuccess(`${name} uploaded!`)
              if (onUploadComplete) onUploadComplete()
              resolve('ok')
            } catch (e) {
              logger.error('Metadata save error:', e)
              smoothers.current[id]?.setTarget(100, { status: 'error', error: 'File uploaded but save failed' })
              showError(`Save failed: ${name}`)
              resolve('error')
            }
          }
        )
      } catch (e) {
        logger.error('Upload init error:', e)
        smoothers.current[id]?.setTarget(0, { status: 'error', error: e.message || 'Failed to start' })
        showError(`Start failed: ${name}`)
        resolve('error')
      }
    })
  }, [user, currentFolder, onUploadComplete, logUploadCompletion, showError, showSuccess, removeItem])

  /* ─── Queue drainer ────────────────────────────────────────────── */
  const drainRef = useRef(null)
  const drain = useCallback(() => {
    while (activeN.current < MAX_CONCURRENT && queue.current.length > 0) {
      const item = queue.current.shift()
      if (!item) break
      activeN.current++
      processOne(item).finally(() => { activeN.current--; drainRef.current?.() })
    }
  }, [processOne])
  useEffect(() => {
    drainRef.current = drain
  }, [drain])

  /* ─── Cancel / Retry ───────────────────────────────────────────── */
  const cancelOne = useCallback((id) => {
    const item = itemsRef.current.find(u => u.id === id)
    const sm = smoothers.current[id]
    const isLive = sm && ['uploading', 'preparing', 'paused'].includes(sm.status)
    if (isLive && !window.confirm(`Cancel upload "${item?.name || 'file'}"?`)) return
    const task = tasksRef.current[id]
    if (task) { try { task.cancel() } catch (_) { } }
    queue.current = queue.current.filter(q => q.id !== id)
    removeItem(id)
  }, [removeItem])

  const cancelAll = useCallback(() => {
    const n = itemsRef.current.length
    if (!n || !window.confirm(`Cancel all ${n} upload${n > 1 ? 's' : ''}?`)) return
    Object.values(tasksRef.current).forEach(t => { try { t.cancel() } catch (_) { } })
    Object.values(smoothers.current).forEach(s => s.destroy())
    queue.current = []; activeN.current = 0
    itemsRef.current = []; tasksRef.current = {}; smoothers.current = {}; speedData.current = {}
    setDisplay([])
  }, [])

  const retryOne = useCallback((id) => {
    const item = itemsRef.current.find(u => u.id === id)
    if (!item?.file) return
    const retries = (item.retries || 0) + 1
    if (retries > MAX_RETRIES) { showError('Max retries reached'); return }
    item.retries = retries
    smoothers.current[id]?.setTarget(0, { status: 'queued', error: null })
    queue.current.push(item)
    setTimeout(drain, 500)
  }, [drain, showError])

  /* ─── Pause / Resume ───────────────────────────────────────────── */
  const pauseOne = useCallback((id) => {
    const task = tasksRef.current[id]
    if (task) { try { task.pause() } catch (_) { } }
  }, [])

  const resumeOne = useCallback((id) => {
    const task = tasksRef.current[id]
    if (task) { try { task.resume() } catch (_) { } }
  }, [])

  /* ─── onDrop ────────────────────────────────────────────────────── */
  const onDrop = useCallback((accepted, rejected) => {
    if (rejected?.length) showError(`${rejected.length} file(s) rejected`)
    if (!accepted?.length) return

    accepted.forEach(file => {
      const item = {
        id: `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        name: file.name, size: file.size, type: file.type, file,
        progress: 0, status: 'queued', retries: 0,
      }
      addItem(item)
      queue.current.push(item)
    })

    if (accepted.length > 1) showSuccess(`Queuing ${accepted.length} files…`)
    setPanelCollapsed(false)
    setMobileExpanded(true)
    drain()
    setIsDragActive(false)
  }, [drain, addItem, showError, showSuccess])

  /* ─── Dropzone ──────────────────────────────────────────────────── */
  const { getRootProps, getInputProps, open } = useDropzone({
    onDrop,
    onDragEnter: () => setIsDragActive(true),
    onDragLeave: () => setIsDragActive(false),
    onDragOver: (e) => { e.preventDefault(); setIsDragActive(true) },
    noClick: true, noKeyboard: true, multiple: true,
  })
  useEffect(() => { openFnRef.current = open }, [open])
  useEffect(() => { if (onRegisterTrigger) onRegisterTrigger(() => openFnRef.current?.()) }, [onRegisterTrigger])

  /* ─── Stats ─────────────────────────────────────────────────────── */
  const stats = useMemo(() => {
    const active = display.filter(u => ['uploading', 'preparing', 'finalizing'].includes(u.status))
    const queued = display.filter(u => u.status === 'queued')
    const errors = display.filter(u => u.status === 'error')
    const pending = display.filter(u => !['completed', 'error'].includes(u.status))
    const totalB = display.reduce((s, u) => s + (u.totalBytes || u.size || 0), 0)
    const doneB = display.reduce((s, u) => {
      if (u.status === 'completed') return s + (u.size || 0)
      return s + (u.bytesTransferred || 0)
    }, 0)
    const pct = totalB > 0 ? Math.round((doneB / totalB) * 100) : 0
    const spd = active.reduce((s, u) => s + (u.speed || 0), 0)
    const eta = spd > 0 ? (totalB - doneB) / spd : 0
    return { active, queued, errors, pending, totalB, doneB, pct, spd, eta, total: display.length }
  }, [display])

  const has = display.length > 0

  /* ═══════════════════════════════════════════════════════════════════
     SHARED UPLOAD PANEL (used by desktop sidebar + mobile float)
     ═══════════════════════════════════════════════════════════════════ */
  const panel = has ? (
    <div className="overflow-hidden rounded-xl border border-white/10 bg-card/95 backdrop-blur-sm shadow-lg">
      {/* ── Header ── */}
      <button
        className="w-full flex items-center justify-between px-3 py-2.5 hover:bg-muted/10 transition-colors"
        onClick={() => setPanelCollapsed(c => !c)}
      >
        <div className="flex items-center gap-2 min-w-0">
          {stats.pending.length > 0 ? (
            <Loader2 className="w-4 h-4 animate-spin text-blue-500 flex-shrink-0" />
          ) : stats.errors.length > 0 ? (
            <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
          ) : (
            <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0" />
          )}
          <span className="text-xs font-semibold truncate">
            {stats.pending.length > 0
              ? `Uploading ${stats.active.length}/${stats.total}`
              : stats.errors.length > 0 ? `${stats.errors.length} failed` : 'Complete'}
          </span>
          {stats.queued.length > 0 && <span className="text-[10px] text-muted-foreground">+{stats.queued.length}</span>}
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {stats.spd > 0 && (
            <span className="text-[10px] text-blue-400 font-mono hidden sm:inline">{fmtSpeed(stats.spd)}</span>
          )}
          <span className="text-[11px] font-bold text-muted-foreground tabular-nums">{stats.pct}%</span>
          <ChevronDown className={`w-3.5 h-3.5 text-muted-foreground transition-transform ${panelCollapsed ? 'rotate-180' : ''}`} />
        </div>
      </button>

      {/* ── Global progress ── */}
      {stats.pending.length > 0 && (
        <div className="px-3 pb-2">
          <ProgressBar pct={stats.pct} isPreparing={stats.active.length > 0 && stats.pct === 0} />
          <div className="flex justify-between items-center mt-1">
            <span className="text-[10px] text-muted-foreground tabular-nums">{fmt(stats.doneB)} / {fmt(stats.totalB)}</span>
            <button onClick={(e) => { e.stopPropagation(); cancelAll() }}
              className="text-[10px] text-red-400 hover:text-red-300 font-semibold px-1.5 py-0.5 rounded hover:bg-red-500/10 active:bg-red-500/20 transition-colors">
              Cancel all
            </button>
          </div>
        </div>
      )}

      {/* ── File rows ── */}
      <AnimatePresence>
        {!panelCollapsed && (
          <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }} className="overflow-hidden">
            <div className="max-h-[240px] overflow-y-auto border-t border-white/5">
              {display.map(u => (
                <UploadRow key={u.id} u={u}
                  onPause={() => pauseOne(u.id)}
                  onResume={() => resumeOne(u.id)}
                  onRetry={() => retryOne(u.id)}
                  onCancel={() => cancelOne(u.id)} />
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  ) : null

  /* ═══════════════════════════════════════════════════════════════════
     RENDER
     ═══════════════════════════════════════════════════════════════════ */
  return (
    <>
      <div className="space-y-3">
        {/* Drop zone */}
        <motion.div {...getRootProps()} animate={{ scale: isDragActive ? 1.02 : 1 }}
          className={`upload-area relative overflow-hidden group cursor-pointer ${isDragActive ? 'upload-area-active ring-2 ring-primary' : ''}`}>
          <CardContent className="flex flex-col items-center justify-center py-7 sm:py-9 px-4 text-center">
            <motion.div animate={{ y: isDragActive ? -10 : 0, scale: isDragActive ? 1.15 : 1 }}
              className="mb-3 p-3 rounded-full bg-blue-50 dark:bg-blue-900/20 text-blue-500 dark:text-blue-400">
              <CloudUpload className="w-6 h-6 sm:w-7 sm:h-7" />
            </motion.div>
            <h3 className="font-semibold text-sm text-foreground/80">
              {isDragActive ? 'Drop files here' : 'Upload Any File'}
            </h3>
            <p className="text-[11px] text-muted-foreground mt-1">
              Drag & drop or browse — all types & sizes
            </p>
            <Button onClick={open} variant="outline" size="sm"
              className="mt-4 glass-button hover:bg-primary hover:text-primary-foreground border-primary/20">
              Browse Files
            </Button>
            <input {...getInputProps()} />
          </CardContent>
          {isDragActive && <div className="absolute inset-0 bg-primary/5 pointer-events-none" />}
        </motion.div>

        {/* Desktop panel — in sidebar */}
        <div className="hidden lg:block">{panel}</div>
      </div>

      {/* Mobile floating panel — via portal */}
      <MobileFloat has={has} stats={stats} expanded={mobileExpanded}
        setExpanded={setMobileExpanded} panel={panel} />
    </>
  )
}

/* ═══════════════════════════════════════════════════════════════════════
   PROGRESS BAR — smooth gradient with shimmer for preparing state
   ═════════════════════════════════════════════════════════════════════ */
function ProgressBar({ pct, isPreparing }) {
  return (
    <div className="relative h-2 rounded-full bg-muted/20 overflow-hidden">
      {isPreparing ? (
        <motion.div
          className="absolute inset-y-0 w-2/5 rounded-full"
          style={{ background: 'linear-gradient(90deg, transparent 0%, #3b82f6 30%, #8b5cf6 70%, transparent 100%)' }}
          animate={{ left: ['-40%', '100%'] }}
          transition={{ repeat: Infinity, duration: 1.4, ease: 'easeInOut' }}
        />
      ) : (
        <motion.div
          className="absolute inset-y-0 left-0 rounded-full"
          style={{
            background: pct >= 100
              ? '#22c55e'
              : 'linear-gradient(90deg, #3b82f6, #6366f1, #a855f7)',
          }}
          initial={false}
          animate={{ width: `${Math.max(pct, 1)}%` }}
          transition={{ type: 'tween', duration: 0.3, ease: 'easeOut' }}
        />
      )}
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════════════
   UPLOAD ROW — individual file with live progress
   ═════════════════════════════════════════════════════════════════════ */
function UploadRow({ u, onPause, onResume, onRetry, onCancel }) {
  const s = u.status
  const isPreparing = s === 'preparing'
  const isFinalizing = s === 'finalizing'
  const isUploading = s === 'uploading'
  const isPaused = s === 'paused'
  const isError = s === 'error'
  const isDone = s === 'completed'
  const isQueued = s === 'queued'
  const isLive = isUploading || isPreparing || isFinalizing

  // Status label
  const statusText = isUploading ? `${Math.round(u.progress)}%`
    : isPreparing ? 'Preparing…'
    : isFinalizing ? 'Saving…'
    : isQueued ? 'Queued'
    : isPaused ? 'Paused'
    : isError ? 'Failed'
    : isDone ? 'Done' : ''

  const statusColor = isError ? 'text-red-400'
    : isDone ? 'text-green-400'
    : isPaused ? 'text-yellow-400'
    : isPreparing ? 'text-blue-300'
    : isFinalizing ? 'text-purple-400'
    : isUploading ? 'text-blue-400'
    : 'text-muted-foreground'

  const barColor = isError ? 'bg-red-500' : isDone ? 'bg-green-500'
    : isPaused ? 'bg-yellow-500' : 'bg-blue-500'

  return (
    <div className={`group px-3 py-2 flex items-center gap-2.5
      ${isError ? 'bg-red-500/5' : ''} ${isDone ? 'bg-green-500/5' : ''}`}>

      {/* File type icon */}
      <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 bg-muted/30">
        {isLive ? (
          <Loader2 className={`w-3.5 h-3.5 animate-spin ${isPreparing ? 'text-blue-300' : isFinalizing ? 'text-purple-400' : 'text-blue-500'}`} />
        ) : isQueued ? (
          <Clock className="w-3.5 h-3.5 text-muted-foreground" />
        ) : isError ? (
          <AlertCircle className="w-3.5 h-3.5 text-red-500" />
        ) : isDone ? (
          <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />
        ) : isPaused ? (
          <Pause className="w-3.5 h-3.5 text-yellow-500" />
        ) : (
          <FileTypeIcon type={u.type} className="w-3.5 h-3.5 text-muted-foreground" />
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0 space-y-1">
        {/* File name + status */}
        <div className="flex justify-between items-center">
          <span className="text-[11px] font-medium truncate pr-2 max-w-[60%]">{u.name}</span>
          <span className={`text-[10px] font-bold flex-shrink-0 tabular-nums ${statusColor}`}>
            {statusText}
          </span>
        </div>

        {/* Progress bar */}
        <div className="h-[3px] rounded-full bg-muted/20 overflow-hidden">
          {isPreparing ? (
            <motion.div className="h-full w-1/3 rounded-full bg-blue-400/70"
              animate={{ x: ['-100%', '300%'] }}
              transition={{ repeat: Infinity, duration: 1.2, ease: 'easeInOut' }} />
          ) : isFinalizing ? (
            <motion.div className="h-full w-full rounded-full bg-purple-500"
              animate={{ opacity: [0.4, 1, 0.4] }}
              transition={{ repeat: Infinity, duration: 1 }} />
          ) : (
            <motion.div className={`h-full rounded-full ${barColor}`}
              initial={false}
              animate={{ width: `${u.progress || 0}%` }}
              transition={{ type: 'tween', duration: 0.3, ease: 'easeOut' }} />
          )}
        </div>

        {/* Info line: size, speed, ETA */}
        <div className="flex justify-between items-center">
          <span className="text-[9px] text-muted-foreground truncate">
            {isError ? (u.error || 'Upload failed')
              : isPreparing ? 'Initializing…'
              : isFinalizing ? 'Writing metadata…'
              : isUploading ? `${fmt(u.bytesTransferred)} / ${fmt(u.size)}`
              : fmt(u.size)}
          </span>
          {isUploading && u.speed > 0 && (
            <span className="text-[9px] text-muted-foreground flex-shrink-0 tabular-nums ml-1">
              {fmtSpeed(u.speed)} {u.eta > 0 ? `· ${fmtETA(u.eta)}` : ''}
            </span>
          )}
        </div>
      </div>

      {/* Action buttons — always visible, minimum 28px touch target */}
      <div className="flex items-center flex-shrink-0 -mr-1">
        {isUploading && (
          <button onClick={onPause} className="w-7 h-7 rounded-full flex items-center justify-center text-muted-foreground hover:text-yellow-500 hover:bg-yellow-500/10 active:scale-90 transition-all" title="Pause">
            <Pause className="w-3.5 h-3.5" />
          </button>
        )}
        {isPaused && (
          <button onClick={onResume} className="w-7 h-7 rounded-full flex items-center justify-center text-muted-foreground hover:text-green-500 hover:bg-green-500/10 active:scale-90 transition-all" title="Resume">
            <Play className="w-3.5 h-3.5" />
          </button>
        )}
        {isError && (
          <button onClick={onRetry} className="w-7 h-7 rounded-full flex items-center justify-center text-muted-foreground hover:text-blue-500 hover:bg-blue-500/10 active:scale-90 transition-all" title="Retry">
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        )}
        {!isDone && (
          <button onClick={onCancel} className="w-7 h-7 rounded-full flex items-center justify-center text-muted-foreground hover:text-red-500 hover:bg-red-500/10 active:scale-90 transition-all" title={isLive ? 'Cancel' : 'Remove'}>
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════════════
   MOBILE FLOATING PANEL — portal to body, visible when sidebar hidden
   ═════════════════════════════════════════════════════════════════════ */
function MobileFloat({ has, stats, expanded, setExpanded, panel }) {
  const mounted = useIsClient()
  if (!mounted || !has) return null

  return createPortal(
    <div className="lg:hidden fixed z-50"
      style={{ bottom: 'calc(4.5rem + env(safe-area-inset-bottom))', left: '0.75rem', right: '0.75rem' }}>
      <AnimatePresence mode="wait">
        {expanded ? (
          <motion.div key="expanded"
            initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 30 }}
            className="max-w-md mx-auto">
            <button onClick={() => setExpanded(false)}
              className="ml-auto mb-1 flex items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground px-2 py-1 rounded-full bg-card/90 backdrop-blur border shadow-sm">
              <ChevronDown className="w-3 h-3" /> Minimize
            </button>
            {panel}
          </motion.div>
        ) : (
          <motion.button key="pill"
            initial={{ opacity: 0, scale: 0.85 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.85 }}
            onClick={() => setExpanded(true)}
            className="mx-auto flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-card/95 backdrop-blur border shadow-xl hover:shadow-2xl transition-shadow">
            {stats.pending.length > 0 ? (
              <Loader2 className="w-4 h-4 animate-spin text-blue-500" />
            ) : stats.errors.length > 0 ? (
              <AlertCircle className="w-4 h-4 text-red-500" />
            ) : (
              <CheckCircle2 className="w-4 h-4 text-green-500" />
            )}
            <span className="text-xs font-semibold">
              {stats.pending.length > 0 ? `Uploading ${stats.pct}%` : stats.errors.length > 0 ? 'Failed' : 'Done'}
            </span>
            {stats.pending.length > 0 && (
              <div className="w-20 h-1.5 rounded-full bg-muted/30 overflow-hidden">
                <motion.div className="h-full rounded-full bg-blue-500"
                  initial={false}
                  animate={{ width: `${stats.pct}%` }}
                  transition={{ type: 'tween', duration: 0.3 }} />
              </div>
            )}
            <ChevronUp className="w-3 h-3 text-muted-foreground" />
          </motion.button>
        )}
      </AnimatePresence>
    </div>,
    document.body
  )
}