'use client'

import { FileCard } from './FileCard'
import { FolderCard } from './FolderCard'
import { FileTableView } from './FileTableView'

export function FileList({ files, folders, viewMode, onFolderOpen, currentFolder }) {
  const allItems = [...folders, ...files]

  if (viewMode === 'table') {
    return (
      <FileTableView
        files={files}
        folders={folders}
        onFolderOpen={onFolderOpen}
        currentFolder={currentFolder}
      />
    )
  }

  // Grid view
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
      {folders.map((folder) => (
        <FolderCard
          key={folder.id}
          folder={folder}
          onOpen={() => onFolderOpen(folder)}
        />
      ))}
      {files.map((file) => (
        <FileCard
          key={file.id}
          file={file}
          currentFolder={currentFolder}
        />
      ))}
    </div>
  )
}