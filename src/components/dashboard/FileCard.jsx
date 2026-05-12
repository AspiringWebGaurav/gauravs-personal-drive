'use client'

import React, { useState, useCallback } from 'react'
import { motion } from 'framer-motion'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import Image from 'next/image'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel
} from '@/components/ui/dropdown-menu'
import { RenameDialog } from './RenameDialog'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import {
  MoreHorizontal,
  Download,
  Edit3,
  Trash2,
  Eye,
  FileText,
  Image as ImageIcon,
  Video,
  Music,
  Archive,
  FileIcon,
  Loader2,
  ExternalLink,
  CheckCircle2
} from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { firestoreService } from '@/services/firestoreService'
import { useNotification } from '@/components/providers/NotificationProvider'
import { MobileActions } from '@/components/mobile/MobileActions'
import { useDownload } from '@/hooks/useDownload'
import { useInteraction } from '@/hooks/useInteraction'

// ── Helpers ──────────────────────────────────────────────────────────
const formatFileSize = (bytes) => {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i]
}

const getFileIcon = (contentType) => {
  const className = "w-10 h-10 text-muted-foreground/60 group-hover:text-primary transition-colors"
  if (contentType?.startsWith('image/')) return <ImageIcon className={className} />
  if (contentType?.startsWith('video/')) return <Video className={className} />
  if (contentType?.startsWith('audio/')) return <Music className={className} />
  if (contentType?.includes('pdf')) return <FileText className={className} />
  if (contentType?.includes('zip') || contentType?.includes('rar')) return <Archive className={className} />
  return <FileIcon className={className} />
}

// ── Component ────────────────────────────────────────────────────────
export const FileCard = React.memo(function FileCard({
  file,
  currentFolder,
  isSelected = false,
  onSelect,
  selectionMode = false,
  onDeleteSuccess,
  onOpenPreview
}) {
  const [isLoading, setIsLoading] = useState(false)
  const [isImageLoading, setIsImageLoading] = useState(true)
  const [showRenameDialog, setShowRenameDialog] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const { showSuccess, showError } = useNotification()
  const { downloadFile, isDownloading } = useDownload()

  const isDl = isDownloading(file.downloadURL)

  // ── Preview ────────────────────────────────────────────────────────
  const openPreview = useCallback(() => {
    if (onOpenPreview) {
      onOpenPreview(file)
    }
  }, [file, onOpenPreview])

  // ── Actions ────────────────────────────────────────────────────────
  const handleDownload = async () => {
    if (file.downloadURL) {
      await downloadFile(file.downloadURL, {
        filename: file.filename,
        contentType: file.contentType
      })
    }
  }

  const handleRename = () => setShowRenameDialog(true)
  const handleDelete = () => setShowDeleteDialog(true)

  const handleConfirmDelete = async () => {
    setIsLoading(true)
    try {
      await firestoreService.softDeleteFile(file.id)
      showSuccess('File Trashed', `"${file.filename}" moved to recycle bin`)
      setShowDeleteDialog(false)
      try {
        window.dispatchEvent(new CustomEvent('quota:update'))
        if (onDeleteSuccess) onDeleteSuccess()
      } catch (uiError) {
        console.warn("UI refresh failed after delete:", uiError)
      }
    } catch (error) {
      console.error('Error deleting file:', error)
      showError('Failed to delete file.')
    } finally {
      setIsLoading(false)
    }
  }

  // ── Interactions ───────────────────────────────────────────────────
  const { handlers } = useInteraction({
    onOpen: openPreview,
    onSelect: (e) => {
      if (e?.defaultPrevented) return
      if (onSelect) onSelect(e)
    },
    selectionMode
  })

  const handleCheckboxClick = useCallback((e) => {
    e.stopPropagation()
    e.preventDefault()
    if (onSelect) onSelect(e)
  }, [onSelect])

  // Whether to show checkbox — show on hover or when selected or in selection mode
  const showCheckbox = selectionMode || isSelected

  // ── File preview thumbnail ─────────────────────────────────────────
  const getFilePreview = (file) => {
    if (file.contentType?.startsWith('image/') && file.downloadURL) {
      return (
        <div className="w-full aspect-[4/3] bg-secondary/50 rounded-xl mb-3 overflow-hidden relative group-hover:shadow-inner">
          {isImageLoading && (
            <div className="absolute inset-0 z-20 flex items-center justify-center bg-secondary/20 rounded-xl backdrop-blur-[2px]">
              <Loader2 className="w-8 h-8 animate-spin text-primary/60" />
            </div>
          )}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: isImageLoading ? 0 : 1 }}
            transition={{ duration: 0.5 }}
            whileHover={{ scale: 1.1, transition: { duration: 0.4 } }}
            className="w-full h-full relative z-10"
          >
            <Image
              src={file.downloadURL}
              alt={file.filename}
              fill
              className="object-cover"
              sizes="(max-width: 768px) 50vw, (max-width: 1200px) 33vw, 20vw"
              loading="lazy"
              onLoad={() => setIsImageLoading(false)}
            />
          </motion.div>
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors duration-300 pointer-events-none" />
        </div>
      )
    }

    return (
      <div className="flex items-center justify-center w-full aspect-[4/3] bg-muted/20 rounded-xl mb-3 group-hover:bg-primary/5 transition-colors duration-300">
        <motion.div
          whileHover={{ scale: 1.1, rotate: [0, -5, 5, 0] }}
          transition={{ duration: 0.3 }}
        >
          {getFileIcon(file.contentType || '')}
        </motion.div>
      </div>
    )
  }

  return (
    <>
      <motion.div
        layout
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95 }}
        whileHover={{ y: -4, transition: { duration: 0.2 } }}
        whileTap={{ scale: 0.97 }}
        transition={{ type: 'spring', stiffness: 350, damping: 25 }}
        className={`h-full relative group ${isSelected ? 'ring-2 ring-primary rounded-xl' : ''}`}
        {...handlers}
      >
        <Card className={`group h-full flex flex-col justify-between border-0 bg-white/40 dark:bg-black/20 backdrop-blur-md shadow-sm hover:shadow-xl dark:shadow-black/40 ring-1 ring-black/5 dark:ring-white/10 overflow-hidden cursor-pointer select-none transition-all ${isSelected ? 'bg-primary/10 dark:bg-primary/15' : ''}`}>
          <div className="flex-1 p-4 pb-2 relative">

            {/* Selection Checkbox — visible on hover, selected, or selection mode */}
            <div className={`absolute top-1 left-1 z-20 transition-all duration-200 ${showCheckbox ? 'opacity-100 scale-100' : 'opacity-0 scale-75 group-hover:opacity-100 group-hover:scale-100 md:opacity-0 md:group-hover:opacity-100'}`}>
              <button
                className={`w-8 h-8 min-w-[44px] min-h-[44px] flex items-center justify-center rounded-full border-2 transition-all duration-150
                  ${isSelected
                    ? 'bg-primary border-primary shadow-lg shadow-primary/30'
                    : 'bg-white/80 dark:bg-black/50 border-gray-400 dark:border-gray-500 hover:border-primary'
                  }`}
                onClick={handleCheckboxClick}
                aria-label={isSelected ? 'Deselect' : 'Select'}
              >
                {isSelected && <CheckCircle2 className="w-5 h-5 text-white" />}
              </button>
            </div>

            {getFilePreview(file)}
            <div className="space-y-1">
              <div className="flex items-start justify-between gap-2">
                <h3 className="font-semibold text-sm truncate flex-1 leading-snug text-foreground/90" title={file.filename}>
                  {file.filename}
                </h3>
              </div>
              <div className="text-xs text-muted-foreground flex items-center justify-between">
                <span>{formatFileSize(file.size)}</span>
                <span className="opacity-60 text-[10px]">
                  {file.createdAt && formatDistanceToNow(file.createdAt.toDate(), { addSuffix: true })}
                </span>
              </div>
            </div>
          </div>

          <div className="p-2 pt-0 flex justify-end">
            <div className="md:block hidden">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity focus:opacity-100 data-[state=open]:opacity-100 text-muted-foreground"
                    disabled={isLoading}
                    onClick={(e) => e.stopPropagation()}
                  >
                    {isLoading || isDl ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <MoreHorizontal className="h-4 w-4" />}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48 glass-card">
                  <DropdownMenuLabel className="text-xs font-normal text-muted-foreground ml-2">File Actions</DropdownMenuLabel>
                  <DropdownMenuItem onClick={(e) => { e.stopPropagation(); openPreview() }} className="cursor-pointer gap-2">
                    <Eye className="h-4 w-4" /> Preview
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={(e) => { e.stopPropagation(); window.open(file.downloadURL, '_blank') }} className="cursor-pointer gap-2">
                    <ExternalLink className="h-4 w-4" /> Open in New Tab
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleDownload() }} className="cursor-pointer gap-2">
                    {isDl ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />} Download
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleRename() }} className="cursor-pointer gap-2">
                    <Edit3 className="h-4 w-4" /> Rename
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={(e) => { e.stopPropagation(); handleDelete() }}
                    className="cursor-pointer text-red-600 dark:text-red-400 gap-2 focus:bg-red-50 dark:focus:bg-red-950/20"
                    disabled={isLoading}
                  >
                    <Trash2 className="h-4 w-4" /> Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            <div className="md:hidden block">
              <MobileActions
                file={file}
                onDelete={() => setShowDeleteDialog(true)}
                onRename={() => setShowRenameDialog(true)}
              >
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-muted-foreground"
                  disabled={isLoading}
                  onClick={(e) => e.stopPropagation()}
                >
                  {isLoading || isDl ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <MoreHorizontal className="h-4 w-4" />}
                </Button>
              </MobileActions>
            </div>
          </div>

          <RenameDialog
            open={showRenameDialog}
            onOpenChange={setShowRenameDialog}
            item={file}
            type="file"
            onSuccess={() => { }}
          />

          <ConfirmDialog
            open={showDeleteDialog}
            onOpenChange={setShowDeleteDialog}
            type="deleteFile"
            itemName={file.filename}
            onConfirm={handleConfirmDelete}
            isLoading={isLoading}
          />
        </Card>
      </motion.div>
    </>
  )
})