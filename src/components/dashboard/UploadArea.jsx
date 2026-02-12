'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import { useDropzone } from 'react-dropzone'
import { useAuth } from '@/components/providers/AuthProvider'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Card, CardContent } from '@/components/ui/card'
import { Upload, X, FileIcon, Loader2, CloudUpload } from 'lucide-react'
import { storageService } from '@/services/storageService'
import { firestoreService } from '@/services/firestoreService'
import { useNotification, useCompletionNotification } from '@/components/providers/NotificationProvider'
import { logger } from '@/lib/logger'
import { motion, AnimatePresence } from 'framer-motion'

export function UploadArea({ currentFolder, onUploadComplete, onRegisterTrigger }) {
  const { user } = useAuth()
  const { showSuccess, showError } = useNotification()
  const { logUploadCompletion } = useCompletionNotification()
  const [uploads, setUploads] = useState([])
  const [isDragActive, setIsDragActive] = useState(false)
  const openRef = useRef(null)
  const isMounted = useRef(true)

  useEffect(() => {
    return () => { isMounted.current = false }
  }, [])

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i]
  }

  const pendingBytes = useRef(0)
  const MAX_CONCURRENT_UPLOADS = 3

  const uploadFile = useCallback((file) => {
    return new Promise((resolve, reject) => {
      logger.upload('Starting upload for file:', {
        name: file.name,
        size: file.size,
        type: file.type,
        lastModified: file.lastModified
      })

      if (!user) {
        logger.error('No user authenticated')
        showError('Please sign in to upload files')
        resolve({ status: 'error' })
        return
      }

      // Optimistic quota update
      pendingBytes.current += file.size

      // Check quota
      const checkQuota = async () => {
        try {
          const quotaResponse = await fetch('/api/quota?realtime=true')
          const quota = await quotaResponse.json()

          // Check if Used + Pending > Limit
          // Note: using pendingBytes.current handles race conditions for multiple starts
          if (quota.usedBytes + pendingBytes.current > quota.limitBytes) {
            showError(`Upload blocked: Storage quota exceeded (${file.name})`)
            pendingBytes.current -= file.size // Revert
            resolve({ status: 'error', reason: 'quota' })
            return false
          }
          return true
        } catch (e) {
          // If check fails, allow upload but warn? Or block? 
          // Safe default: allow, assuming optimistic tracking might be wrong but server will block eventually?
          // For now, allow.
          return true
        }
      }

      checkQuota().then(allowed => {
        if (!allowed) return

        const uploadId = Date.now() + Math.random()
        const fileName = file.name
        const storagePath = `${user.uid}/${uploadId}_${fileName}`

        setUploads(prev => [...prev, {
          id: uploadId,
          name: fileName,
          size: file.size,
          progress: 0,
          status: 'uploading'
        }])

        try {
          const uploadTask = storageService.uploadFileResumable(storagePath, file)

          setUploadTasks(prev => ({ ...prev, [uploadId]: uploadTask }))

          uploadTask.on('state_changed',
            (snapshot) => {
              const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100
              setUploads(prev => prev.map(upload =>
                upload.id === uploadId
                  ? {
                    ...upload,
                    progress: Math.round(progress),
                    status: snapshot.state === 'paused' ? 'paused' : 'uploading'
                  }
                  : upload
              ))
            },
            (error) => {
              console.error('Upload error', error)
              pendingBytes.current -= file.size // Revert on error
              if (!isMounted.current) return
              setUploads(prev => prev.map(upload =>
                upload.id === uploadId
                  ? { ...upload, status: 'error' }
                  : upload
              ))
              showError(`Failed to upload ${fileName}: ${error.code}`)
              setUploadTasks(prev => {
                const newTasks = { ...prev }
                delete newTasks[uploadId]
                return newTasks
              })
              resolve({ status: 'error', error })
            },
            async () => {
              pendingBytes.current -= file.size // Revert upon completion (usage now in DB)
              logUploadCompletion(fileName, false)

              try {
                const downloadURL = await storageService.getDownloadURL(storagePath)

                const metadata = {
                  filename: fileName,
                  size: file.size,
                  contentType: file.type,
                  storagePath: storagePath,
                  downloadURL: downloadURL,
                  folderId: currentFolder?.id || null,
                }

                await firestoreService.createFile(user.uid, metadata)

                if (isMounted.current) {
                  setUploads(prev => prev.map(upload =>
                    upload.id === uploadId
                      ? { ...upload, status: 'completed', progress: 100 }
                      : upload
                  ))
                }

                setTimeout(() => {
                  setUploads(prev => prev.filter(upload => upload.id !== uploadId))
                }, 3000)

                setUploadTasks(prev => {
                  const newTasks = { ...prev }
                  delete newTasks[uploadId]
                  return newTasks
                })

                window.dispatchEvent(new CustomEvent('upload:complete', {
                  detail: { fileName, fileSize: file.size, storagePath }
                }));
                window.dispatchEvent(new CustomEvent('file:operation', {
                  detail: { action: 'upload', fileName, size: file.size }
                }));
                try { localStorage.setItem('quota:update', Date.now().toString()); localStorage.removeItem('quota:update'); } catch (e) { }
                showSuccess(`${fileName} uploaded!`)

                if (onUploadComplete) onUploadComplete()
                resolve({ status: 'success' })
              } catch (error) {
                console.error('Metadata error', error)
                setUploads(prev => prev.map(upload =>
                  upload.id === uploadId
                    ? { ...upload, status: 'error' }
                    : upload
                ))
                showError(`Failed to save ${fileName}`)
                resolve({ status: 'error', error })
              }
            }
          )
        } catch (error) {
          pendingBytes.current -= file.size
          console.error('Upload error', error)
          showError(`Failed to upload ${fileName}`)
          resolve({ status: 'error', error })
        }
      })
    })
  }, [user, currentFolder, onUploadComplete, logUploadCompletion, showError, showSuccess])

  const onDrop = useCallback(async (acceptedFiles, rejectedFiles) => {
    if (rejectedFiles?.length > 0) {
      showError(`${rejectedFiles.length} file(s) rejected (check size/type)`)
    }

    if (acceptedFiles?.length > 0) {
      window.dispatchEvent(new CustomEvent('upload:start', {
        detail: { fileCount: acceptedFiles.length, totalSize: acceptedFiles.reduce((sum, f) => sum + f.size, 0) }
      }));

      if (acceptedFiles.length > 1) {
        showSuccess(`Queuing ${acceptedFiles.length} files for upload...`)
      }

      // Concurrency Queue Logic (Lanes)
      const queue = [...acceptedFiles];

      const processLane = async () => {
        while (queue.length > 0) {
          const file = queue.shift();
          if (file) {
            await uploadFile(file);
          }
        }
      };

      const lanes = [];
      const laneCount = Math.min(MAX_CONCURRENT_UPLOADS, acceptedFiles.length);
      for (let i = 0; i < laneCount; i++) {
        lanes.push(processLane());
      }

      await Promise.all(lanes);
      showSuccess("All uploads processed");
    }
    setIsDragActive(false)
  }, [uploadFile, showError, showSuccess])

  const { getRootProps, getInputProps, open } = useDropzone({
    onDrop,
    onDragEnter: () => setIsDragActive(true),
    onDragLeave: () => setIsDragActive(false),
    onDragOver: (e) => { e.preventDefault(); setIsDragActive(true); },
    noClick: true,
    noKeyboard: true,
    maxSize: 100 * 1024 * 1024,
    multiple: true
  })

  useEffect(() => { openRef.current = open }, [open])

  useEffect(() => {
    if (onRegisterTrigger) {
      onRegisterTrigger(() => {
        if (openRef.current) openRef.current()
      })
    }
  }, [onRegisterTrigger])

  const removeUpload = (uploadId) => {
    setUploads(prev => prev.filter(upload => upload.id !== uploadId))
  }

  return (
    <div className="space-y-4">
      {/* Upload Drop Zone */}
      <motion.div
        {...getRootProps()}
        animate={{
          scale: isDragActive ? 1.02 : 1,
          borderColor: isDragActive ? 'var(--primary)' : 'transparent',
        }}
        className={`
          upload-area relative overflow-hidden group cursor-pointer
          ${isDragActive ? 'upload-area-active' : ''}
          ${uploads.length > 0 ? 'mb-2' : ''}
        `}
      >
        <CardContent className="flex flex-col items-center justify-center py-10 px-6 text-center">
          <motion.div
            animate={{
              y: isDragActive ? -10 : 0,
              scale: isDragActive ? 1.1 : 1
            }}
            className="mb-4 p-4 rounded-full bg-blue-50 dark:bg-blue-900/20 text-blue-500 dark:text-blue-400"
          >
            <CloudUpload className="w-8 h-8" />
          </motion.div>

          <div className="space-y-1 relative z-10">
            <h3 className="font-semibold text-foreground/80">
              {isDragActive ? 'Drop files here' : 'Multi-Format Upload'}
            </h3>
            <p className="text-xs text-muted-foreground max-w-[200px] mx-auto">
              Drag & drop files or click to browse. Max 100MB per file.
            </p>
          </div>

          <Button
            onClick={open}
            variant="outline"
            className="mt-6 glass-button hover:bg-primary hover:text-primary-foreground border-primary/20"
            size="sm"
          >
            Browse Files
          </Button>

          <input {...getInputProps()} />
        </CardContent>

        {/* Particle effects for active drag could go here */}
        {isDragActive && (
          <div className="absolute inset-0 bg-primary/5 pointer-events-none" />
        )}
      </motion.div>

      {/* Upload Progress List */}
      <AnimatePresence>
        {uploads.length > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="space-y-2 overflow-hidden"
          >
            {uploads.map((upload) => (
              <motion.div
                key={upload.id}
                initial={{ x: -20, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                exit={{ x: 20, opacity: 0 }}
                className="glass-card p-3 flex items-center gap-3"
              >
                <div className="flex-shrink-0">
                  {upload.status === 'uploading' ? (
                    <Loader2 className="w-4 h-4 animate-spin text-blue-500" />
                  ) : upload.status === 'error' ? (
                    <X className="w-4 h-4 text-red-500" />
                  ) : (
                    <FileIcon className="w-4 h-4 text-green-500" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between text-xs mb-1.5">
                    <span className="font-medium truncate pr-2">{upload.name}</span>
                    <span className="text-muted-foreground">{upload.progress}%</span>
                  </div>
                  <Progress value={upload.progress} className="h-1" />
                </div>
                <div className="flex items-center gap-1">
                  {upload.status === 'uploading' && (
                    <button
                      onClick={() => uploadTasks[upload.id]?.pause()}
                      className="text-muted-foreground hover:text-foreground p-1"
                      title="Pause"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="6" y="4" width="4" height="16"></rect><rect x="14" y="4" width="4" height="16"></rect></svg>
                    </button>
                  )}
                  {upload.status === 'paused' && (
                    <button
                      onClick={() => uploadTasks[upload.id]?.resume()}
                      className="text-muted-foreground hover:text-foreground p-1"
                      title="Resume"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>
                    </button>
                  )}
                  <button
                    onClick={() => {
                      uploadTasks[upload.id]?.cancel();
                      removeUpload(upload.id);
                    }}
                    className="text-muted-foreground hover:text-red-500 p-1"
                    title="Cancel"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              </motion.div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}