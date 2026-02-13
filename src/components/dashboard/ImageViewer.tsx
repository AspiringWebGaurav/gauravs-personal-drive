'use client'

import React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Download, Trash2, ExternalLink, Loader2, ChevronLeft, ChevronRight } from 'lucide-react'
import Image from 'next/image'
import { Button } from '@/components/ui/button'
import { useDownload } from '@/hooks/useDownload'

interface ImageViewerProps {
    isOpen: boolean
    onClose: () => void
    file: {
        id?: string
        filename: string
        downloadURL: string
        contentType: string
    } | null
    isPeek?: boolean
    onDelete?: () => void
    /** Navigation props — passed from FilePreviewModal */
    hasPrev?: boolean
    hasNext?: boolean
    onPrev?: () => void
    onNext?: () => void
    currentIndex?: number
    totalCount?: number
}

export function ImageViewer({
    isOpen, onClose, file, isPeek = false, onDelete,
    hasPrev, hasNext, onPrev, onNext, currentIndex, totalCount
}: ImageViewerProps) {
    const { downloadFile } = useDownload()

    const [scale, setScale] = React.useState(1)
    const [isLoading, setIsLoading] = React.useState(true)
    const lastTap = React.useRef(0)
    const touchStartX = React.useRef(0)
    const touchStartY = React.useRef(0)

    // Reset scale & loading when file changes
    React.useEffect(() => {
        setScale(1)
        setIsLoading(true)
    }, [file?.downloadURL])

    // Keyboard: ESC, ←, →
    React.useEffect(() => {
        if (!isOpen) return
        const handler = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose()
            if (e.key === 'ArrowLeft' && onPrev) { e.preventDefault(); onPrev() }
            if (e.key === 'ArrowRight' && onNext) { e.preventDefault(); onNext() }
        }
        window.addEventListener('keydown', handler)
        return () => window.removeEventListener('keydown', handler)
    }, [isOpen, onClose, onPrev, onNext])

    if (!file || !isOpen) return null

    const handleDownload = (e: React.MouseEvent) => {
        e.stopPropagation()
        if (file.downloadURL) {
            downloadFile(file.downloadURL, {
                filename: file.filename,
                contentType: file.contentType
            })
        }
    }

    const handleDoubleTap = (e: React.MouseEvent | React.TouchEvent) => {
        e.stopPropagation()
        const now = Date.now()
        if (now - lastTap.current < 300) {
            setScale(prev => prev === 1 ? 2.5 : 1)
        }
        lastTap.current = now
    }

    // Swipe left/right to navigate (only when not zoomed)
    const handleTouchStart = (e: React.TouchEvent) => {
        touchStartX.current = e.touches[0].clientX
        touchStartY.current = e.touches[0].clientY
    }

    const handleTouchEnd = (e: React.TouchEvent) => {
        if (scale !== 1) return // don't navigate when zoomed
        const dx = e.changedTouches[0].clientX - touchStartX.current
        const dy = e.changedTouches[0].clientY - touchStartY.current
        if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy) * 1.5) {
            if (dx > 0 && onPrev) onPrev()
            else if (dx < 0 && onNext) onNext()
        }
    }

    const showNav = totalCount !== undefined && totalCount > 1 && scale === 1

    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    initial={{ opacity: 0, backdropFilter: 'blur(0px)' }}
                    animate={{ opacity: 1, backdropFilter: 'blur(20px)' }}
                    exit={{ opacity: 0, backdropFilter: 'blur(0px)' }}
                    className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 touch-none"
                    onClick={onClose}
                    onTouchStart={handleTouchStart}
                    onTouchEnd={handleTouchEnd}
                >
                    {/* Top Bar */}
                    {!isPeek && scale === 1 && (
                        <div className="absolute top-0 left-0 right-0 p-4 pt-safe flex justify-between items-center z-50 bg-gradient-to-b from-black/80 to-transparent">
                            <div className="flex items-center gap-3 min-w-0">
                                <span className="text-white/90 font-medium truncate px-2 max-w-[60vw] drop-shadow-md text-sm">
                                    {file.filename}
                                </span>
                                {/* File counter */}
                                {showNav && currentIndex !== undefined && (
                                    <span className="text-white/40 text-xs flex-shrink-0 tabular-nums">
                                        {currentIndex + 1} / {totalCount}
                                    </span>
                                )}
                            </div>
                            <div className="flex items-center gap-1">
                                <Button variant="ghost" size="icon"
                                    className="text-white/70 hover:text-white hover:bg-white/10 rounded-full"
                                    onClick={handleDownload} title="Download">
                                    <Download className="h-5 w-5" />
                                </Button>
                                <Button variant="ghost" size="icon"
                                    className="text-white/70 hover:text-white hover:bg-white/10 rounded-full"
                                    onClick={(e: React.MouseEvent) => { e.stopPropagation(); window.open(file.downloadURL, '_blank') }}
                                    title="Open in New Tab">
                                    <ExternalLink className="h-5 w-5" />
                                </Button>
                                {onDelete && (
                                    <Button variant="ghost" size="icon"
                                        className="text-red-400 hover:text-red-300 hover:bg-red-900/20 rounded-full"
                                        onClick={(e: React.MouseEvent) => { e.stopPropagation(); onDelete(); onClose() }}
                                        title="Delete">
                                        <Trash2 className="h-5 w-5" />
                                    </Button>
                                )}
                                <Button variant="ghost" size="icon"
                                    className="text-white/70 hover:text-white hover:bg-white/10 rounded-full"
                                    onClick={(e: React.MouseEvent) => { e.stopPropagation(); onClose() }}
                                    title="Close (ESC)">
                                    <X className="h-6 w-6" />
                                </Button>
                            </div>
                        </div>
                    )}

                    {/* ── Prev / Next arrows ──────────────────────────── */}
                    {showNav && hasPrev && (
                        <button
                            onClick={(e) => { e.stopPropagation(); onPrev?.() }}
                            className="fixed left-2 sm:left-4 top-1/2 -translate-y-1/2 z-[60]
                                flex items-center justify-center w-10 h-10 sm:w-12 sm:h-12 rounded-full
                                bg-black/40 hover:bg-black/70 text-white/70 hover:text-white
                                backdrop-blur-sm border border-white/10
                                transition-all duration-200 hover:scale-110 active:scale-95"
                            title="Previous (←)"
                        >
                            <ChevronLeft className="w-5 h-5 sm:w-6 sm:h-6" />
                        </button>
                    )}
                    {showNav && hasNext && (
                        <button
                            onClick={(e) => { e.stopPropagation(); onNext?.() }}
                            className="fixed right-2 sm:right-4 top-1/2 -translate-y-1/2 z-[60]
                                flex items-center justify-center w-10 h-10 sm:w-12 sm:h-12 rounded-full
                                bg-black/40 hover:bg-black/70 text-white/70 hover:text-white
                                backdrop-blur-sm border border-white/10
                                transition-all duration-200 hover:scale-110 active:scale-95"
                            title="Next (→)"
                        >
                            <ChevronRight className="w-5 h-5 sm:w-6 sm:h-6" />
                        </button>
                    )}

                    {/* Image Container — with slide animation */}
                    <AnimatePresence mode="wait">
                        <motion.div
                            key={file.downloadURL}
                            className="relative w-full h-full flex items-center justify-center"
                            initial={{ opacity: 0, x: 0 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0 }}
                            transition={{ type: "tween", duration: 0.2 }}
                            onClick={(e: React.MouseEvent) => {
                                e.stopPropagation();
                                handleDoubleTap(e);
                            }}

                            // Drag to dismiss (only when not zoomed)
                            drag={scale === 1 ? "y" : false}
                            dragConstraints={{ top: 0, bottom: 0 }}
                            dragElastic={0.7}
                            onDragEnd={(_e, { offset, velocity }) => {
                                if (scale === 1) {
                                    if (offset.y > 100 || velocity.y > 500) {
                                        onClose();
                                    }
                                }
                            }}
                        >
                            {file.downloadURL && (
                                <motion.div
                                    animate={{ scale: scale }}
                                    transition={{ type: "spring", stiffness: 200, damping: 20 }}
                                    className="relative w-full h-full max-w-7xl max-h-[90vh] mx-4"
                                >
                                    <div className="relative w-full h-full">
                                        {isLoading && (
                                            <div className="absolute inset-0 flex items-center justify-center z-10">
                                                <div className="p-3 bg-black/50 backdrop-blur-sm rounded-full">
                                                    <Loader2 className="w-8 h-8 animate-spin text-white/80" />
                                                </div>
                                            </div>
                                        )}
                                        <Image
                                            src={file.downloadURL}
                                            alt={file.filename}
                                            fill
                                            className={`object-contain transition-opacity duration-300 ${isLoading ? 'opacity-0' : 'opacity-100'}`}
                                            sizes="100vw"
                                            priority
                                            onLoad={() => setIsLoading(false)}
                                        />
                                    </div>
                                </motion.div>
                            )}
                        </motion.div>
                    </AnimatePresence>

                    {/* Bottom dots indicator for mobile (when multiple files) */}
                    {showNav && currentIndex !== undefined && totalCount !== undefined && totalCount <= 20 && (
                        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-[60] flex items-center gap-1.5 px-3 py-2 rounded-full bg-black/50 backdrop-blur-sm">
                            {Array.from({ length: totalCount }, (_, i) => (
                                <div key={i}
                                    className={`rounded-full transition-all duration-200 ${i === currentIndex
                                            ? 'w-2 h-2 bg-white'
                                            : 'w-1.5 h-1.5 bg-white/30'
                                        }`}
                                />
                            ))}
                        </div>
                    )}
                </motion.div>
            )}
        </AnimatePresence>
    )
}
