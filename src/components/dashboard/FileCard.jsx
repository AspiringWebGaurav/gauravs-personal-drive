'use client'

import React, { useState } from 'react'
import { motion } from 'framer-motion'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
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
  Share2,
  Info,
  ExternalLink
} from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { firestoreService } from '@/services/firestoreService'
import { storageService } from '@/services/storageService'
import { usageService } from '@/services/usageService'

import { useNotification } from '@/components/providers/NotificationProvider'
import { MobileActions } from '@/components/mobile/MobileActions'
import { useDownload } from '@/hooks/useDownload'
import { useLongPress } from '@/hooks/useLongPress'
import { ImageViewer } from './ImageViewer'
import { useCallback } from 'react'

/**
 * @typedef {Object} FileData
 * @property {string} id
 * @property {string} filename
 * @property {string} [contentType]
 * @property {number} size
 * @property {string} [downloadURL]
 * @property {any} [createdAt]
 */

/**
 * @param {{ 
 *   file: FileData, 
 *   currentFolder?: any,
 *   isSelected?: boolean,
 *   onSelect?: () => void,
 *   selectionMode?: boolean,
 *   onDeleteSuccess?: () => void
 * }} props
 */
export const FileCard = React.memo(function FileCard({ file, currentFolder }) {
  const [isLoading, setIsLoading] = useState(false)
  const [isImageLoading, setIsImageLoading] = useState(true)
  const [showRenameDialog, setShowRenameDialog] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const { showSuccess, showError } = useNotification()
  const { downloadFile, isDownloading } = useDownload()
  const [projectId, setProjectId] = useState(null) // Mock or usage service driven?

  // Instagram-style Viewer Logic
  const [showViewer, setShowViewer] = useState(false)
  const [isPeek, setIsPeek] = useState(false)

  const openViewer = useCallback((peek = false) => {
    if (file.contentType?.startsWith('image/')) {
      setIsPeek(peek)
      setShowViewer(true)
    }
  }, [file.contentType])

  const closeViewer = useCallback(() => {
    setShowViewer(false)
    setIsPeek(false)
  }, [])

  const longPressProps = useLongPress({
    onLongPress: (e) => {
      // Long press always peeks or selects
      if (!selectionMode) openViewer(true)
    },
    onClick: (e) => {
      // Logic separation: 
      // If Mouse -> Single Click = Select (or nothing if no selection logic), Double Click = Open.
      // If Touch -> Single Tap = Open.

      const isTouch = e.type === 'touchend' || (e.nativeEvent && e.nativeEvent.pointerType === 'touch');

      if (selectionMode) {
        onSelect()
      } else if (isTouch) {
        // Touch: Tap to Open
        if (file.contentType?.startsWith('image/')) {
          openViewer(false)
        } else {
          handlePreview()
        }
      } else {
        // Mouse: Single Click does nothing (waits for Double Click) 
        // OR triggers Selection if we implement click-to-select
        // For now, let's log it
        console.log("Single Click (Mouse) - Waiting for Double Click or Selection", file.filename);
      }
    },
    onFinish: () => {
      if (isPeek) closeViewer()
    },
    ms: 300
  })



  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i]
  }

  const getFileIcon = (contentType) => {
    const className = "w-10 h-10 text-muted-foreground/60 group-hover:text-primary transition-colors"
    if (contentType.startsWith('image/')) return <ImageIcon className={className} />
    if (contentType.startsWith('video/')) return <Video className={className} />
    if (contentType.startsWith('audio/')) return <Music className={className} />
    if (contentType.includes('pdf')) return <FileText className={className} />
    if (contentType.includes('zip') || contentType.includes('rar')) return <Archive className={className} />
    return <FileIcon className={className} />
  }

  const getFilePreview = (file) => {
    if (file.contentType?.startsWith('image/') && file.downloadURL) {
      return (
        <div className="w-full aspect-[4/3] bg-secondary/50 rounded-xl mb-3 overflow-hidden relative group-hover:shadow-inner">
          {/* Shimmer Loader */}
          {/* Skeleton Loader */}
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

  const isDl = isDownloading(file.downloadURL)

  const handleDownload = async () => {
    if (file.downloadURL) {
      await downloadFile(file.downloadURL, {
        filename: file.filename,
        contentType: file.contentType
      })
    }
  }

  const handlePreview = () => {
    if (file.downloadURL) {
      console.log("Opening preview for:", file.filename);
      window.open(file.downloadURL, '_blank');
    } else {
      console.warn("Cannot preview: No download URL for", file.filename);
      showError("Cannot preview: File URL missing");
    }
  }

  // Placeholder props for now - to be passed from parent later
  const isSelected = false
  const onSelect = () => { }
  const selectionMode = false

  const handleRename = () => setShowRenameDialog(true)
  const handleDelete = () => setShowDeleteDialog(true)

  const handleConfirmDelete = async () => {
    setIsLoading(true)

    try {
      // Soft Delete
      await firestoreService.softDeleteFile(file.id)

      // Success: Show toast immediately
      showSuccess(
        'File Trashed',
        `"${file.filename}" moved to recycle bin`
      )

      // Close dialog
      setShowDeleteDialog(false)

      // Trigger UI updates (safe-guarded)
      try {
        window.dispatchEvent(new CustomEvent('quota:update'))
        if (props.onDeleteSuccess) {
          props.onDeleteSuccess();
        }
      } catch (uiError) {
        console.warn("UI refresh failed after delete:", uiError);
      }

    } catch (error) {
      console.error('Error deleting file:', error)
      showError('Failed to delete file.')
    } finally {
      setIsLoading(false)
    }
  }

  // Determine if we should show the selection checkbox
  const showCheckbox = selectionMode || isSelected





  return (
    <>
      <motion.div
        layout
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95 }}
        whileHover={{ y: -4, transition: { duration: 0.2 } }}
        whileTap={{ scale: 0.96 }}
        transition={{ type: 'spring', stiffness: 350, damping: 25 }}
        className={`h-full relative group ${isSelected ? 'ring-2 ring-primary rounded-xl' : ''}`}
        {...longPressProps}
        onDoubleClick={(e) => {
          // Explicit Double Click Handle for Desktop
          console.log("Double Click Detected:", file.filename);
          if (file.contentType?.startsWith('image/')) {
            openViewer(false)
          } else {
            handlePreview()
          }
        }}
        onClick={(e) => {
          // Handle standard click if needed, or rely on longPressProps.onClick?
          // If longPressProps handles onClick, we shouldn't duplicate.
          // But we want to distinguish Mouse vs Touch.
          // longPressProps.onClick is called by our custom hook.
        }}
      >
        <Card className={`group h-full flex flex-col justify-between border-0 bg-white/40 dark:bg-black/20 backdrop-blur-md shadow-sm hover:shadow-xl dark:shadow-black/40 ring-1 ring-black/5 dark:ring-white/10 overflow-hidden cursor-pointer select-none transition-all ${isSelected ? 'bg-primary/10' : ''}`}>
          <div className="flex-1 p-4 pb-2 relative">

            {/* Selection Checkbox (Visible on hover or selected) */}
            <div className={`absolute top-2 right-2 z-10 transition-opacity duration-200 ${showCheckbox ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>
              <div
                className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${isSelected ? 'bg-primary border-primary' : 'bg-white/50 border-gray-400'}`}
                onClick={(e) => {
                  e.stopPropagation()
                  onSelect()
                }}
              >
                {isSelected && <div className="w-2.5 h-2.5 bg-white rounded-full" />}
              </div>
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
                    onClick={(e) => e.stopPropagation()} // Prevent card click
                  >
                    {isLoading || isDl ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <MoreHorizontal className="h-4 w-4" />}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48 glass-card">
                  <DropdownMenuLabel className="text-xs font-normal text-muted-foreground ml-2">File Actions</DropdownMenuLabel>
                  <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handlePreview() }} className="cursor-pointer gap-2">
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

          <ImageViewer
            isOpen={showViewer}
            onClose={closeViewer}
            file={file}
            isPeek={isPeek}
            onDelete={handleDelete}
          />
        </Card>
      </motion.div>
    </>
  )
})