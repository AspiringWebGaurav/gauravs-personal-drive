'use client'

import { useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { RenameDialog } from './RenameDialog'
import {
  MoreHorizontal,
  Download,
  Edit3,
  Trash2,
  Eye,
  FileText,
  Image,
  Video,
  Music,
  Archive,
  FileIcon,
  Loader2
} from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { doc, deleteDoc } from 'firebase/firestore'
import { ref, deleteObject } from 'firebase/storage'
import { firestore, storage } from '@/lib/firebaseClient'
import { toast } from 'sonner'

export function FileCard({ file, currentFolder }) {
  const [isLoading, setIsLoading] = useState(false)
  const [showRenameDialog, setShowRenameDialog] = useState(false)

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  const getFileIcon = (contentType) => {
    if (contentType.startsWith('image/')) return <Image className="w-8 h-8" />
    if (contentType.startsWith('video/')) return <Video className="w-8 h-8" />
    if (contentType.startsWith('audio/')) return <Music className="w-8 h-8" />
    if (contentType.includes('pdf')) return <FileText className="w-8 h-8" />
    if (contentType.includes('zip') || contentType.includes('rar')) return <Archive className="w-8 h-8" />
    return <FileIcon className="w-8 h-8" />
  }

  const getFilePreview = (file) => {
    if (file.contentType?.startsWith('image/')) {
      return (
        <div className="w-full h-32 bg-muted/20 rounded-lg mb-3 overflow-hidden">
          <img 
            src={file.downloadURL} 
            alt={file.filename}
            className="w-full h-full object-cover"
            loading="lazy"
          />
        </div>
      )
    }
    
    return (
      <div className="flex items-center justify-center w-full h-32 bg-muted/20 rounded-lg mb-3">
        <div className="text-muted-foreground">
          {getFileIcon(file.contentType || '')}
        </div>
      </div>
    )
  }

  const handleDownload = async () => {
    if (file.downloadURL) {
      window.open(file.downloadURL, '_blank')
    }
  }

  const handlePreview = () => {
    if (file.downloadURL) {
      window.open(file.downloadURL, '_blank')
    }
  }

  const handleRename = () => {
    setShowRenameDialog(true)
  }

  const handleDelete = async () => {
    if (!confirm(`Are you sure you want to delete "${file.filename}"? This action cannot be undone.`)) {
      return
    }

    setIsLoading(true)

    try {
      // Delete from Firestore
      await deleteDoc(doc(firestore, 'files', file.id))

      // Delete from Storage
      if (file.storagePath) {
        try {
          const storageRef = ref(storage, file.storagePath)
          await deleteObject(storageRef)
        } catch (storageError) {
          console.warn('File may not exist in storage:', storageError)
        }
      }

      toast.success('File deleted successfully!')
    } catch (error) {
      console.error('Error deleting file:', error)
      toast.error('Failed to delete file. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Card className="file-card group">
      <CardContent className="p-4">
        {/* File preview */}
        {getFilePreview(file)}
        
        {/* File info */}
        <div className="space-y-2">
          <div className="flex items-start justify-between gap-2">
            <h3 className="font-medium text-sm truncate flex-1" title={file.filename}>
              {file.filename}
            </h3>
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="opacity-0 group-hover:opacity-100 h-8 w-8 p-0 transition-opacity"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <MoreHorizontal className="h-4 w-4" />
                  )}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="glass-card">
                <DropdownMenuItem onClick={handlePreview} className="cursor-pointer">
                  <Eye className="mr-2 h-4 w-4" />
                  Preview
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleDownload} className="cursor-pointer">
                  <Download className="mr-2 h-4 w-4" />
                  Download
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleRename} className="cursor-pointer">
                  <Edit3 className="mr-2 h-4 w-4" />
                  Rename
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={handleDelete}
                  className="cursor-pointer text-red-600 dark:text-red-400"
                  disabled={isLoading}
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
          
          <div className="text-xs text-muted-foreground space-y-1">
            <p>{formatFileSize(file.size)}</p>
            <p>
              {file.createdAt && formatDistanceToNow(file.createdAt.toDate(), { addSuffix: true })}
            </p>
          </div>
        </div>
      </CardContent>
      
      <RenameDialog
        open={showRenameDialog}
        onOpenChange={setShowRenameDialog}
        item={file}
        type="file"
        onSuccess={() => {
          toast.success('File renamed successfully!')
        }}
      />
    </Card>
  )
}