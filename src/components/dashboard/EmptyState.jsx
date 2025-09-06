'use client'

import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { CreateFolderDialog } from './CreateFolderDialog'
import { Upload, FolderPlus, Cloud } from 'lucide-react'

export function EmptyState({ currentFolder }) {
  const isRootFolder = !currentFolder

  return (
    <Card className="glass-card border-dashed border-2 border-muted-foreground/20">
      <CardContent className="flex flex-col items-center justify-center py-16 px-6">
        <div className="mb-6">
          <div className="flex items-center justify-center w-20 h-20 mx-auto mb-4 rounded-full bg-gradient-to-br from-blue-100 to-purple-100 dark:from-blue-900/20 dark:to-purple-900/20">
            <Cloud className="w-10 h-10 text-muted-foreground" />
          </div>
        </div>
        
        <div className="text-center space-y-3 max-w-md">
          <h3 className="text-xl font-semibold text-foreground">
            {isRootFolder ? 'Welcome to your drive!' : 'This folder is empty'}
          </h3>
          
          <p className="text-muted-foreground">
            {isRootFolder 
              ? 'Start by uploading your first files or creating folders to organize your content.'
              : 'Add some files or create folders to get started.'
            }
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 mt-8">
          <Button 
            className="glass-button bg-primary/10 hover:bg-primary/20 text-primary border border-primary/20"
            size="lg"
          >
            <Upload className="w-5 h-5 mr-2" />
            Upload Files
          </Button>
          
          <CreateFolderDialog currentFolder={currentFolder}>
            <Button
              variant="outline"
              className="glass-button"
              size="lg"
            >
              <FolderPlus className="w-5 h-5 mr-2" />
              Create Folder
            </Button>
          </CreateFolderDialog>
        </div>

        {isRootFolder && (
          <div className="mt-8 p-4 rounded-lg bg-muted/20 border border-muted/20">
            <div className="text-xs text-muted-foreground space-y-1">
              <p>💡 <strong>Tips:</strong></p>
              <p>• Drag and drop files directly into the upload area</p>
              <p>• Create folders to organize your files</p>
              <p>• Click on any file to preview or download</p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}