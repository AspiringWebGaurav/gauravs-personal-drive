'use client';

import { useState, useEffect } from 'react';
import { FileDocument } from '@/types/files';
import { formatBytes } from '@/lib/usage/tracking';
import { deleteFile } from '@/lib/firebase/storage';
import { deleteFileDoc } from '@/lib/firebase/firestore';
import { ShareDialog } from './ShareDialog';
import { FileRenameDialog } from './FileRenameDialog';
import { FilePropertiesDialog } from './FilePropertiesDialog';
import { BulkOperationsToolbar } from './BulkOperationsToolbar';
import { FileSearchAndFilter } from './FileSearchAndFilter';
import { useFileSelection } from '@/contexts/FileSelectionContext';
import toast from 'react-hot-toast';
import {
  File,
  Download,
  Share2,
  Trash2,
  Image,
  Video,
  Music,
  FileText,
  Archive,
  Lock,
  MoreHorizontal,
  Edit2,
  Info,
  Copy,
  Move,
  CheckSquare,
  Square,
  Search
} from 'lucide-react';

interface FileGridProps {
  files: FileDocument[];
  loading: boolean;
  isSecretMode: boolean;
  onFileDeleted: () => void;
  onRefresh: () => void;
}

export const FileGrid = ({ files, loading, isSecretMode, onFileDeleted, onRefresh }: FileGridProps) => {
  const [showActions, setShowActions] = useState<string | null>(null);
  const [shareFile, setShareFile] = useState<FileDocument | null>(null);
  const [renameFile, setRenameFile] = useState<FileDocument | null>(null);
  const [propertiesFile, setPropertiesFile] = useState<FileDocument | null>(null);
  const [filteredFiles, setFilteredFiles] = useState<FileDocument[]>(files);
  const {
    selectedFiles,
    isSelecting,
    toggleFileSelection,
    clearSelection,
    setSelecting
  } = useFileSelection();

  // Update filtered files when files change
  useEffect(() => {
    setFilteredFiles(files);
  }, [files]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return; // Don't trigger shortcuts when typing in inputs
      }

      switch (e.key) {
        case 'Escape':
          clearSelection();
          setShowActions(null);
          break;
        case 'a':
        case 'A':
          if (e.ctrlKey || e.metaKey) {
            e.preventDefault();
            setSelecting(true);
          }
          break;
        case 'Delete':
          if (selectedFiles.size > 0) {
            // Handle bulk delete
            console.log('Bulk delete triggered');
          }
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedFiles, clearSelection, setSelecting]);

  const getFileIcon = (fileType: string) => {
    if (fileType.startsWith('image/')) return Image;
    if (fileType.startsWith('video/')) return Video;
    if (fileType.startsWith('audio/')) return Music;
    if (fileType.includes('document') || fileType.includes('text') || fileType.includes('pdf')) return FileText;
    if (fileType.includes('zip') || fileType.includes('tar') || fileType.includes('rar')) return Archive;
    return File;
  };

  const getFileIconColor = (fileType: string) => {
    if (fileType.startsWith('image/')) return 'text-green-600 bg-green-100 dark:text-green-400 dark:bg-green-900/20';
    if (fileType.startsWith('video/')) return 'text-red-600 bg-red-100 dark:text-red-400 dark:bg-red-900/20';
    if (fileType.startsWith('audio/')) return 'text-purple-600 bg-purple-100 dark:text-purple-400 dark:bg-purple-900/20';
    if (fileType.includes('document') || fileType.includes('text') || fileType.includes('pdf')) return 'text-blue-600 bg-blue-100 dark:text-blue-400 dark:bg-blue-900/20';
    if (fileType.includes('zip') || fileType.includes('tar') || fileType.includes('rar')) return 'text-yellow-600 bg-yellow-100 dark:text-yellow-400 dark:bg-yellow-900/20';
    return 'text-gray-600 bg-gray-100 dark:text-gray-400 dark:bg-gray-800';
  };

  const formatDate = (timestamp: any) => {
    const date = timestamp?.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const handleDownload = async (file: FileDocument) => {
    try {
      // Create download link through our API
      const downloadUrl = `/api/download?fileId=${file.id}`;
      
      // Create temporary link and trigger download
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = file.name;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      toast.success('Download started');
    } catch (error) {
      console.error('Download error:', error);
      toast.error('Failed to download file');
    }
  };

  const handleShare = (file: FileDocument) => {
    setShareFile(file);
  };

  const handleRename = (file: FileDocument) => {
    setRenameFile(file);
  };

  const handleProperties = (file: FileDocument) => {
    setPropertiesFile(file);
  };

  const handleFileClick = (file: FileDocument, e: React.MouseEvent) => {
    if (isSelecting) {
      e.preventDefault();
      toggleFileSelection(file.id);
    }
  };

  const handleCheckboxChange = (file: FileDocument, e: React.MouseEvent) => {
    e.stopPropagation();
    toggleFileSelection(file.id);
    if (!isSelecting) {
      setSelecting(true);
    }
  };

  const handleDelete = async (file: FileDocument) => {
    if (!confirm(`Are you sure you want to delete "${file.name}"?`)) return;

    try {
      // Delete from storage
      const { error: storageError } = await deleteFile(file.path);
      if (storageError) {
        // If file doesn't exist in storage, that's okay - continue with document deletion
        if (!storageError.includes('object-not-found') && !storageError.includes('does not exist')) {
          throw new Error(storageError);
        }
        console.warn('File not found in storage, continuing with document deletion:', storageError);
      }

      // Delete document
      const { error: docError } = await deleteFileDoc(file.id);
      if (docError) {
        throw new Error(docError);
      }

      toast.success('File deleted successfully');
      onFileDeleted();
    } catch (error) {
      console.error('Delete error:', error);
      toast.error('Failed to delete file');
    }
  };

  if (loading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {[...Array(8)].map((_, i) => (
          <div key={i} className="glass-card p-4 animate-pulse">
            <div className="w-12 h-12 bg-gray-300 dark:bg-gray-600 rounded-xl mb-3" />
            <div className="h-4 bg-gray-300 dark:bg-gray-600 rounded mb-2" />
            <div className="h-3 bg-gray-300 dark:bg-gray-600 rounded w-2/3" />
          </div>
        ))}
      </div>
    );
  }

  if (files.length === 0) {
    return (
      <div>
        {/* Search and Filter */}
        <FileSearchAndFilter
          onFilesFiltered={setFilteredFiles}
          allFiles={files}
          isSecretMode={isSecretMode}
        />
        
        <div className="text-center py-12">
          <div className="mx-auto w-24 h-24 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mb-4">
            {isSecretMode ? (
              <Lock className="w-12 h-12 text-gray-400" />
            ) : (
              <File className="w-12 h-12 text-gray-400" />
            )}
          </div>
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
            {isSecretMode ? 'No secret files yet' : 'No files yet'}
          </h3>
          <p className="text-gray-600 dark:text-gray-400 max-w-sm mx-auto">
            {isSecretMode
              ? 'Upload files to your encrypted vault to keep them secure and private.'
              : 'Upload your first file to get started with your personal cloud storage.'}
          </p>
          <button
            onClick={() => {
              console.log('🔄 Manual refresh requested from empty state');
              onRefresh();
            }}
            className="mt-4 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-xl text-white bg-blue-600 hover:bg-blue-700 transition-colors"
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Refresh
          </button>
        </div>
      </div>
    );
  }

  if (filteredFiles.length === 0 && files.length > 0) {
    return (
      <div>
        {/* Search and Filter */}
        <FileSearchAndFilter
          onFilesFiltered={setFilteredFiles}
          allFiles={files}
          isSecretMode={isSecretMode}
        />
        
        <div className="text-center py-12">
          <div className="mx-auto w-24 h-24 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mb-4">
            <Search className="w-12 h-12 text-gray-400" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
            No files match your search
          </h3>
          <p className="text-gray-600 dark:text-gray-400 max-w-sm mx-auto">
            Try adjusting your search terms or filters to find what you're looking for.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Search and Filter */}
      <FileSearchAndFilter
        onFilesFiltered={setFilteredFiles}
        allFiles={files}
        isSecretMode={isSecretMode}
      />

      {/* Bulk Operations Toolbar */}
      <BulkOperationsToolbar
        files={filteredFiles}
        onRefresh={onRefresh}
        isSecretMode={isSecretMode}
      />

      {/* Files Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {filteredFiles.map((file) => {
          const IconComponent = getFileIcon(file.type);
          const iconColorClass = getFileIconColor(file.type);
          const isSelected = selectedFiles.has(file.id);
          
          return (
            <div
              key={file.id}
              className={`glass-card p-4 hover:shadow-lg transition-all group cursor-pointer ${
                isSelected ? 'ring-2 ring-blue-500 bg-blue-50/50 dark:bg-blue-900/20' : ''
              }`}
              onClick={(e) => handleFileClick(file, e)}
            >
              {/* File Icon and Selection Checkbox */}
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center space-x-3">
                  {/* Selection Checkbox */}
                  {(isSelecting || isSelected) && (
                    <button
                      onClick={(e) => handleCheckboxChange(file, e)}
                      className="flex-shrink-0 w-5 h-5 rounded border-2 border-blue-500 flex items-center justify-center transition-colors hover:bg-blue-50 dark:hover:bg-blue-900/20"
                    >
                      {isSelected ? (
                        <CheckSquare className="w-4 h-4 text-blue-600" />
                      ) : (
                        <Square className="w-4 h-4 text-blue-600" />
                      )}
                    </button>
                  )}
                  
                  {/* File Icon */}
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${iconColorClass}`}>
                    <IconComponent className="w-6 h-6" />
                  </div>
                </div>
                
                {/* Actions Menu */}
                <div className="flex items-center space-x-1">
                  <div className="relative">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowActions(showActions === file.id ? null : file.id);
                      }}
                      className="w-8 h-8 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <MoreHorizontal className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                    </button>
                    
                    {showActions === file.id && (
                      <>
                        <div
                          className="fixed inset-0 z-10"
                          onClick={() => setShowActions(null)}
                        />
                        <div className="absolute right-0 mt-1 w-48 glass-card shadow-xl z-20">
                          <div className="py-1">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDownload(file);
                                setShowActions(null);
                              }}
                              className="flex items-center w-full px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-white/10"
                            >
                              <Download className="w-4 h-4 mr-3" />
                              Download
                            </button>
                            
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleRename(file);
                                setShowActions(null);
                              }}
                              className="flex items-center w-full px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-white/10"
                            >
                              <Edit2 className="w-4 h-4 mr-3" />
                              Rename
                            </button>
                            
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleProperties(file);
                                setShowActions(null);
                              }}
                              className="flex items-center w-full px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-white/10"
                            >
                              <Info className="w-4 h-4 mr-3" />
                              Properties
                            </button>
                            
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleShare(file);
                                setShowActions(null);
                              }}
                              className="flex items-center w-full px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-white/10"
                            >
                              <Share2 className="w-4 h-4 mr-3" />
                              Share
                            </button>
                            
                            <div className="border-t border-white/10 my-1" />
                            
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDelete(file);
                                setShowActions(null);
                              }}
                              className="flex items-center w-full px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50/10"
                            >
                              <Trash2 className="w-4 h-4 mr-3" />
                              Delete
                            </button>
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>
              
              {/* File Details */}
              <div className="min-w-0">
                <h4 className="font-medium text-gray-900 dark:text-white truncate text-sm">
                  {file.name}
                </h4>
                <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                  {formatBytes(file.size)} • {formatDate(file.createdAt)}
                </p>
              </div>
              
              {/* Quick Actions */}
              <div className="flex items-center space-x-2 mt-3 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDownload(file);
                  }}
                  className="flex-1 px-3 py-1.5 text-xs font-medium text-gray-700 dark:text-gray-300 bg-white/50 dark:bg-gray-800/50 hover:bg-white/80 dark:hover:bg-gray-800/80 rounded-lg transition-colors"
                >
                  Download
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleShare(file);
                  }}
                  className="px-2 py-1.5 text-xs text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                >
                  <Share2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          );
        })}
      </div>
      
      {/* Dialogs */}
      {shareFile && (
        <ShareDialog
          file={shareFile}
          isOpen={!!shareFile}
          onClose={() => setShareFile(null)}
        />
      )}
      
      {renameFile && (
        <FileRenameDialog
          file={renameFile}
          isOpen={!!renameFile}
          onClose={() => setRenameFile(null)}
          onSuccess={onRefresh}
        />
      )}
      
      {propertiesFile && (
        <FilePropertiesDialog
          file={propertiesFile}
          isOpen={!!propertiesFile}
          onClose={() => setPropertiesFile(null)}
          onSuccess={onRefresh}
        />
      )}
    </div>
  );
};