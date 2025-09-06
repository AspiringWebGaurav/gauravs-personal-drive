'use client'

import { Button } from '@/components/ui/button'
import { ChevronRight, Home } from 'lucide-react'

export function FolderBreadcrumb({ currentFolder, onNavigate }) {
  const breadcrumbs = []
  
  // Build breadcrumb path
  let folder = currentFolder
  while (folder) {
    breadcrumbs.unshift(folder)
    // In a real implementation, you'd fetch the parent folder data
    // For now, we'll just break to avoid infinite loop
    break
  }

  return (
    <nav className="flex items-center space-x-1 text-sm text-muted-foreground">
      <Button
        variant="ghost"
        size="sm"
        onClick={() => onNavigate(null)}
        className="h-8 px-2 font-medium hover:text-foreground"
      >
        <Home className="h-4 w-4 mr-1" />
        Home
      </Button>
      
      {breadcrumbs.map((folder, index) => (
        <div key={folder.id} className="flex items-center">
          <ChevronRight className="h-4 w-4 mx-1 text-muted-foreground/50" />
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onNavigate(folder)}
            className="h-8 px-2 font-medium hover:text-foreground"
            disabled={index === breadcrumbs.length - 1}
          >
            {folder.name}
          </Button>
        </div>
      ))}
    </nav>
  )
}