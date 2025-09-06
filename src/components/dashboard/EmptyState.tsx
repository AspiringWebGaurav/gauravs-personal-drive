'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { CreateFolderDialog } from './CreateFolderDialog'
import { useSwipeGesture } from '@/hooks/useSwipeGesture'
import {
  Upload,
  FolderPlus,
  Cloud,
  Home,
  ArrowLeft,
  ChevronRight,
  Navigation,
  Move
} from 'lucide-react'

interface FolderData {
  id: string
  name: string
  userId: string
  parentId: string | null
  createdAt: any
  updatedAt?: any
}

interface EmptyStateProps {
  currentFolder: FolderData | null
  onUploadTrigger: () => void
  folderHierarchy?: FolderData[]
  onNavigateHome?: () => void
  onNavigateToParent?: () => void
  onNavigateToFolder?: (folder: FolderData | null) => void
  enableSwipeNavigation?: boolean
}

export function EmptyState({
  currentFolder,
  onUploadTrigger,
  folderHierarchy = [],
  onNavigateHome,
  onNavigateToParent,
  onNavigateToFolder,
  enableSwipeNavigation = true
}: EmptyStateProps) {
  const isRootFolder = !currentFolder
  const [isMobile, setIsMobile] = useState(false)
  const [showSwipeHint, setShowSwipeHint] = useState(false)

  // Mobile detection
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768)
    }
    
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  // Show swipe hint on mobile after 3 seconds, then hide after 5 seconds
  useEffect(() => {
    if (isMobile && !isRootFolder && enableSwipeNavigation) {
      const showTimer = setTimeout(() => setShowSwipeHint(true), 3000)
      const hideTimer = setTimeout(() => setShowSwipeHint(false), 8000)
      
      return () => {
        clearTimeout(showTimer)
        clearTimeout(hideTimer)
      }
    }
  }, [isMobile, isRootFolder, enableSwipeNavigation])

  // Swipe gesture integration
  const { elementRef: swipeRef } = useSwipeGesture({
    onSwipeRight: () => {
      if (currentFolder && onNavigateToParent) {
        console.log('📱 EmptyState: Swipe right detected - navigating to parent')
        onNavigateToParent()
      }
    },
    threshold: 100,
    enabled: enableSwipeNavigation && !isRootFolder
  })

  // Navigation handlers
  const handleNavigateHome = () => {
    if (onNavigateHome) {
      onNavigateHome()
    } else if (onNavigateToFolder) {
      onNavigateToFolder(null)
    }
  }

  const handleNavigateToParent = () => {
    if (onNavigateToParent) {
      onNavigateToParent()
    }
  }

  // Get folder hierarchy display info
  const folderDepth = folderHierarchy.length
  const currentFolderName = currentFolder?.name || 'Home'

  return (
    <div ref={swipeRef as any} className="relative">
      {/* Floating Home Button - Mobile Only */}
      {!isRootFolder && isMobile && (
        <div className="fixed bottom-6 right-6 z-50 animate-in fade-in slide-in-from-bottom-4 duration-700">
          <Button
            variant="default"
            onClick={handleNavigateHome}
            className="glass-button h-14 w-14 rounded-full bg-primary/90 hover:bg-primary hover:scale-110 text-primary-foreground shadow-2xl border-2 border-white/20 transition-all duration-300 ease-out"
            size="icon"
            aria-label="Navigate to Home"
          >
            <Home className="h-6 w-6 transition-transform duration-200 group-hover:scale-110" />
          </Button>
        </div>
      )}

      {/* Swipe Hint */}
      {showSwipeHint && isMobile && !isRootFolder && (
        <div className="fixed top-1/2 left-4 right-4 z-40 transform -translate-y-1/2 animate-in fade-in slide-in-from-left-4 duration-500">
          <div className="bg-primary/10 backdrop-blur-md border border-primary/20 rounded-lg p-3 text-center shadow-lg animate-pulse">
            <div className="flex items-center justify-center space-x-2 text-primary">
              <Move className="h-4 w-4 animate-bounce" />
              <span className="text-sm font-medium">Swipe right to go back</span>
              <ArrowLeft className="h-4 w-4 animate-pulse" />
            </div>
          </div>
        </div>
      )}

      <Card className="glass-card border-dashed border-2 border-muted-foreground/20 transition-all duration-300 hover:border-muted-foreground/30">
        {/* Navigation Header - Shows when not in root */}
        {!isRootFolder && (
          <div className="border-b border-muted-foreground/10 p-4 animate-in slide-in-from-top-2 duration-500">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2 flex-1 min-w-0">
                {/* Back Button */}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleNavigateToParent}
                  className="h-8 px-2 font-medium hover:text-foreground flex items-center flex-shrink-0 transition-all duration-200 hover:scale-105 hover:bg-accent/50 focus:ring-2 focus:ring-primary/20"
                  aria-label={`Navigate back to ${folderHierarchy[folderDepth - 2]?.name || 'parent folder'}`}
                >
                  <ArrowLeft className="h-4 w-4 mr-1 transition-transform duration-200 group-hover:-translate-x-1" />
                  <span className="hidden sm:inline">Back</span>
                </Button>
                
                {/* Home Button */}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleNavigateHome}
                  className="h-8 px-2 font-medium hover:text-foreground flex items-center flex-shrink-0 transition-all duration-200 hover:scale-105 hover:bg-accent/50 focus:ring-2 focus:ring-primary/20"
                  aria-label="Navigate to Home directory"
                >
                  <Home className="h-4 w-4 transition-transform duration-200 group-hover:scale-110" />
                  <span className="hidden sm:inline ml-1">Home</span>
                </Button>
                
                {/* Current location indicator */}
                <div className="flex items-center flex-1 min-w-0 overflow-hidden">
                  <ChevronRight className="h-4 w-4 mx-1 text-muted-foreground/50 flex-shrink-0" />
                  <div className="flex items-center space-x-1 overflow-hidden">
                    {isMobile && folderDepth > 2 && (
                      <>
                        <span className="text-xs text-muted-foreground">...</span>
                        <ChevronRight className="h-3 w-3 text-muted-foreground/50 flex-shrink-0" />
                      </>
                    )}
                    {!isMobile && folderHierarchy.slice(0, -1).map((folder, index) => (
                      <div key={folder.id} className="flex items-center">
                        <button
                          onClick={() => onNavigateToFolder?.(folder)}
                          className="text-sm text-muted-foreground hover:text-foreground truncate max-w-[100px] transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-primary/20 rounded px-1"
                          aria-label={`Navigate to ${folder.name} folder`}
                          tabIndex={0}
                        >
                          {folder.name}
                        </button>
                        <ChevronRight className="h-3 w-3 mx-1 text-muted-foreground/50 flex-shrink-0" />
                      </div>
                    ))}
                    <span className="text-sm font-medium truncate">
                      {currentFolderName}
                    </span>
                  </div>
                </div>
              </div>
              
              {/* Folder depth indicator */}
              {folderDepth > 0 && (
                <div
                  className="flex items-center space-x-1 text-xs text-muted-foreground bg-muted/30 rounded px-2 py-1 ml-2 transition-all duration-200 hover:bg-muted/50"
                  role="status"
                  aria-label={`Currently ${folderDepth} folder level${folderDepth > 1 ? 's' : ''} deep in the hierarchy`}
                >
                  <Navigation className="h-3 w-3 animate-pulse" />
                  <span className="font-medium">{folderDepth}</span>
                  <span className="hidden sm:inline">level{folderDepth > 1 ? 's' : ''} deep</span>
                </div>
              )}
            </div>
          </div>
        )}
        
        <CardContent className="flex flex-col items-center justify-center py-16 px-6">
          <div className="mb-6 animate-in zoom-in-50 duration-700">
            <div className="flex items-center justify-center w-20 h-20 mx-auto mb-4 rounded-full bg-gradient-to-br from-blue-100 to-purple-100 dark:from-blue-900/20 dark:to-purple-900/20 transition-all duration-300 hover:scale-110 hover:rotate-3">
              <Cloud className="w-10 h-10 text-muted-foreground transition-all duration-300 hover:text-primary" />
            </div>
          </div>
          
          <div className="text-center space-y-3 max-w-md animate-in slide-in-from-bottom-3 duration-500 delay-200">
            <h3 className="text-xl font-semibold text-foreground transition-colors duration-200">
              {isRootFolder ? 'Welcome to your drive!' : 'This folder is empty'}
            </h3>
            
            <p className="text-muted-foreground transition-colors duration-200">
              {isRootFolder
                ? 'Start by uploading your first files or creating folders to organize your content.'
                : 'Add some files or create folders to get started.'
              }
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 mt-8 animate-in slide-in-from-bottom-2 duration-500 delay-500">
            <Button
              variant="default"
              className="glass-button bg-primary/10 hover:bg-primary/20 text-primary border border-primary/20 transition-all duration-300 hover:scale-105 hover:shadow-lg focus:ring-2 focus:ring-primary/30"
              size="lg"
              onClick={() => {
                console.log('🔍 DEBUG: Upload Files button clicked in EmptyState')
                if (onUploadTrigger) {
                  console.log('🔍 DEBUG: Calling onUploadTrigger callback')
                  onUploadTrigger()
                } else {
                  console.log('🔍 DEBUG: No onUploadTrigger callback provided')
                }
              }}
              aria-label="Upload files to current folder"
            >
              <Upload className="w-5 h-5 mr-2 transition-transform duration-200 group-hover:scale-110" />
              Upload Files
            </Button>
            
            <CreateFolderDialog
              currentFolder={currentFolder}
              onSuccess={() => {
                console.log('Folder created successfully from EmptyState')
              }}
            >
              <Button
                variant="outline"
                className="glass-button transition-all duration-300 hover:scale-105 hover:shadow-lg hover:border-primary/30 focus:ring-2 focus:ring-primary/30"
                size="lg"
                aria-label="Create a new folder in current directory"
              >
                <FolderPlus className="w-5 h-5 mr-2 transition-transform duration-200 group-hover:scale-110" />
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

          {/* Mobile navigation tips for subfolders */}
          {!isRootFolder && isMobile && (
            <div
              className="mt-6 p-3 rounded-lg bg-muted/10 border border-muted/10 animate-in slide-in-from-bottom-1 duration-500 delay-700"
              role="complementary"
              aria-label="Navigation tips for mobile users"
            >
              <div className="text-xs text-muted-foreground space-y-1">
                <p>💡 <strong>Navigation Tips:</strong></p>
                <p>• Swipe right anywhere to go back</p>
                <p>• Tap the floating home button to return to root</p>
                <p>• Use the back/home buttons above</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}