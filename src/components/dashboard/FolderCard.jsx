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
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import {
  MoreHorizontal,
  Edit3,
  Trash2,
  Folder,
  FolderOpen,
  Loader2
} from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { doc, deleteDoc, collection, query, where, getDocs } from 'firebase/firestore'
import { firestore } from '@/lib/firebaseClient'
import { toast } from 'sonner'
import { useNotification } from '@/components/providers/NotificationProvider'

export function FolderCard({ folder, onOpen }) {
  const [isHovered, setIsHovered] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [showRenameDialog, setShowRenameDialog] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [deleteDialogType, setDeleteDialogType] = useState('deleteFolder')
  const { showSuccess } = useNotification()

  const handleRename = () => {
    setShowRenameDialog(true)
  }

  const handleDelete = () => {
    setDeleteDialogType('deleteFolder')
    setShowDeleteDialog(true)
  }

  const handleConfirmDelete = async () => {
    setIsLoading(true)

    try {
      // Check if folder has contents
      const filesQuery = query(
        collection(firestore, 'files'),
        where('folderId', '==', folder.id)
      )
      const foldersQuery = query(
        collection(firestore, 'folders'),
        where('parentId', '==', folder.id)
      )

      const [filesSnapshot, foldersSnapshot] = await Promise.all([
        getDocs(filesQuery),
        getDocs(foldersQuery)
      ])

      if (!filesSnapshot.empty || !foldersSnapshot.empty) {
        // Close current dialog and show the "folder contains items" dialog
        setShowDeleteDialog(false)
        setDeleteDialogType('deleteFolderWithContents')
        setIsLoading(false)
        
        // Small delay to allow dialog transition
        setTimeout(() => {
          setShowDeleteDialog(true)
        }, 100)
        return
      }

      // Proceed with deletion if folder is empty
      await performDeleteFolder(filesSnapshot, foldersSnapshot)
    } catch (error) {
      console.error('Error deleting folder:', error)
      toast.error('Failed to delete folder. Please try again.')
      setIsLoading(false)
    }
  }

  const performDeleteFolder = async (filesSnapshot = null, foldersSnapshot = null) => {
    try {
      // Delete all files in the folder if they exist
      if (filesSnapshot && !filesSnapshot.empty) {
        for (const fileDoc of filesSnapshot.docs) {
          await deleteDoc(fileDoc.ref)
        }
      }

      // Delete all subfolders if they exist
      if (foldersSnapshot && !foldersSnapshot.empty) {
        for (const folderDoc of foldersSnapshot.docs) {
          await deleteDoc(folderDoc.ref)
        }
      }

      // Delete the folder itself
      await deleteDoc(doc(firestore, 'folders', folder.id))

      // Close dialog and show success
      setShowDeleteDialog(false)
      toast.success('Folder deleted successfully!')
      showSuccess(
        'Folder Deleted',
        `"${folder.name}" has been deleted successfully`,
        { autoCloseDuration: 2500 }
      )
    } catch (error) {
      console.error('Error deleting folder:', error)
      toast.error('Failed to delete folder. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleConfirmDeleteWithContents = async () => {
    setIsLoading(true)

    try {
      // Re-fetch contents to ensure we have the latest data
      const filesQuery = query(
        collection(firestore, 'files'),
        where('folderId', '==', folder.id)
      )
      const foldersQuery = query(
        collection(firestore, 'folders'),
        where('parentId', '==', folder.id)
      )

      const [filesSnapshot, foldersSnapshot] = await Promise.all([
        getDocs(filesQuery),
        getDocs(foldersQuery)
      ])

      await performDeleteFolder(filesSnapshot, foldersSnapshot)
    } catch (error) {
      console.error('Error deleting folder with contents:', error)
      toast.error('Failed to delete folder. Please try again.')
      setIsLoading(false)
    }
  }

  const handleDoubleClick = () => {
    onOpen(folder)
  }

  const handleTouch = () => {
    // On mobile, single tap to open folder
    if ('ontouchstart' in window) {
      onOpen(folder)
    }
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      onOpen(folder)
    }
  }

  return (
    <Card
      className="file-card group cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all duration-200"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onDoubleClick={handleDoubleClick}
      onTouchEnd={handleTouch}
      onClick={handleTouch}
      onKeyDown={handleKeyDown}
      tabIndex={0}
      role="button"
      aria-label={`Open folder ${folder.name}`}
    >
      <CardContent className="p-4">
        {/* Folder icon */}
        <div className="flex items-center justify-center w-full h-32 bg-muted/20 rounded-lg mb-3">
          <div className="text-blue-500 dark:text-blue-400">
            {isHovered ? (
              <FolderOpen className="w-16 h-16" />
            ) : (
              <Folder className="w-16 h-16" />
            )}
          </div>
        </div>
        
        {/* Folder info */}
        <div className="space-y-2">
          <div className="flex items-start justify-between gap-2">
            <h3 className="font-medium text-sm truncate flex-1" title={folder.name}>
              {folder.name}
            </h3>
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="opacity-0 group-hover:opacity-100 h-8 w-8 p-0 transition-opacity"
                  onClick={(e) => e.stopPropagation()}
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
            <p>Folder</p>
            <p>
              {folder.createdAt && formatDistanceToNow(folder.createdAt.toDate(), { addSuffix: true })}
            </p>
          </div>
        </div>
      </CardContent>
      
      <RenameDialog
        open={showRenameDialog}
        onOpenChange={setShowRenameDialog}
        item={folder}
        type="folder"
        onSuccess={() => {
          // RenameDialog handles its own notifications now
        }}
      />

      <ConfirmDialog
        open={showDeleteDialog}
        onOpenChange={(open) => {
          setShowDeleteDialog(open)
          if (!open) {
            setIsLoading(false)
          }
        }}
        type={deleteDialogType}
        itemName={folder.name}
        onConfirm={deleteDialogType === 'deleteFolderWithContents' ? handleConfirmDeleteWithContents : handleConfirmDelete}
        isLoading={isLoading}
      />
    </Card>
  )
}