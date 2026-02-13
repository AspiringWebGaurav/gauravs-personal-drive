'use client'

import React, { useState } from 'react'
import { motion } from 'framer-motion'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
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
import { useInteraction } from '@/hooks/useInteraction'
import {
  MoreHorizontal,
  Edit3,
  Trash2,
  Folder,
  FolderOpen,
  Loader2,
  Share2,
  Info
} from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { firestoreService } from '@/services/firestoreService'
import { storageService } from '@/services/storageService'
import { useNotification } from '@/components/providers/NotificationProvider'
import { MobileActions } from '@/components/mobile/MobileActions'

/**
 * @typedef {Object} FolderData
 * @property {string} id
 * @property {string} name
 * @property {any} [createdAt]
 */

/**
 * @param {{ folder: FolderData, onOpen: (folder: FolderData) => void }} props
 */
export const FolderCard = React.memo(function FolderCard({ folder, onOpen }) {
  const [isHovered, setIsHovered] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [showRenameDialog, setShowRenameDialog] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [deleteDialogType, setDeleteDialogType] = useState('deleteFolder')
  const { showSuccess, showError } = useNotification()

  // Unified interaction: double-click (desktop) / double-tap (mobile) to open
  const { handlers } = useInteraction({
    onOpen: () => onOpen(folder),
    onTap: () => { }, // Handled by framer-motion tap
    disabled: isLoading,
  })

  const handleRename = () => setShowRenameDialog(true)

  const handleDelete = () => {
    setDeleteDialogType('deleteFolder')
    setShowDeleteDialog(true)
  }

  const handleConfirmDelete = async () => {
    setIsLoading(true)

    try {
      const [filesSnapshot, foldersSnapshot] = await Promise.all([
        firestoreService.getFiles(folder.id),
        firestoreService.getFolders(folder.id)
      ])

      if (!filesSnapshot.empty || !foldersSnapshot.empty) {
        setShowDeleteDialog(false)
        setDeleteDialogType('deleteFolderWithContents')
        setIsLoading(false)

        setTimeout(() => {
          setShowDeleteDialog(true)
        }, 100)
        return
      }

      await performDeleteFolder(filesSnapshot, foldersSnapshot)
    } catch (error) {
      console.error('Error deleting folder:', error)
      showError('Failed to delete folder. Please try again.')
      try {
        await performDeleteFolder()
      } catch (error) {
        console.error('Error deleting folder:', error)
        showError('Failed to delete folder. Please try again.')
        setIsLoading(false)
      }
    }
  }

  const performDeleteFolder = async () => {
    try {
      // Soft Delete the folder ONLY.
      // Contents remain "in" the folder (linked by parentId) but are hidden since the parent is in trash.
      // This allows full restoration.

      await firestoreService.softDeleteFolder(folder.id)
      setShowDeleteDialog(false)
      showSuccess(
        'Folder Trashed',
        `"${folder.name}" moved to recycle bin`
      )
    } catch (error) {
      console.error('Error deleting folder:', error)
      showError('Failed to delete folder.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleConfirmDeleteWithContents = async () => {
    setIsLoading(true)
    try {
      const [filesSnapshot, foldersSnapshot] = await Promise.all([
        firestoreService.getFiles(folder.id),
        firestoreService.getFolders(folder.id)
      ])

      await performDeleteFolder(filesSnapshot, foldersSnapshot)
    } catch (error) {
      console.error('Error deleting folder with contents:', error)
      showError('Failed to delete folder. Please try again.')
      setIsLoading(false)
    }
  }

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      whileHover={{ y: -4, transition: { duration: 0.2 } }}
      whileTap={{ scale: 0.96 }}
      transition={{ type: 'spring', stiffness: 350, damping: 25 }}
      className="h-full"
    >
      <Card
        className={`
          group relative h-full border-0 bg-white/50 dark:bg-black/20 
          backdrop-blur-xl shadow-sm hover:shadow-xl dark:shadow-black/40
          transition-all duration-300 overflow-hidden ring-1 ring-black/5 dark:ring-white/10
          cursor-pointer select-none
        `}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        onClick={handlers.onClick}
        onTouchEnd={handlers.onTouchEnd}
        onKeyDown={handlers.onKeyDown}
        tabIndex={0}
        role="button"
        aria-label={`Open folder ${folder.name}`}
      >
        {/* Decorative gradient blob */}
        <div className="absolute -top-10 -right-10 w-32 h-32 bg-blue-500/10 rounded-full blur-3xl group-hover:bg-blue-500/20 transition-all duration-500" />

        <CardContent className="p-5 flex flex-col h-full relative z-10">
          {/* Top Row: Icon + Menu */}
          <div className="flex items-start justify-between mb-4">
            <motion.div
              className="p-3 bg-blue-50 dark:bg-blue-500/10 rounded-2xl text-blue-600 dark:text-blue-400"
              animate={{
                rotate: isHovered ? [0, -5, 5, 0] : 0,
                scale: isHovered ? 1.1 : 1
              }}
              transition={{ duration: 0.4 }}
            >
              {isHovered ? (
                <FolderOpen className="w-8 h-8 fill-current" />
              ) : (
                <Folder className="w-8 h-8 fill-current" />
              )}
            </motion.div>

            {/* Desktop dropdown — hover-reveal */}
            <div className="md:block hidden">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 -mr-2 text-muted-foreground/50 hover:text-foreground opacity-0 group-hover:opacity-100 transition-opacity"
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
                <DropdownMenuContent align="end" className="w-48 glass-card">
                  <DropdownMenuLabel className="text-xs font-normal text-muted-foreground ml-2">Actions</DropdownMenuLabel>
                  <DropdownMenuItem onClick={handleRename} className="cursor-pointer gap-2">
                    <Edit3 className="h-4 w-4" /> Rename
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => { }} className="cursor-pointer gap-2">
                    <Share2 className="h-4 w-4" /> Share
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => { }} className="cursor-pointer gap-2">
                    <Info className="h-4 w-4" /> Details
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={handleDelete}
                    className="cursor-pointer text-red-600 dark:text-red-400 gap-2 focus:text-red-600 focus:bg-red-50 dark:focus:bg-red-950/20"
                    disabled={isLoading}
                  >
                    <Trash2 className="h-4 w-4" /> Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            {/* Mobile — always-visible button with bottom-sheet drawer */}
            <div className="md:hidden block">
              <MobileActions
                file={{ filename: folder.name, downloadURL: '', contentType: 'folder' }}
                onDelete={handleDelete}
                onRename={handleRename}
              >
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 -mr-2 text-muted-foreground"
                  onClick={(e) => e.stopPropagation()}
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <MoreHorizontal className="h-4 w-4" />
                  )}
                </Button>
              </MobileActions>
            </div>
          </div>

          {/* Bottom Row: Name + Meta */}
          <div className="mt-auto space-y-1">
            <h3 className="font-semibold text-base text-foreground/90 truncate pr-4 leading-tight" title={folder.name}>
              {folder.name}
            </h3>
            <div className="flex items-center text-xs text-muted-foreground font-medium">
              <span>Folder</span>
              <span className="mx-1.5 opacity-40">•</span>
              <span>
                {folder.createdAt && formatDistanceToNow(folder.createdAt.toDate(), { addSuffix: true })}
              </span>
            </div>
          </div>
        </CardContent>

        <RenameDialog
          open={showRenameDialog}
          onOpenChange={setShowRenameDialog}
          item={folder}
          type="folder"
          onSuccess={() => { }}
        />

        <ConfirmDialog
          open={showDeleteDialog}
          onOpenChange={(open) => {
            setShowDeleteDialog(open)
            if (!open) setIsLoading(false)
          }}
          type={deleteDialogType}
          itemName={folder.name}
          onConfirm={deleteDialogType === 'deleteFolderWithContents' ? handleConfirmDeleteWithContents : handleConfirmDelete}
          isLoading={isLoading}
        />
      </Card>
    </motion.div>
  )
})

