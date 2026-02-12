'use client'

import React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Download, Share2, Trash2, ExternalLink, Loader2 } from 'lucide-react'
import Image from 'next/image'
import { Button } from '@/components/ui/button'
import { useDownload } from '@/hooks/useDownload'

interface ImageViewerProps {
    isOpen: boolean
    onClose: () => void
    file: {
        filename: string
        downloadURL: string
        contentType: string
    } | null
    isPeek?: boolean
    onDelete?: () => void
}

export function ImageViewer({ isOpen, onClose, file, isPeek = false, onDelete }: ImageViewerProps) {
    const { downloadFile } = useDownload()

    const [scale, setScale] = React.useState(1)
    const [isLoading, setIsLoading] = React.useState(true)
    const lastTap = React.useRef(0)

    // Reset scale when file changes
    React.useEffect(() => {
        setScale(1)
        setIsLoading(true)
    }, [file])

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
        const DOUBLE_TAP_DELAY = 300

        if (now - lastTap.current < DOUBLE_TAP_DELAY) {
            // Double tap detected
            setScale(prev => prev === 1 ? 2.5 : 1)
        }

        lastTap.current = now
    }

    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    initial={{ opacity: 0, backdropFilter: 'blur(0px)' }}
                    animate={{ opacity: 1, backdropFilter: 'blur(20px)' }}
                    exit={{ opacity: 0, backdropFilter: 'blur(0px)' }}
                    className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 touch-none"
                    onClick={onClose}
                >
                    {/* Top Bar - Hidden in peek mode or when zoomed */}
                    {!isPeek && scale === 1 && (
                        <div className="absolute top-0 left-0 right-0 p-4 pt-safe flex justify-between items-center z-50 bg-gradient-to-b from-black/80 to-transparent transition-opacity duration-200">
                            <span className="text-white/90 font-medium truncate px-4 max-w-[70%] drop-shadow-md">
                                {file.filename}
                            </span>
                            <div className="flex items-center gap-2">
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="text-white/70 hover:text-white hover:bg-white/10 rounded-full"
                                    onClick={handleDownload}
                                    title="Download"
                                >
                                    <Download className="h-5 w-5" />
                                </Button>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="text-white/70 hover:text-white hover:bg-white/10 rounded-full"
                                    onClick={(e: React.MouseEvent) => {
                                        e.stopPropagation()
                                        window.open(file.downloadURL, '_blank')
                                    }}
                                    title="Open in New Tab"
                                >
                                    <ExternalLink className="h-5 w-5" />
                                </Button>
                                {onDelete && (
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="text-red-400 hover:text-red-300 hover:bg-red-900/20 rounded-full"
                                        onClick={(e: React.MouseEvent) => {
                                            e.stopPropagation()
                                            onDelete()
                                            onClose()
                                        }}
                                        title="Delete"
                                    >
                                        <Trash2 className="h-5 w-5" />
                                    </Button>
                                )}
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="text-white/70 hover:text-white hover:bg-white/10 rounded-full"
                                    onClick={(e: React.MouseEvent) => {
                                        e.stopPropagation()
                                        onClose()
                                    }}
                                    title="Close"
                                >
                                    <X className="h-6 w-6" />
                                </Button>
                            </div>
                        </div>
                    )}

                    {/* Image Container */}
                    <motion.div
                        className="relative w-full h-full flex items-center justify-center"
                        initial={{ scale: 0.9, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0.9, opacity: 0 }}
                        transition={{ type: "spring", stiffness: 300, damping: 30 }}
                        onClick={(e: React.MouseEvent) => {
                            e.stopPropagation();
                            handleDoubleTap(e);
                        }}

                        // Drag to dismiss logic (only when not zoomed)
                        drag={scale === 1 ? "y" : false}
                        dragConstraints={{ top: 0, bottom: 0 }}
                        dragElastic={0.7}
                        onDragEnd={(e, { offset, velocity }) => {
                            if (scale === 1) {
                                const swipeThreshold = 100;
                                const velocityThreshold = 500;
                                if (offset.y > swipeThreshold || velocity.y > velocityThreshold) {
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
                </motion.div>
            )}
        </AnimatePresence>
    )
}
