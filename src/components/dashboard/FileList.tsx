'use client'

import { useEffect } from 'react'
import { FileCard } from './FileCard'
import { FolderCard } from './FolderCard'
import { FileTableView } from './FileTableView'

interface FileData {
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

interface FolderData {
  id: string
  name: string
  userId: string
  parentId: string | null
  createdAt: any
  updatedAt?: any
}

interface FileListProps {
  files: FileData[]
  folders: FolderData[]
  viewMode: 'grid' | 'table'
  onFolderOpen: (folder: FolderData | null) => void
  currentFolder: FolderData | null
}

export function FileList({
  files,
  folders,
  viewMode,
  onFolderOpen,
  currentFolder
}: FileListProps) {
  const allItems = [...folders, ...files]

  // Debug view mode changes
  useEffect(() => {
    console.log('FileList: View mode changed to:', viewMode)
    console.log('FileList: Files count:', files.length)
    console.log('FileList: Folders count:', folders.length)
  }, [viewMode, files.length, folders.length])

  console.log('FileList: Rendering with viewMode:', viewMode)

  if (viewMode === 'table') {
    console.log('FileList: Rendering table view')
    return (
      <div key={`table-${files.length}-${folders.length}`} className="animate-slide-left">
        <FileTableView
          files={files}
          folders={folders}
          onFolderOpen={onFolderOpen}
          currentFolder={currentFolder}
        />
      </div>
    )
  }

  // Grid view
  console.log('FileList: Rendering grid view')
  return (
    <div
      key={`grid-${files.length}-${folders.length}-${currentFolder?.id || 'root'}`}
      className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-4 animate-slide-left"
    >
      {folders.map((folder, index) => (
        <div
          key={folder.id}
          className="animate-fade-in"
          style={{
            animationDelay: `${index * 50}ms`,
            animationFillMode: 'both'
          }}
        >
          <FolderCard
            folder={folder}
            onOpen={() => onFolderOpen(folder)}
          />
        </div>
      ))}
      {files.map((file, index) => (
        <div
          key={file.id}
          className="animate-fade-in"
          style={{
            animationDelay: `${(folders.length + index) * 50}ms`,
            animationFillMode: 'both'
          }}
        >
          <FileCard
            file={file}
            currentFolder={currentFolder}
          />
        </div>
      ))}
    </div>
  )
}