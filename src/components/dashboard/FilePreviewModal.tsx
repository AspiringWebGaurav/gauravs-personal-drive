'use client'

import React, { useCallback, useEffect, useState, useRef, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
    X, Download, Trash2, ExternalLink, FileText, FileIcon, Loader2,
    ChevronLeft, ChevronRight
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useDownload } from '@/hooks/useDownload'
import { ImageViewer } from './ImageViewer'

/* ═══════════════════════════════════════════════════════════════════════
   TYPES
   ═════════════════════════════════════════════════════════════════════ */
interface PreviewFile {
    id: string
    filename: string
    downloadURL: string
    contentType: string
    size?: number
}

interface FilePreviewModalProps {
    isOpen: boolean
    onClose: () => void
    file: PreviewFile | null
    onDelete?: () => void
    /** Pass all files in the current folder to enable prev/next slider */
    allFiles?: PreviewFile[]
    /** Called when user navigates to a different file */
    onNavigate?: (file: PreviewFile) => void
}

/* ═══════════════════════════════════════════════════════════════════════
   HELPERS
   ═════════════════════════════════════════════════════════════════════ */
function getPreviewType(contentType: string | undefined): 'image' | 'pdf' | 'video' | 'audio' | 'text' | 'unsupported' {
    if (!contentType) return 'unsupported'
    if (contentType.startsWith('image/')) return 'image'
    if (contentType === 'application/pdf') return 'pdf'
    if (contentType.startsWith('video/')) return 'video'
    if (contentType.startsWith('audio/')) return 'audio'
    if (
        contentType.startsWith('text/') ||
        contentType.includes('json') ||
        contentType.includes('xml') ||
        contentType.includes('javascript') ||
        contentType.includes('typescript') ||
        contentType.includes('css') ||
        contentType.includes('html') ||
        contentType.includes('markdown')
    ) return 'text'
    return 'unsupported'
}

function formatFileSize(bytes: number): string {
    if (!bytes || bytes === 0) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i]
}

/* ═══════════════════════════════════════════════════════════════════════
   COMPONENT
   ═════════════════════════════════════════════════════════════════════ */
export function FilePreviewModal({ isOpen, onClose, file, onDelete, allFiles, onNavigate }: FilePreviewModalProps) {
    const { downloadFile } = useDownload()
    const [slideDirection, setSlideDirection] = useState(0) // -1 = left, 1 = right
    const touchStartX = useRef(0)
    const touchStartY = useRef(0)

    // ── Navigation helpers ───────────────────────────────────────────────
    const currentIndex = useMemo(() => {
        if (!file || !allFiles?.length) return -1
        return allFiles.findIndex(f => f.id === file.id)
    }, [file, allFiles])

    const hasPrev = currentIndex > 0
    const hasNext = allFiles ? currentIndex < allFiles.length - 1 : false
    const totalCount = allFiles?.length ?? 0

    const goTo = useCallback((direction: -1 | 1) => {
        if (!allFiles) return
        const nextIdx = currentIndex + direction
        if (nextIdx < 0 || nextIdx >= allFiles.length) return
        setSlideDirection(direction)
        const nextFile = allFiles[nextIdx]
        if (onNavigate) {
            onNavigate(nextFile)
        }
    }, [allFiles, currentIndex, onNavigate])

    const goPrev = useCallback(() => goTo(-1), [goTo])
    const goNext = useCallback(() => goTo(1), [goTo])

    // ── Keyboard: ESC, ←, → ─────────────────────────────────────────────
    useEffect(() => {
        if (!isOpen) return
        const handler = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose()
            if (e.key === 'ArrowLeft') { e.preventDefault(); goPrev() }
            if (e.key === 'ArrowRight') { e.preventDefault(); goNext() }
        }
        window.addEventListener('keydown', handler)
        return () => window.removeEventListener('keydown', handler)
    }, [isOpen, onClose, goPrev, goNext])

    // ── Touch swipe for mobile ───────────────────────────────────────────
    const onTouchStart = useCallback((e: React.TouchEvent) => {
        touchStartX.current = e.touches[0].clientX
        touchStartY.current = e.touches[0].clientY
    }, [])

    const onTouchEnd = useCallback((e: React.TouchEvent) => {
        const dx = e.changedTouches[0].clientX - touchStartX.current
        const dy = e.changedTouches[0].clientY - touchStartY.current
        // Only horizontal swipe (not vertical scroll/zoom)
        if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy) * 1.5) {
            if (dx > 0) goPrev()
            else goNext()
        }
    }, [goPrev, goNext])

    if (!file || !isOpen) return null

    const previewType = getPreviewType(file.contentType)

    // ── For images, use ImageViewer with navigation ────────────────────
    if (previewType === 'image') {
        return (
            <ImageViewer
                isOpen={isOpen}
                onClose={onClose}
                file={file}
                onDelete={onDelete}
                hasPrev={hasPrev}
                hasNext={hasNext}
                onPrev={goPrev}
                onNext={goNext}
                currentIndex={currentIndex}
                totalCount={totalCount}
            />
        )
    }

    // ── Other file types: full modal with navigation arrows ────────────
    const handleDownload = (e: React.MouseEvent) => {
        e.stopPropagation()
        if (file.downloadURL) {
            downloadFile(file.downloadURL, {
                filename: file.filename,
                contentType: file.contentType,
            })
        }
    }

    const handleOpenNewTab = (e: React.MouseEvent) => {
        e.stopPropagation()
        if (file.downloadURL) window.open(file.downloadURL, '_blank')
    }

    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 z-50 flex flex-col bg-black/90 backdrop-blur-xl"
                    onClick={onClose}
                    onTouchStart={onTouchStart}
                    onTouchEnd={onTouchEnd}
                >
                    {/* ── Top Bar ─────────────────────────────────────────── */}
                    <motion.div
                        initial={{ y: -20, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        transition={{ delay: 0.1 }}
                        className="flex items-center justify-between px-4 py-3 bg-gradient-to-b from-black/80 to-transparent z-10"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="flex items-center gap-3 min-w-0">
                            <FileText className="h-5 w-5 text-white/60 flex-shrink-0" />
                            <span className="text-white/90 font-medium truncate max-w-[50vw] drop-shadow-md text-sm">
                                {file.filename}
                            </span>
                            {file.size && (
                                <span className="text-white/40 text-xs flex-shrink-0">
                                    {formatFileSize(file.size)}
                                </span>
                            )}
                            {/* File counter */}
                            {totalCount > 1 && (
                                <span className="text-white/30 text-xs flex-shrink-0">
                                    {currentIndex + 1} / {totalCount}
                                </span>
                            )}
                        </div>
                        <div className="flex items-center gap-1">
                            <Button variant="ghost" size="icon"
                                className="text-white/70 hover:text-white hover:bg-white/10 rounded-full h-9 w-9"
                                onClick={handleDownload} title="Download">
                                <Download className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon"
                                className="text-white/70 hover:text-white hover:bg-white/10 rounded-full h-9 w-9"
                                onClick={handleOpenNewTab} title="Open in New Tab">
                                <ExternalLink className="h-4 w-4" />
                            </Button>
                            {onDelete && (
                                <Button variant="ghost" size="icon"
                                    className="text-red-400 hover:text-red-300 hover:bg-red-900/20 rounded-full h-9 w-9"
                                    onClick={(e: React.MouseEvent) => { e.stopPropagation(); onDelete(); onClose() }}
                                    title="Delete">
                                    <Trash2 className="h-4 w-4" />
                                </Button>
                            )}
                            <Button variant="ghost" size="icon"
                                className="text-white/70 hover:text-white hover:bg-white/10 rounded-full h-9 w-9"
                                onClick={(e: React.MouseEvent) => { e.stopPropagation(); onClose() }}
                                title="Close (ESC)">
                                <X className="h-5 w-5" />
                            </Button>
                        </div>
                    </motion.div>

                    {/* ── Prev / Next arrows ──────────────────────────────── */}
                    {hasPrev && (
                        <NavArrow direction="left" onClick={(e) => { e.stopPropagation(); goPrev() }} />
                    )}
                    {hasNext && (
                        <NavArrow direction="right" onClick={(e) => { e.stopPropagation(); goNext() }} />
                    )}

                    {/* ── Preview Content ──────────────────────────────────── */}
                    <AnimatePresence mode="wait" custom={slideDirection}>
                        <motion.div
                            key={file.id}
                            custom={slideDirection}
                            initial={{ opacity: 0, x: slideDirection * 100 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: slideDirection * -100 }}
                            transition={{ type: 'tween', duration: 0.25 }}
                            className="flex-1 flex items-center justify-center p-4 overflow-hidden"
                            onClick={(e) => e.stopPropagation()}
                        >
                            {previewType === 'pdf' && (
                                <iframe
                                    src={`${file.downloadURL}#toolbar=1&navpanes=0`}
                                    className="w-full h-full max-w-5xl rounded-lg border border-white/10 bg-white"
                                    title={file.filename}
                                    allow="fullscreen"
                                />
                            )}

                            {previewType === 'video' && (
                                <video
                                    src={file.downloadURL}
                                    className="max-w-full max-h-full rounded-lg shadow-2xl"
                                    controls autoPlay playsInline controlsList="nodownload"
                                >
                                    Your browser does not support this video.
                                </video>
                            )}

                            {previewType === 'audio' && (
                                <div className="flex flex-col items-center gap-8 p-8">
                                    <div className="w-40 h-40 rounded-full bg-gradient-to-br from-purple-500/30 to-blue-500/30 border border-white/10 flex items-center justify-center animate-pulse">
                                        <FileText className="w-16 h-16 text-white/40" />
                                    </div>
                                    <p className="text-white/80 font-medium text-lg">{file.filename}</p>
                                    <audio src={file.downloadURL} className="w-full max-w-md" controls autoPlay controlsList="nodownload">
                                        Your browser does not support this audio.
                                    </audio>
                                </div>
                            )}

                            {previewType === 'text' && (
                                <iframe
                                    src={file.downloadURL}
                                    className="w-full h-full max-w-4xl rounded-lg border border-white/10 bg-gray-900 text-white font-mono text-sm"
                                    title={file.filename}
                                    sandbox="allow-same-origin"
                                />
                            )}

                            {previewType === 'unsupported' && (
                                <div className="flex flex-col items-center gap-6 p-10 text-center glass-card rounded-2xl max-w-sm">
                                    <div className="w-20 h-20 rounded-full bg-muted/20 flex items-center justify-center">
                                        <FileIcon className="w-10 h-10 text-white/40" />
                                    </div>
                                    <div>
                                        <p className="text-white/90 font-semibold text-lg mb-1">{file.filename}</p>
                                        <p className="text-white/50 text-sm">
                                            {file.contentType || 'Unknown type'} • {file.size ? formatFileSize(file.size) : ''}
                                        </p>
                                    </div>
                                    <p className="text-white/40 text-xs max-w-[250px]">
                                        Preview not available. Download or open in a new tab.
                                    </p>
                                    <div className="flex gap-3">
                                        <Button variant="outline" size="sm" className="border-white/20 text-white hover:bg-white/10" onClick={handleDownload}>
                                            <Download className="h-4 w-4 mr-2" /> Download
                                        </Button>
                                        <Button variant="outline" size="sm" className="border-white/20 text-white hover:bg-white/10" onClick={handleOpenNewTab}>
                                            <ExternalLink className="h-4 w-4 mr-2" /> Open
                                        </Button>
                                    </div>
                                </div>
                            )}
                        </motion.div>
                    </AnimatePresence>
                </motion.div>
            )}
        </AnimatePresence>
    )
}

/* ═══════════════════════════════════════════════════════════════════════
   NAV ARROW — hover-reveal prev/next button
   ═════════════════════════════════════════════════════════════════════ */
function NavArrow({ direction, onClick }: { direction: 'left' | 'right'; onClick: (e: React.MouseEvent) => void }) {
    const isLeft = direction === 'left'
    return (
        <button
            onClick={onClick}
            className={`fixed top-1/2 -translate-y-1/2 z-[60] flex items-center justify-center
        w-10 h-10 sm:w-12 sm:h-12 rounded-full
        bg-black/40 hover:bg-black/70 text-white/70 hover:text-white
        backdrop-blur-sm border border-white/10
        transition-all duration-200 hover:scale-110 active:scale-95
        ${isLeft ? 'left-2 sm:left-4' : 'right-2 sm:right-4'}`}
            title={isLeft ? 'Previous (←)' : 'Next (→)'}
        >
            {isLeft ? <ChevronLeft className="w-5 h-5 sm:w-6 sm:h-6" /> : <ChevronRight className="w-5 h-5 sm:w-6 sm:h-6" />}
        </button>
    )
}
