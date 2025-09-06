'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/components/providers/AuthProvider'
import { collection, query, where, onSnapshot, orderBy } from 'firebase/firestore'
import { firestore } from '@/lib/firebaseClient'
import { Navbar } from '@/components/dashboard/Navbar'
import { UploadArea } from '@/components/dashboard/UploadArea'
import { FileList } from '@/components/dashboard/FileList'
import { UsageBar } from '@/components/dashboard/UsageBar'
import { ViewToggle } from '@/components/dashboard/ViewToggle'
import { FolderBreadcrumb } from '@/components/dashboard/FolderBreadcrumb'
import { EmptyState } from '@/components/dashboard/EmptyState'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { CreateFolderDialog } from '@/components/dashboard/CreateFolderDialog'
import { FolderPlus, Upload, Grid3X3, List } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'

export default function DashboardPage() {
  const { user, loading: authLoading } = useAuth()
  const [files, setFiles] = useState([])
  const [folders, setFolders] = useState([])
  const [currentFolder, setCurrentFolder] = useState(null)
  const [loading, setLoading] = useState(true)
  const [viewMode, setViewMode] = useState('grid')
  const [usage, setUsage] = useState({ usedBytes: 0, limitBytes: 5 * 1024 * 1024 * 1024 })
  const [uploadProgress, setUploadProgress] = useState([])

  // Fetch files and folders when user or current folder changes
  useEffect(() => {
    if (!user) return

    setLoading(true)

    // Set up real-time listeners for files and folders
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

    const unsubscribeFiles = onSnapshot(filesQuery, (snapshot) => {
      const filesData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }))
      setFiles(filesData)
    })

    const unsubscribeFolders = onSnapshot(foldersQuery, (snapshot) => {
      const foldersData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }))
      setFolders(foldersData)
      setLoading(false)
    })

    return () => {
      unsubscribeFiles()
      unsubscribeFolders()
    }
  }, [user, currentFolder])

  // Fetch usage data
  useEffect(() => {
    if (!user) return

    const usageQuery = query(
      collection(firestore, 'usage'),
      where('userId', '==', user.uid)
    )

    const unsubscribe = onSnapshot(usageQuery, (snapshot) => {
      if (!snapshot.empty) {
        const usageData = snapshot.docs[0].data()
        setUsage(usageData)
      }
    })

    return unsubscribe
  }, [user])

  const handleFolderNavigate = (folder) => {
    setCurrentFolder(folder)
  }

  const handleFileUpload = (uploadTasks) => {
    setUploadProgress(uploadTasks)
  }

  const handleUploadComplete = () => {
    setUploadProgress([])
    toast.success('Files uploaded successfully!')
  }

  const handleUploadError = (error) => {
    console.error('Upload error:', error)
    toast.error('Failed to upload files')
  }

  if (authLoading) {
    return <LoadingSpinner />
  }

  const hasItems = files.length > 0 || folders.length > 0

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50/50 via-white to-purple-50/50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      <Navbar />
      
      <div className="container mx-auto px-4 py-6 space-y-6">
        {/* Header with breadcrumbs and actions */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <FolderBreadcrumb 
            currentFolder={currentFolder}
            onNavigate={handleFolderNavigate}
          />
          
          <div className="flex items-center gap-2">
            <CreateFolderDialog
              currentFolder={currentFolder}
              onSuccess={() => {
                toast.success('Folder created successfully!')
              }}
            />
            
            <ViewToggle
              viewMode={viewMode}
              onViewModeChange={setViewMode}
            />
          </div>
        </div>

        {/* Upload Area */}
        <UploadArea
          currentFolder={currentFolder}
          onUpload={handleFileUpload}
          onUploadComplete={handleUploadComplete}
          onUploadError={handleUploadError}
          uploadProgress={uploadProgress}
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
            <EmptyState currentFolder={currentFolder} />
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