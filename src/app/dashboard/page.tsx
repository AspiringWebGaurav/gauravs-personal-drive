'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useRequireAuth } from '@/components/providers/AuthProvider'
import { useSwipeGesture } from '@/hooks/useSwipeGesture'
import { collection, query, where, orderBy, DocumentData } from 'firebase/firestore'
import { firestore } from '@/lib/firebaseClient'
import { onSnapshotWithRetry, handleFirestoreError } from '@/lib/firestoreHelpers'
import { Navbar } from '@/components/dashboard/Navbar'
import { UploadArea } from '@/components/dashboard/UploadArea'
import { FileList } from '@/components/dashboard/FileList'
import { UsageBar } from '@/components/dashboard/UsageBar'
import { ViewToggle } from '@/components/dashboard/ViewToggle'
import { FolderBreadcrumb } from '@/components/dashboard/FolderBreadcrumb'
import { EmptyState } from '@/components/dashboard/EmptyState'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { CreateFolderDialog } from '@/components/dashboard/CreateFolderDialog'
import { Button } from '@/components/ui/button'
import { FolderPlus } from 'lucide-react'
import { toast } from 'sonner'

interface FileData extends DocumentData {
  id: string
  filename: string
  contentType: string
  size: number
  downloadURL: string
  storagePath: string
  userId: string
  folderId: string | null
  createdAt: any
  updatedAt?: any
}

interface FolderData extends DocumentData {
  id: string
  name: string
  userId: string
  parentId: string | null
  createdAt: any
  updatedAt?: any
}

interface UsageData {
  usedBytes: number
  limitBytes: number
}

type ViewMode = 'grid' | 'table'

export default function DashboardPage() {
  const { user, loading: authLoading, isTokenReady, getValidToken } = useRequireAuth()
  const [files, setFiles] = useState<FileData[]>([])
  const [folders, setFolders] = useState<FolderData[]>([])
  const [currentFolder, setCurrentFolder] = useState<FolderData | null>(null)
  const [folderHierarchy, setFolderHierarchy] = useState<FolderData[]>([]) // Track folder path
  const [allFolders, setAllFolders] = useState<Map<string, FolderData>>(new Map()) // Cache all folders
  const [loading, setLoading] = useState(true)
  const [viewMode, setViewMode] = useState<ViewMode>('grid')
  const [usage, setUsage] = useState<UsageData>({ usedBytes: 0, limitBytes: 5 * 1024 * 1024 * 1024 })
  const [permissionError, setPermissionError] = useState<string | null>(null)
  const [retryCount, setRetryCount] = useState(0)
  const uploadAreaTriggerRef = useRef<(() => void) | null>(null)

  // Enhanced view mode handler with debugging
  const handleViewModeChange = (newMode: ViewMode) => {
    console.log('Dashboard: Changing view mode from', viewMode, 'to', newMode)
    setViewMode(newMode)
    
    // Force re-render by updating state
    setTimeout(() => {
      console.log('Dashboard: View mode state after update:', newMode)
    }, 100)
  }

  // Debug current view mode
  useEffect(() => {
    console.log('Dashboard: Current view mode is:', viewMode)
  }, [viewMode])

  // Build folder hierarchy path
  const buildFolderHierarchy = useCallback((targetFolder: FolderData | null): FolderData[] => {
    if (!targetFolder) return []
    
    const path: FolderData[] = []
    let currentFolderInPath = targetFolder
    
    // Traverse up the folder tree
    while (currentFolderInPath && path.length < 10) { // Prevent infinite loops
      path.unshift(currentFolderInPath)
      if (currentFolderInPath.parentId) {
        const parentFolder = allFolders.get(currentFolderInPath.parentId)
        if (parentFolder) {
          currentFolderInPath = parentFolder
        } else {
          console.warn('Parent folder not found:', currentFolderInPath.parentId)
          break
        }
      } else {
        break
      }
    }
    
    return path
  }, [allFolders])

  // Fetch all folders for hierarchy building
  useEffect(() => {
    if (!user || !isTokenReady) return

    console.log('📂 Setting up all folders cache')
    const allFoldersQuery = query(
      collection(firestore, 'folders'),
      where('userId', '==', user.uid)
    )

    const cleanup = onSnapshotWithRetry(
      allFoldersQuery,
      (snapshot) => {
        const foldersMap = new Map<string, FolderData>()
        snapshot.docs.forEach((doc: any) => {
          const folderData = { id: doc.id, ...doc.data() } as FolderData
          foldersMap.set(doc.id, folderData)
        })
        setAllFolders(foldersMap)
        console.log('📂 All folders cache updated:', foldersMap.size, 'folders')
      },
      {
        maxRetries: 3,
        retryDelay: 1500,
        onError: (error) => {
          console.error('❌ Error fetching all folders:', error)
        }
      }
    )

    return cleanup
  }, [user, isTokenReady])

  // Update folder hierarchy when currentFolder or allFolders changes
  useEffect(() => {
    const newHierarchy = buildFolderHierarchy(currentFolder)
    setFolderHierarchy(newHierarchy)
    console.log('📂 Folder hierarchy updated:', newHierarchy.map((f: FolderData) => f.name))
  }, [currentFolder, allFolders, buildFolderHierarchy])

  // Enhanced Firestore setup with retry logic
  useEffect(() => {
    if (!user || !isTokenReady) {
      console.log('📋 Firestore setup skipped - waiting for authentication:', { user: !!user, isTokenReady })
      setLoading(true)
      return
    }

    console.log('🔥 Setting up enhanced Firestore listeners for user:', user.email)
    setLoading(true)
    setPermissionError(null)

    // Set up real-time listeners for files and folders with retry logic
    const filesQuery = query(
      collection(firestore, 'files'),
      where('userId', '==', user.uid),
      where('folderId', '==', currentFolder?.id || null),
      orderBy('createdAt', 'desc')
    )

    const foldersQuery = query(
      collection(firestore, 'folders'),
      where('userId', '==', user.uid),
      where('parentId', '==', currentFolder?.id || null),
      orderBy('createdAt', 'desc')
    )

    const cleanupFiles = onSnapshotWithRetry(
      filesQuery,
      (snapshot) => {
        console.log('📁 Files snapshot received:', snapshot.docs.length, 'files')
        const filesData = snapshot.docs.map((doc: any) => ({
          id: doc.id,
          ...doc.data()
        })) as FileData[]
        setFiles(filesData)
        setPermissionError(null) // Clear any previous errors
      },
      {
        maxRetries: 5,
        retryDelay: 1500,
        onError: (error, retryCount) => {
          console.error('❌ Files listener error after retries:', error.code)
          const errorMessage = handleFirestoreError(error, 'files query')
          setPermissionError(errorMessage)
        },
        onRetry: (retryCount) => {
          console.log(`🔄 Files query retry attempt ${retryCount}`)
          setPermissionError(`Reconnecting... (attempt ${retryCount})`)
        }
      }
    )

    const cleanupFolders = onSnapshotWithRetry(
      foldersQuery,
      (snapshot) => {
        console.log('📂 Folders snapshot received:', snapshot.docs.length, 'folders')
        const foldersData = snapshot.docs.map((doc: any) => ({
          id: doc.id,
          ...doc.data()
        })) as FolderData[]
        setFolders(foldersData)
        setLoading(false)
        setPermissionError(null) // Clear any previous errors
      },
      {
        maxRetries: 5,
        retryDelay: 1500,
        onError: (error, retryCount) => {
          console.error('❌ Folders listener error after retries:', error.code)
          const errorMessage = handleFirestoreError(error, 'folders query')
          setPermissionError(errorMessage)
          setLoading(false)
        },
        onRetry: (retryCount) => {
          console.log(`🔄 Folders query retry attempt ${retryCount}`)
          setPermissionError(`Reconnecting... (attempt ${retryCount})`)
        }
      }
    )

    return () => {
      console.log('🔓 Cleaning up enhanced Firestore listeners')
      cleanupFiles()
      cleanupFolders()
    }
  }, [user, currentFolder, isTokenReady, retryCount])

  // Enhanced usage data fetch with retry logic
  useEffect(() => {
    if (!user || !isTokenReady) {
      console.log('📊 Usage data fetch skipped - waiting for authentication')
      return
    }

    console.log('📊 Setting up enhanced usage data listener')
    const usageQuery = query(
      collection(firestore, 'usage'),
      where('userId', '==', user.uid)
    )

    const cleanup = onSnapshotWithRetry(
      usageQuery,
      (snapshot) => {
        console.log('📊 Usage snapshot received')
        if (!snapshot.empty) {
          const usageData = snapshot.docs[0].data() as UsageData
          setUsage(usageData)
        }
      },
      {
        maxRetries: 3,
        retryDelay: 2000,
        onError: (error, retryCount) => {
          console.error('❌ Usage listener error after retries:', error.code)
          // Don't show error UI for usage data failures, just log them
        },
        onRetry: (retryCount) => {
          console.log(`🔄 Usage query retry attempt ${retryCount}`)
        }
      }
    )

    return cleanup
  }, [user, isTokenReady, retryCount])

  const handleFolderNavigate = useCallback((folder: FolderData | null) => {
    setCurrentFolder(folder)
    // Hierarchy will be updated automatically by the useEffect
  }, [])

  const navigateToParent = useCallback(() => {
    if (currentFolder?.parentId) {
      const parentFolder = allFolders.get(currentFolder.parentId)
      if (parentFolder) {
        setCurrentFolder(parentFolder)
      } else {
        setCurrentFolder(null) // Go to root if parent not found
      }
    } else {
      setCurrentFolder(null) // Already at root
    }
  }, [currentFolder, allFolders])

  // Swipe gesture support for mobile navigation
  const { elementRef: swipeRef } = useSwipeGesture({
    onSwipeRight: () => {
      // Swipe right to go back to parent folder
      if (currentFolder) {
        console.log('📱 Swipe right detected - navigating to parent')
        navigateToParent()
      }
    },
    threshold: 100,
    enabled: true
  })

  const handleUploadComplete = () => {
    toast.success('Files uploaded successfully!')
  }

  const handleUploadTrigger = useCallback(() => {
    console.log('🔍 DEBUG: DashboardPage - Upload trigger called from EmptyState')
    if (uploadAreaTriggerRef.current) {
      console.log('🔍 DEBUG: DashboardPage - Calling uploadAreaTrigger function')
      uploadAreaTriggerRef.current()
    } else {
      console.log('🔍 DEBUG: DashboardPage - No uploadAreaTrigger function available yet')
    }
  }, [])

  // Use ref instead of state to avoid render cycle issues
  const handleRegisterTrigger = useCallback((triggerFn: () => void) => {
    console.log('🔍 DEBUG: DashboardPage - handleRegisterTrigger called - storing in ref')
    console.log('🔍 DEBUG: DashboardPage - About to store triggerFn in ref (no state update)')
    try {
      uploadAreaTriggerRef.current = triggerFn
      console.log('🔍 DEBUG: DashboardPage - triggerFn stored in ref successfully')
    } catch (error) {
      console.error('🔍 DEBUG: DashboardPage - Error storing triggerFn in ref:', error)
    }
  }, [])

  // Enhanced loading and error states
  if (authLoading || !isTokenReady) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50/50 via-white to-purple-50/50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 flex items-center justify-center">
        <div className="text-center space-y-4">
          <LoadingSpinner />
          <p className="text-sm text-muted-foreground">
            {authLoading ? 'Authenticating...' : 'Preparing secure connection...'}
          </p>
        </div>
      </div>
    )
  }

  const hasItems = files.length > 0 || folders.length > 0

  // Permission error retry component
  const PermissionErrorRetry = () => (
    <div className="bg-yellow-50 dark:bg-yellow-950/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4 mb-6">
      <div className="flex items-center space-x-3">
        <div className="flex-shrink-0">
          <svg className="h-5 w-5 text-yellow-600 dark:text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
        </div>
        <div className="flex-1">
          <h3 className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
            Connection Issue Detected
          </h3>
          <p className="mt-1 text-sm text-yellow-700 dark:text-yellow-300">
            There was a temporary authentication issue. Retrying automatically...
          </p>
        </div>
        <button
          onClick={() => setRetryCount(prev => prev + 1)}
          className="flex-shrink-0 text-sm text-yellow-600 dark:text-yellow-400 hover:text-yellow-500 font-medium"
        >
          Retry Now
        </button>
      </div>
    </div>
  )

  return (
    <div
      ref={swipeRef as any}
      className="min-h-screen bg-gradient-to-br from-blue-50/50 via-white to-purple-50/50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900"
    >
      <Navbar />
      
      <div className="container mx-auto px-4 py-6 space-y-6">
        {/* Permission Error Display */}
        {permissionError && <PermissionErrorRetry />}

        {/* Header with breadcrumbs and actions */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <FolderBreadcrumb
            currentFolder={currentFolder}
            folderHierarchy={folderHierarchy}
            onNavigate={handleFolderNavigate}
            onNavigateToParent={navigateToParent}
          />
          
          <div className="flex items-center gap-2">
            <CreateFolderDialog
              currentFolder={currentFolder}
              onSuccess={() => {
                toast.success('Folder created successfully!')
              }}
            >
              <Button variant="outline" size="sm" className="glass-button">
                <FolderPlus className="h-4 w-4 mr-2" />
                New Folder
              </Button>
            </CreateFolderDialog>
            
            <ViewToggle
              viewMode={viewMode}
              onViewModeChange={handleViewModeChange}
            />
          </div>
        </div>

        {/* Upload Area */}
        <UploadArea
          currentFolder={currentFolder}
          onUploadComplete={handleUploadComplete}
          onRegisterTrigger={handleRegisterTrigger}
        />

        {/* Content Area */}
        <div className="space-y-6">
          {loading ? (
            <div className="flex justify-center py-12">
              <LoadingSpinner />
            </div>
          ) : hasItems ? (
            <FileList
              files={files}
              folders={folders}
              viewMode={viewMode}
              onFolderOpen={handleFolderNavigate}
              currentFolder={currentFolder}
            />
          ) : (
            <EmptyState
              currentFolder={currentFolder}
              onUploadTrigger={handleUploadTrigger}
              folderHierarchy={folderHierarchy}
              onNavigateHome={() => handleFolderNavigate(null)}
              onNavigateToParent={navigateToParent}
              onNavigateToFolder={handleFolderNavigate}
              enableSwipeNavigation={true}
            />
          )}
        </div>

        {/* Usage Bar */}
        <div className="sticky bottom-4">
          <UsageBar usage={usage} />
        </div>
      </div>
    </div>
  )
}