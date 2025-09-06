'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { 
  MoreHorizontal, 
  Download, 
  Edit3, 
  Trash2, 
  Eye,
  FileText,
  Image,
  Video,
  Music,
  Archive,
  FileIcon,
  Folder,
  ArrowUpDown
} from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'

export function FileTableView({ files, folders, onFolderOpen, currentFolder }) {
  const [sortField, setSortField] = useState('name')
  const [sortDirection, setSortDirection] = useState('asc')

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  const getFileIcon = (contentType) => {
    const iconClass = "w-4 h-4"
    if (contentType?.startsWith('image/')) return <Image className={iconClass} />
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
          if (type === 'folder') return 0 // Folders don't have size
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

  const FileActions = ({ file, type }) => {
    const handleDownload = () => {
      if (file.downloadURL) {
        window.open(file.downloadURL, '_blank')
      }
    }

    const handlePreview = () => {
      if (file.downloadURL) {
        window.open(file.downloadURL, '_blank')
      }
    }

    const handleRename = () => {
      console.log('Rename:', type, file.id)
    }

    const handleDelete = () => {
      console.log('Delete:', type, file.id)
    }

    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="glass-card">
          {type === 'file' && (
            <>
              <DropdownMenuItem onClick={handlePreview} className="cursor-pointer">
                <Eye className="mr-2 h-4 w-4" />
                Preview
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleDownload} className="cursor-pointer">
                <Download className="mr-2 h-4 w-4" />
                Download
              </DropdownMenuItem>
            </>
          )}
          <DropdownMenuItem onClick={handleRename} className="cursor-pointer">
            <Edit3 className="mr-2 h-4 w-4" />
            Rename
          </DropdownMenuItem>
          <DropdownMenuItem 
            onClick={handleDelete} 
            className="cursor-pointer text-red-600 dark:text-red-400"
          >
            <Trash2 className="mr-2 h-4 w-4" />
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    )
  }

  const sortedFolders = sortItems(folders, 'folder')
  const sortedFiles = sortItems(files, 'file')

  return (
    <Card className="glass-card">
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow className="border-white/10">
              <TableHead className="w-[50px]"></TableHead>
              <TableHead>
                <Button 
                  variant="ghost" 
                  onClick={() => handleSort('name')}
                  className="h-auto p-0 font-semibold hover:bg-transparent"
                >
                  Name
                  <ArrowUpDown className="ml-2 h-4 w-4" />
                </Button>
              </TableHead>
              <TableHead>
                <Button 
                  variant="ghost" 
                  onClick={() => handleSort('size')}
                  className="h-auto p-0 font-semibold hover:bg-transparent"
                >
                  Size
                  <ArrowUpDown className="ml-2 h-4 w-4" />
                </Button>
              </TableHead>
              <TableHead>
                <Button 
                  variant="ghost" 
                  onClick={() => handleSort('modified')}
                  className="h-auto p-0 font-semibold hover:bg-transparent"
                >
                  Modified
                  <ArrowUpDown className="ml-2 h-4 w-4" />
                </Button>
              </TableHead>
              <TableHead className="w-[50px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedFolders.map((folder) => (
              <TableRow 
                key={folder.id}
                className="cursor-pointer hover:bg-muted/20 border-white/5"
                onDoubleClick={() => onFolderOpen(folder)}
              >
                <TableCell>
                  <Folder className="w-4 h-4 text-blue-500 dark:text-blue-400" />
                </TableCell>
                <TableCell className="font-medium">{folder.name}</TableCell>
                <TableCell className="text-muted-foreground">—</TableCell>
                <TableCell className="text-muted-foreground">
                  {folder.createdAt && formatDistanceToNow(folder.createdAt.toDate(), { addSuffix: true })}
                </TableCell>
                <TableCell>
                  <FileActions file={folder} type="folder" />
                </TableCell>
              </TableRow>
            ))}
            {sortedFiles.map((file) => (
              <TableRow 
                key={file.id}
                className="cursor-pointer hover:bg-muted/20 border-white/5"
              >
                <TableCell>
                  <div className="text-muted-foreground">
                    {getFileIcon(file.contentType)}
                  </div>
                </TableCell>
                <TableCell className="font-medium">{file.filename}</TableCell>
                <TableCell className="text-muted-foreground">
                  {formatFileSize(file.size)}
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {file.createdAt && formatDistanceToNow(file.createdAt.toDate(), { addSuffix: true })}
                </TableCell>
                <TableCell>
                  <FileActions file={file} type="file" />
                </TableCell>
              </TableRow>
            ))}
            {sortedFolders.length === 0 && sortedFiles.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="h-32 text-center text-muted-foreground">
                  No files or folders found
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}