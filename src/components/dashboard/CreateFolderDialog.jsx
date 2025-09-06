'use client'

import { useState } from 'react'
import { useAuth } from '@/components/providers/AuthProvider'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { FolderPlus, Loader2 } from 'lucide-react'
import { collection, addDoc, serverTimestamp } from 'firebase/firestore'
import { firestore } from '@/lib/firebaseClient'
import { toast } from 'sonner'

export function CreateFolderDialog({ currentFolder, onSuccess, children }) {
  const { user } = useAuth()
  const [open, setOpen] = useState(false)
  const [folderName, setFolderName] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const handleCreate = async () => {
    if (!folderName.trim()) {
      toast.error('Folder name is required')
      return
    }

    if (!user) {
      toast.error('You must be signed in to create folders')
      return
    }

    setIsLoading(true)

    try {
      // Create folder document in Firestore
      await addDoc(collection(firestore, 'folders'), {
        userId: user.uid,
        name: folderName.trim(),
        parentId: currentFolder?.id || null,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      })

      toast.success(`Folder "${folderName}" created successfully!`)
      setFolderName('')
      setOpen(false)
      onSuccess?.()
    } catch (error) {
      console.error('Error creating folder:', error)
      toast.error('Failed to create folder. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !isLoading) {
      handleCreate()
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children || (
          <Button variant="outline" size="sm" className="glass-button">
            <FolderPlus className="h-4 w-4 mr-2" />
            New Folder
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="glass-card">
        <DialogHeader>
          <DialogTitle>Create New Folder</DialogTitle>
          <DialogDescription>
            {currentFolder 
              ? `Create a new folder inside "${currentFolder.name}"`
              : 'Create a new folder in your drive'
            }
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="folder-name">Folder Name</Label>
            <Input
              id="folder-name"
              placeholder="Enter folder name..."
              value={folderName}
              onChange={(e) => setFolderName(e.target.value)}
              onKeyPress={handleKeyPress}
              disabled={isLoading}
              className="glass-button"
              autoFocus
            />
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => setOpen(false)}
            disabled={isLoading}
          >
            Cancel
          </Button>
          <Button
            onClick={handleCreate}
            disabled={isLoading || !folderName.trim()}
            className="glass-button bg-primary/10 hover:bg-primary/20 text-primary border border-primary/20"
          >
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Creating...
              </>
            ) : (
              <>
                <FolderPlus className="h-4 w-4 mr-2" />
                Create Folder
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}