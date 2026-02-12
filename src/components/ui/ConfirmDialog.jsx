'use client'

import { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { AlertTriangle, Trash2, FolderX, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

export function ConfirmDialog({
  open,
  onOpenChange,
  type = 'delete',
  title,
  description,
  itemName,
  onConfirm,
  confirmText = 'Delete',
  cancelText = 'Cancel',
  isLoading = false,
  className,
  ...props
}) {


  const getIcon = () => {
    switch (type) {
      case 'deleteFile':
        return <Trash2 className="h-6 w-6 text-destructive" />
      case 'deleteFolder':
      case 'deleteFolderWithContents':
        return <FolderX className="h-6 w-6 text-destructive" />
      default:
        return <AlertTriangle className="h-6 w-6 text-destructive" />
    }
  }

  const getDefaultTitle = () => {
    switch (type) {
      case 'deleteFile':
        return 'Delete File'
      case 'deleteFolder':
        return 'Delete Folder'
      case 'deleteFolderWithContents':
        return 'Delete Folder and Contents'
      default:
        return 'Confirm Action'
    }
  }

  const getDefaultDescription = () => {
    switch (type) {
      case 'deleteFile':
        return `Are you sure you want to delete "${itemName}"? This action cannot be undone.`
      case 'deleteFolder':
        return `Are you sure you want to delete "${itemName}"? This will also delete all files and subfolders inside it. This action cannot be undone.`
      case 'deleteFolderWithContents':
        return `This folder contains files or other folders. Are you sure you want to delete everything? This action cannot be undone.`
      default:
        return description
    }
  }

  const handleConfirm = async () => {
    if (onConfirm && !isLoading) {
      await onConfirm()
    }
  }

  const handleCancel = () => {
    if (!isLoading) {
      onOpenChange(false)
    }
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !isLoading) {
      e.preventDefault()
      handleConfirm()
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange} {...props}>
      <DialogContent
        className={cn(
          // Clean, solid, elevated look
          "bg-background border shadow-2xl max-w-md z-[60]",
          // Smooth animations
          "data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95",
          "data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95",
          // Focus styles
          "focus:outline-none",
          className
        )}
        showCloseButton={false}
        onKeyDown={handleKeyDown}
      >
        <DialogHeader className="text-center sm:text-left">
          <div className="flex justify-center sm:justify-start mb-4">
            <div className="flex items-center justify-center w-12 h-12 rounded-full bg-red-100 dark:bg-red-900/30 text-red-600 border border-red-200 dark:border-red-900/50">
              {getIcon()}
            </div>
          </div>

          <DialogTitle className="text-lg font-semibold text-foreground">
            {title || getDefaultTitle()}
          </DialogTitle>

          <DialogDescription className="text-sm text-muted-foreground mt-2 leading-relaxed">
            {description || getDefaultDescription()}
          </DialogDescription>

          {/* Item name highlight */}
          {itemName && (
            <div className="mt-3 p-2.5 rounded-md bg-muted/50 border border-border text-sm font-medium text-foreground text-center sm:text-left break-all">
              {itemName}
            </div>
          )}
        </DialogHeader>

        <DialogFooter className="flex flex-col-reverse sm:flex-row gap-2 mt-6">
          <Button
            variant="outline"
            onClick={handleCancel}
            disabled={isLoading}
            className="w-full sm:w-auto mt-2 sm:mt-0"
          >
            {cancelText}
          </Button>

          <Button
            variant="destructive"
            onClick={handleConfirm}
            disabled={isLoading}
            className="w-full sm:w-auto bg-red-600 hover:bg-red-700 shadow-sm"
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Deleting...
              </>
            ) : (
              <>
                <Trash2 className="mr-2 h-4 w-4" />
                {confirmText}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}