'use client'

import { useState, memo, useCallback } from 'react'
import { Grid } from "react-window";
import { AutoSizer } from 'react-virtualized-auto-sizer'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  MoreHorizontal,
  Download,
  Edit3,
  Trash2,
  Eye,
  FileText,
  Image as ImageIcon,
  Video,
  Music,
  Archive,
  FileIcon,
  Folder,
  ArrowUpDown,
  CheckCircle2,
  Square
} from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { usageService } from '@/services/usageService'
import { useNotification } from '@/components/providers/NotificationProvider'
import { useDownload } from '@/hooks/useDownload'
import { FilePreviewModal } from './FilePreviewModal'
import { useInteraction } from '@/hooks/useInteraction'

export function FileTableView({
  files, folders, onFolderOpen, currentFolder,
  onLoadMore, hasMore, isLoadingMore,
  // Selection props from parent
  selectedIds, toggleSelection, selectAll, clearSelection,
  isAllSelected, isSomeSelected, onRefresh
}) {
  const [sortField, setSortField] = useState('name')
  const [sortDirection, setSortDirection] = useState('asc')
  const [previewFile, setPreviewFile] = useState(null)

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  const getFileIcon = (contentType) => {
    const iconClass = "w-5 h-5"
    if (contentType?.startsWith('image/')) return <ImageIcon className={iconClass} />
    if (contentType?.startsWith('video/')) return <Video className={iconClass} />
    if (contentType?.startsWith('audio/')) return <Music className={iconClass} />
    if (contentType?.includes('pdf')) return <FileText className={iconClass} />
    if (contentType?.includes('zip') || contentType?.includes('rar')) return <Archive className={iconClass} />
    return <FileIcon className={iconClass} />
  }

  const handleSort = (field) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDirection('asc')
    }
  }

  const sortItems = (items, type) => {
    return [...items].sort((a, b) => {
      let aValue, bValue
      switch (sortField) {
        case 'name':
          aValue = type === 'folder' ? a.name : a.filename
          bValue = type === 'folder' ? b.name : b.filename
          break
        case 'size':
          if (type === 'folder') return 0
          aValue = a.size || 0
          bValue = b.size || 0
          break
        case 'modified':
          aValue = a.updatedAt?.toDate() || a.createdAt?.toDate() || new Date(0)
          bValue = b.updatedAt?.toDate() || b.createdAt?.toDate() || new Date(0)
          break
        default:
          return 0
      }
      if (typeof aValue === 'string') {
        aValue = aValue.toLowerCase()
        bValue = bValue.toLowerCase()
      }
      if (sortDirection === 'asc') {
        return aValue < bValue ? -1 : aValue > bValue ? 1 : 0
      } else {
        return aValue > bValue ? -1 : aValue < bValue ? 1 : 0
      }
    })
  }

  const sortedFolders = sortItems(folders, 'folder').map(f => ({ ...f, type: 'folder' }))
  const sortedFiles = sortItems(files, 'file').map(f => ({ ...f, type: 'file' }))
  const allItems = [...sortedFolders, ...sortedFiles]

  const handleSelectAllToggle = () => {
    if (isAllSelected) {
      clearSelection()
    } else {
      selectAll()
    }
  }

  const Row = memo(({ rowIndex, style }) => {
    const index = rowIndex
    const item = allItems[index]
    const isFolder = item.type === 'folder'
    const isSelected = selectedIds?.has(item.id)

    const { handlers } = useInteraction({
      onOpen: () => {
        if (isFolder) {
          onFolderOpen?.(item)
        } else {
          setPreviewFile(item)
        }
      },
      onSelect: (e) => {
        if (isFolder) return
        if (toggleSelection) {
          const multi = e?.ctrlKey || e?.metaKey
          const range = e?.shiftKey
          toggleSelection(item.id, multi, range)
        }
      },
      selectionMode: selectedIds && selectedIds.size > 0
    })

    return (
      <div
        style={style}
        className={`flex items-center px-4 hover:bg-muted/20 border-b border-white/5 transition-colors cursor-pointer select-none ${isSelected ? 'bg-primary/10 dark:bg-primary/15' : ''}`}
        {...handlers}
      >
        {/* Checkbox */}
        <div className="w-[40px] shrink-0 flex items-center justify-center">
          {!isFolder && (
            <button
              className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all duration-150 
                ${isSelected
                  ? 'bg-primary border-primary'
                  : 'border-gray-400 dark:border-gray-600 hover:border-primary'
                }`}
              onClick={(e) => {
                e.stopPropagation()
                if (toggleSelection) {
                  toggleSelection(item.id, e.ctrlKey || e.metaKey, e.shiftKey)
                }
              }}
            >
              {isSelected && <CheckCircle2 className="w-3.5 h-3.5 text-white" />}
            </button>
          )}
        </div>

        {/* Icon */}
        <div className="w-[40px] shrink-0 flex items-center justify-start text-muted-foreground">
          {isFolder ? (
            <Folder className="w-5 h-5 text-blue-500 dark:text-blue-400 fill-blue-500/20" />
          ) : (
            getFileIcon(item.contentType)
          )}
        </div>

        {/* Name */}
        <div className="flex-1 min-w-0 pr-4 font-medium truncate text-foreground/90">
          {isFolder ? item.name : item.filename}
        </div>

        {/* Size */}
        <div className="w-[100px] shrink-0 text-sm text-muted-foreground hidden sm:block">
          {isFolder ? '—' : formatFileSize(item.size)}
        </div>

        {/* Modified */}
        <div className="w-[140px] shrink-0 text-sm text-muted-foreground hidden md:block">
          {item.createdAt && formatDistanceToNow(item.createdAt.toDate(), { addSuffix: true })}
        </div>

        {/* Actions */}
        <div className="w-[50px] shrink-0 flex items-center justify-end">
          <FileActions
            file={item}
            type={item.type}
            onPreview={() => setPreviewFile(item)}
            onRefresh={onRefresh}
          />
        </div>
      </div>
    )
  })
  Row.displayName = 'Row'

  return (
    <>
      <Card className="h-full border-0 bg-transparent shadow-none flex flex-col">
        {/* Header */}
        <div className="flex items-center px-4 h-12 border-b border-white/10 bg-muted/5 text-xs font-semibold uppercase text-muted-foreground tracking-wider select-none">
          {/* Select All Checkbox */}
          <div className="w-[40px] shrink-0 flex items-center justify-center">
            <button
              onClick={handleSelectAllToggle}
              className="w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all duration-150 hover:border-primary"
              title={isAllSelected ? 'Deselect all' : 'Select all'}
              style={{
                borderColor: isAllSelected ? 'var(--primary)' : isSomeSelected ? 'var(--primary)' : undefined,
                backgroundColor: isAllSelected ? 'var(--primary)' : isSomeSelected ? 'var(--primary)' : undefined,
                opacity: isAllSelected || isSomeSelected ? 1 : 0.5,
              }}
            >
              {isAllSelected ? (
                <CheckCircle2 className="w-3.5 h-3.5 text-white" />
              ) : isSomeSelected ? (
                <div className="w-2 h-0.5 bg-white rounded" />
              ) : null}
            </button>
          </div>
          <div className="w-[40px] shrink-0" />
          <div className="flex-1 min-w-0">
            <Button
              variant="ghost"
              onClick={() => handleSort('name')}
              className="h-auto p-0 font-semibold hover:bg-transparent text-xs uppercase hover:text-foreground"
            >
              Name <ArrowUpDown className="ml-2 h-3 w-3" />
            </Button>
          </div>
          <div className="w-[100px] shrink-0 hidden sm:block">
            <Button
              variant="ghost"
              onClick={() => handleSort('size')}
              className="h-auto p-0 font-semibold hover:bg-transparent text-xs uppercase hover:text-foreground"
            >
              Size <ArrowUpDown className="ml-2 h-3 w-3" />
            </Button>
          </div>
          <div className="w-[140px] shrink-0 hidden md:block">
            <Button
              variant="ghost"
              onClick={() => handleSort('modified')}
              className="h-auto p-0 font-semibold hover:bg-transparent text-xs uppercase hover:text-foreground"
            >
              Modified <ArrowUpDown className="ml-2 h-3 w-3" />
            </Button>
          </div>
          <div className="w-[50px] shrink-0" />
        </div>

        {/* List */}
        <div className="flex-1">
          <AutoSizer
            renderProp={({ height, width }) => {
              if (!height || !width || isNaN(height) || isNaN(width)) return null;
              return (
                // @ts-ignore
                <Grid
                  style={{ height, width }}
                  columnCount={1}
                  columnWidth={width}
                  rowCount={allItems.length}
                  rowHeight={56}
                  cellComponent={Row}
                  cellProps={{}}
                  className="no-scrollbar"
                  onCellsRendered={({ rowStopIndex }) => {
                    if (hasMore && !isLoadingMore && onLoadMore) {
                      if (rowStopIndex >= allItems.length - 5) {
                        onLoadMore()
                      }
                    }
                  }}
                />
              )
            }}
          />
        </div>

        {allItems.length === 0 && (
          <div className="flex-1 flex items-center justify-center text-muted-foreground">
            No files or folders found
          </div>
        )}
      </Card>

      {/* Universal File Preview */}
      <FilePreviewModal
        isOpen={!!previewFile}
        onClose={() => setPreviewFile(null)}
        file={previewFile}
        allFiles={files}
        onNavigate={(f) => setPreviewFile(f)}
        onDelete={previewFile ? async () => {
          try {
            const { firestoreService } = await import('@/services/firestoreService')
            await firestoreService.softDeleteFile(previewFile.id)
            setPreviewFile(null)
            window.dispatchEvent(new CustomEvent('quota:update'))
            if (onRefresh) onRefresh()
          } catch (e) {
            console.error(e)
          }
        } : undefined}
      />
    </>
  )
}

function FileActions({ file, type, onPreview, onRefresh }) {
  const { showSuccess, showError, showLoading } = useNotification()
  const { downloadFile, isDownloading } = useDownload()

  const handleDownload = async () => {
    if (file.downloadURL) {
      await downloadFile(file.downloadURL, {
        filename: file.filename || file.name,
        contentType: file.contentType
      })
      void usageService.trackBandwidth(file.size)
    }
  }
  const handlePreview = () => {
    if (onPreview) {
      onPreview()
    } else if (file.downloadURL) {
      window.open(file.downloadURL, '_blank')
    }
  }

  const handleDelete = async () => {
    if (!confirm(`Move "${file.name || file.filename}" to Recycle Bin?`)) return;

    const toastId = showLoading("Moving to trash...");

    try {
      const { firestoreService } = await import('@/services/firestoreService');
      if (type === 'folder') {
        await firestoreService.softDeleteFolder(file.id);
      } else {
        await firestoreService.softDeleteFile(file.id);
      }

      window.dispatchEvent(new CustomEvent('quota:update'));
      showSuccess("Item moved to trash", null, { toastId })
      if (onRefresh) onRefresh()
    } catch (error) {
      console.error("Delete failed", error);
      showError("Failed to delete item", null, { toastId });
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 hover:bg-muted/50"
          onClick={(e) => e.stopPropagation()}
        >
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="glass-card">
        {type === 'file' && (
          <>
            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handlePreview() }}>
              <Eye className="mr-2 h-4 w-4" /> Preview
            </DropdownMenuItem>
            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleDownload() }}>
              <Download className="mr-2 h-4 w-4" /> Download
            </DropdownMenuItem>
          </>
        )}
        <DropdownMenuItem>
          <Edit3 className="mr-2 h-4 w-4" /> Rename
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={(e) => { e.stopPropagation(); handleDelete() }}
          className="text-red-600 dark:text-red-400 focus:bg-red-50 dark:focus:bg-red-900/10"
        >
          <Trash2 className="mr-2 h-4 w-4" /> Delete
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}