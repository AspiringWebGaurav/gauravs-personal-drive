'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { X, Download, Trash2, FolderInput } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useDownload } from '@/hooks/useDownload'
import { firestoreService } from '@/services/firestoreService'
import { useNotification } from '@/components/providers/NotificationProvider'
import { useState } from 'react'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'

interface ActionDataBarProps {
    selectedCount: number
    onClearSelection: () => void
    selectedItems: any[] // We pass the full objects to handle downloads
    onRefresh: () => void
}

export function ActionDataBar({ selectedCount, onClearSelection, selectedItems, onRefresh }: ActionDataBarProps) {
    const { downloadFile } = useDownload()
    const [showDeleteDialog, setShowDeleteDialog] = useState(false)
    const [isDeleting, setIsDeleting] = useState(false)
    const { showSuccess, showError, showInfo } = useNotification()

    if (selectedCount === 0) return null

    const handleDownloadAll = async () => {
        showInfo(`Starting download for ${selectedCount} files...`)
        let delay = 0
        for (const item of selectedItems) {
            if (item.type === 'file' && item.downloadURL) {
                // Stagger downloads slightly to prevent browser throttling
                setTimeout(() => {
                    downloadFile(item.downloadURL, {
                        filename: item.filename,
                        contentType: item.contentType
                    })
                }, delay)
                delay += 500
            }
        }
    }

    const handleDeleteAll = async () => {
        setIsDeleting(true)
        try {
            let deletedCount = 0
            const promises = selectedItems.map(item => {
                if (item.type === 'folder') {
                    return firestoreService.softDeleteFolder(item.id)
                } else {
                    return firestoreService.softDeleteFile(item.id)
                }
            })

            await Promise.all(promises)

            showSuccess(`Moved ${selectedCount} items to trash`)
            window.dispatchEvent(new CustomEvent('quota:update'))
            onClearSelection()
            onRefresh()
        } catch (error) {
            console.error("Bulk delete failed", error)
            showError("Failed to delete some items")
        } finally {
            setIsDeleting(false)
            setShowDeleteDialog(false)
        }
    }

    return (
        <AnimatePresence>
            <motion.div
                initial={{ y: 100, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: 100, opacity: 0 }}
                className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 w-full max-w-lg px-4"
            >
                <div className="bg-foreground text-background rounded-full shadow-2xl px-6 py-3 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 rounded-full hover:bg-background/20 text-background"
                            onClick={onClearSelection}
                        >
                            <X className="h-4 w-4" />
                        </Button>
                        <span className="font-medium text-sm">
                            {selectedCount} selected
                        </span>
                    </div>

                    <div className="flex items-center gap-1">
                        <Button
                            variant="ghost"
                            size="sm"
                            className="hover:bg-background/20 text-background gap-2"
                            onClick={handleDownloadAll}
                        >
                            <Download className="h-4 w-4" />
                            <span className="hidden sm:inline">Download</span>
                        </Button>

                        {/* Future: Move functionality
                        <Button
                            variant="ghost"
                            size="sm"
                            className="hover:bg-background/20 text-background gap-2"
                        >
                            <FolderInput className="h-4 w-4" />
                            <span className="hidden sm:inline">Move</span>
                        </Button>
                        */}

                        <Button
                            variant="ghost"
                            size="sm"
                            className="hover:bg-background/20 text-red-300 hover:text-red-200 gap-2"
                            onClick={() => setShowDeleteDialog(true)}
                        >
                            <Trash2 className="h-4 w-4" />
                            <span className="hidden sm:inline">Delete</span>
                        </Button>
                    </div>
                </div>

                <ConfirmDialog
                    open={showDeleteDialog}
                    onOpenChange={setShowDeleteDialog}
                    type="deleteFile"
                    title="Delete Selected Items"
                    itemName={`${selectedCount} items`}
                    onConfirm={handleDeleteAll}
                    isLoading={isDeleting}
                    description="Are you sure you want to move these items to the Recycle Bin? This action can be undone from the Recycle Bin."
                    className=""
                />
            </motion.div>
        </AnimatePresence>
    )
}
