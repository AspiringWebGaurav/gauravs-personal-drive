'use client'

import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Edit3, Loader2 } from 'lucide-react'
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore'
import { firestore } from '@/lib/firebaseClient'
import { toast } from 'sonner'
import { useNotification } from '@/components/providers/NotificationProvider'

export function RenameDialog({
  open,
  onOpenChange,
  item,
  type, // 'file' or 'folder'
  onSuccess
}) {
  const [newName, setNewName] = useState(item?.filename || item?.name || '')
  const [isLoading, setIsLoading] = useState(false)
  const { showSuccess } = useNotification()

  const handleRename = async () => {
    if (!newName.trim()) {
      toast.error('Name is required')
      return
    }

    if (newName.trim() === (item?.filename || item?.name)) {
      onOpenChange(false)
      return
    }

    setIsLoading(true)

    try {
      const collection = type === 'file' ? 'files' : 'folders'
      const field = type === 'file' ? 'filename' : 'name'
      
      await updateDoc(doc(firestore, collection, item.id), {
        [field]: newName.trim(),
        updatedAt: serverTimestamp(),
      })

      // Keep toast for immediate feedback, add dialog for completion
      toast.success(`${type === 'file' ? 'File' : 'Folder'} renamed successfully!`)
      showSuccess(
        `${type === 'file' ? 'File' : 'Folder'} Renamed`,
        `"${item?.filename || item?.name}" has been renamed to "${newName.trim()}"`,
        { autoCloseDuration: 2500 }
      )
      onOpenChange(false)
      onSuccess?.()
    } catch (error) {
      console.error(`Error renaming ${type}:`, error)
      toast.error(`Failed to rename ${type}. Please try again.`)
    } finally {
      setIsLoading(false)
    }
  }

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !isLoading) {
      handleRename()
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="glass-card">
        <DialogHeader>
          <DialogTitle>Rename {type === 'file' ? 'File' : 'Folder'}</DialogTitle>
          <DialogDescription>
            Enter a new name for "{item?.filename || item?.name}"
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="new-name">Name</Label>
            <Input
              id="new-name"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyPress={handleKeyPress}
              disabled={isLoading}
              className="glass-button"
              autoFocus
              selectOnFocus
            />
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isLoading}
          >
            Cancel
          </Button>
          <Button
            onClick={handleRename}
            disabled={isLoading || !newName.trim()}
            className="glass-button bg-primary/10 hover:bg-primary/20 text-primary border border-primary/20"
          >
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Renaming...
              </>
            ) : (
              <>
                <Edit3 className="h-4 w-4 mr-2" />
                Rename
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}