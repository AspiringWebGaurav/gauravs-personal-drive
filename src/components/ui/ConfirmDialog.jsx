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
  const [isVisible, setIsVisible] = useState(false)

  // Handle smooth entrance animation
  useEffect(() => {
    if (open) {
      setIsVisible(true)
    } else {
      const timer = setTimeout(() => setIsVisible(false), 200)
      return () => clearTimeout(timer)
    }
  }, [open])

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
          // Glass morphism styling
          "glass-card border-destructive/20 max-w-md",
          // Enhanced backdrop blur and transparency
          "backdrop-blur-xl bg-white/10 dark:bg-black/20",
          // Smooth animations
          "data-[state=open]:animate-fade-in",
          "transition-all duration-300 ease-out",
          // Focus styles
          "focus:outline-none focus:ring-2 focus:ring-destructive/20",
          className
        )}
        showCloseButton={false}
        onKeyDown={handleKeyDown}
      >
        <DialogHeader className="text-center sm:text-left">
          {/* Icon with animated entrance */}
          <div className={cn(
            "flex justify-center sm:justify-start mb-4",
            "animate-fade-in delay-100"
          )}>
            <div className="flex items-center justify-center w-12 h-12 rounded-full bg-destructive/10 border border-destructive/20">
              {getIcon()}
            </div>
          </div>

          <DialogTitle className={cn(
            "text-lg font-semibold text-foreground",
            "animate-fade-in delay-150"
          )}>
            {title || getDefaultTitle()}
          </DialogTitle>

          <DialogDescription className={cn(
            "text-sm text-muted-foreground mt-2 leading-relaxed",
            "animate-fade-in delay-200"
          )}>
            {description || getDefaultDescription()}
          </DialogDescription>

          {/* Item name highlight */}
          {itemName && (
            <div className={cn(
              "mt-3 p-2 rounded-lg bg-muted/20 border border-muted/30",
              "text-sm font-medium text-foreground",
              "animate-fade-in delay-250"
            )}>
              {itemName}
            </div>
          )}
        </DialogHeader>

        <DialogFooter className={cn(
          "flex flex-col-reverse sm:flex-row gap-2 mt-6",
          "animate-fade-in delay-300"
        )}>
          <Button
            variant="outline"
            onClick={handleCancel}
            disabled={isLoading}
            className={cn(
              "transition-all duration-200",
              "hover:bg-muted/50 hover:border-muted/60",
              "focus:ring-2 focus:ring-ring focus:ring-offset-2"
            )}
          >
            {cancelText}
          </Button>
          
          <Button
            variant="destructive"
            onClick={handleConfirm}
            disabled={isLoading}
            className={cn(
              "transition-all duration-200",
              "bg-destructive hover:bg-destructive/90",
              "shadow-lg hover:shadow-xl",
              "focus:ring-2 focus:ring-destructive/20 focus:ring-offset-2",
              // Glass effect on destructive button
              "backdrop-blur-sm",
              // Loading state styling
              isLoading && "opacity-80 cursor-not-allowed"
            )}
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