'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { ChevronRight, Home, ArrowLeft, ChevronLeft } from 'lucide-react'

interface FolderData {
  id: string
  name: string
  userId: string
  parentId: string | null
  createdAt: any
  updatedAt?: any
}

interface FolderBreadcrumbProps {
  currentFolder: FolderData | null
  folderHierarchy?: FolderData[]
  onNavigate: (folder: FolderData | null) => void
  onNavigateToParent?: () => void
}

export function FolderBreadcrumb({
  currentFolder,
  folderHierarchy = [],
  onNavigate,
  onNavigateToParent
}: FolderBreadcrumbProps) {
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768)
    }

    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  // Mobile view with enhanced navigation
  if (isMobile) {
    return (
      <nav className="flex items-center justify-between w-full">
        <div className="flex items-center space-x-1 flex-1 min-w-0">
          {/* Back Button - always show if not at root */}
          {currentFolder && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onNavigateToParent}
              className="h-8 px-1 font-medium hover:text-foreground flex items-center flex-shrink-0"
            >
              <ArrowLeft className="h-4 w-4 mr-1" />
              Back
            </Button>
          )}

          {/* Home Button */}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onNavigate(null)}
            className={`h-8 px-1 font-medium hover:text-foreground flex items-center flex-shrink-0 ${!currentFolder ? 'text-primary' : ''
              }`}
          >
            <Home className="h-4 w-4" />
          </Button>

          {/* Current folder path indicator */}
          <div className="flex items-center flex-1 min-w-0 overflow-hidden">
            {currentFolder && (
              <>
                <ChevronRight className="h-4 w-4 mx-0.5 text-muted-foreground/50 flex-shrink-0" />
                <div className="flex items-center space-x-1 overflow-hidden">
                  {folderHierarchy.length > 2 && (
                    <>
                      <span className="text-xs text-muted-foreground">...</span>
                      <ChevronRight className="h-3 w-3 text-muted-foreground/50 flex-shrink-0" />
                    </>
                  )}
                  <span className="text-sm font-medium truncate">
                    {currentFolder.name}
                  </span>
                </div>
              </>
            )}
            {!currentFolder && (
              <span className="text-sm font-medium text-muted-foreground ml-1">
                Home
              </span>
            )}
          </div>
        </div>

        {/* Folder depth indicator */}
        {folderHierarchy.length > 0 && (
          <div className="flex items-center space-x-1 text-[10px] text-muted-foreground bg-muted/50 rounded px-1.5 py-0.5 ml-2 shrink-0">
            <span>{folderHierarchy.length}</span>
            <span>lvl</span>
          </div>
        )}
      </nav>
    )
  }

  // Desktop view with full breadcrumb
  return (
    <nav className="flex items-center justify-between w-full">
      <div className="flex items-center space-x-1 text-sm text-muted-foreground overflow-x-auto no-scrollbar">
        {/* Back Button - Desktop */}
        {currentFolder && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onNavigateToParent}
            className="h-8 px-2 font-medium hover:text-foreground flex items-center flex-shrink-0 mr-1"
          >
            <ArrowLeft className="h-4 w-4 mr-1" />
            <span className="hidden sm:inline">Back</span>
          </Button>
        )}

        {/* Home button */}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onNavigate(null)}
          className="h-8 px-2 font-medium hover:text-foreground flex-shrink-0"
        >
          <Home className="h-4 w-4 mr-1" />
          <span className="hidden sm:inline">Home</span>
        </Button>

        {/* Breadcrumb trail */}
        {folderHierarchy.map((folder, index) => (
          <div key={folder.id} className="flex items-center flex-shrink-0">
            <ChevronRight className="h-4 w-4 mx-1 text-muted-foreground/50" />
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onNavigate(folder)}
              className={`h-8 px-2 font-medium hover:text-foreground ${index === folderHierarchy.length - 1
                ? 'text-foreground cursor-default'
                : ''
                }`}
              disabled={index === folderHierarchy.length - 1}
            >
              <span className="truncate max-w-[150px] sm:max-w-[200px]">
                {folder.name}
              </span>
            </Button>
          </div>
        ))}

        {/* Mobile back button for smaller screens when not in mobile view */}
        {currentFolder && !isMobile && folderHierarchy.length > 1 && (
          <div className="sm:hidden">
            <Button
              variant="outline"
              size="sm"
              onClick={onNavigateToParent}
              className="h-8 px-2 ml-2"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>

      {/* Desktop Depth Indicator */}
      {folderHierarchy.length > 0 && (
        <div className="hidden md:flex items-center space-x-1 text-xs text-muted-foreground bg-muted/30 rounded px-2 py-1 ml-4 shrink-0 select-none">
          <span className="font-medium text-foreground">{folderHierarchy.length}</span>
          <span>level{folderHierarchy.length > 1 ? 's' : ''} deep</span>
        </div>
      )}
    </nav>
  )
}