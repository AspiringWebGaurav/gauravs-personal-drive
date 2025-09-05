'use client';

import { useState } from 'react';
import { useFileSelection } from '@/contexts/FileSelectionContext';
import { FileDocument } from '@/types/files';
import { bulkDeleteFiles } from '@/lib/firebase/storage';
import { bulkDeleteFileDocs, updateUsage } from '@/lib/firebase/firestore';
import { useAuth } from '@/components/auth/AuthProvider';
import toast from 'react-hot-toast';
import {
  X,
  Trash2,
  Download,
  Move,
  CheckSquare,
  Square,
  Archive
} from 'lucide-react';

interface BulkOperationsToolbarProps {
  files: FileDocument[];
  onRefresh: () => void;
  isSecretMode: boolean;
}

export const BulkOperationsToolbar = ({ files, onRefresh, isSecretMode }: BulkOperationsToolbarProps) => {
  const { user } = useAuth();
  const {
    selectedFiles,
    isSelecting,
    selectedCount,
    selectAllFiles,
    clearSelection,
    setSelecting,
    getSelectedFiles
  } = useFileSelection();
  const [isProcessing, setIsProcessing] = useState(false);

  const selectedFileObjects = getSelectedFiles(files);

  const handleSelectAll = () => {
    if (selectedCount === files.length) {
      clearSelection();
    } else {
      selectAllFiles(files);
    }
  };

  const handleBulkDelete = async () => {
    if (selectedCount === 0) return;

    const confirmMessage = `Are you sure you want to delete ${selectedCount} file${selectedCount > 1 ? 's' : ''}? This action cannot be undone.`;
    if (!confirm(confirmMessage)) return;

    if (!user) return;

    setIsProcessing(true);
    
    try {
      const selectedFileObjects = getSelectedFiles(files);
      const filePaths = selectedFileObjects.map(file => file.path);
      const fileIds = selectedFileObjects.map(file => file.id);

      // Delete from storage
      const storageResult = await bulkDeleteFiles(filePaths);
      
      // Delete from Firestore
      const firestoreResult = await bulkDeleteFileDocs(fileIds);

      // Update usage tracking
      const totalSizeDeleted = selectedFileObjects.reduce((sum, file) => sum + file.size, 0);
      await updateUsage(user.uid, {
        storageBytesUsed: -totalSizeDeleted
      });

      const successCount = Math.min(storageResult.successCount, firestoreResult.successCount);
      const failureCount = selectedCount - successCount;

      if (successCount > 0) {
        toast.success(`Successfully deleted ${successCount} file${successCount > 1 ? 's' : ''}`);
      }
      
      if (failureCount > 0) {
        toast.error(`Failed to delete ${failureCount} file${failureCount > 1 ? 's' : ''}`);
      }

      clearSelection();
      onRefresh();
      
    } catch (error) {
      console.error('Bulk delete error:', error);
      toast.error('Failed to delete files');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleBulkDownload = async () => {
    if (selectedCount === 0) return;

    toast.promise(
      (async () => {
        // Create a simple implementation - download files individually
        // In a production app, you'd want to create a ZIP file
        for (const file of selectedFileObjects) {
          const downloadUrl = `/api/download?fileId=${file.id}`;
          const link = document.createElement('a');
          link.href = downloadUrl;
          link.download = file.name;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          
          // Small delay between downloads
          await new Promise(resolve => setTimeout(resolve, 500));
        }
      })(),
      {
        loading: `Downloading ${selectedCount} files...`,
        success: `Started download of ${selectedCount} files`,
        error: 'Failed to download files'
      }
    );
  };

  const handleBulkMove = async () => {
    if (selectedCount === 0) return;
    
    const targetVault = isSecretMode ? 'regular' : 'secret';
    const confirmMessage = `Move ${selectedCount} file${selectedCount > 1 ? 's' : ''} to ${targetVault} vault?`;
    
    if (!confirm(confirmMessage)) return;
    
    toast(`Moving files to ${targetVault} vault...`, { icon: '📦' });
    // This would implement the actual move logic
    // For now, just show a message
    toast.success(`Files will be moved to ${targetVault} vault (feature coming soon)`);
  };

  if (!isSelecting && selectedCount === 0) {
    return (
      <div className="flex items-center justify-between p-4 glass-card rounded-xl mb-6">
        <div className="flex items-center space-x-4">
          <h3 className="font-medium text-gray-900 dark:text-white">
            {files.length} file{files.length !== 1 ? 's' : ''}
          </h3>
        </div>
        
        <button
          onClick={() => setSelecting(true)}
          className="flex items-center space-x-2 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-white/10 rounded-lg transition-colors"
        >
          <CheckSquare className="w-4 h-4" />
          <span>Select</span>
        </button>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-between p-4 glass-card rounded-xl mb-6 bg-blue-50/50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800">
      <div className="flex items-center space-x-4">
        <button
          onClick={handleSelectAll}
          className="flex items-center space-x-2 text-sm font-medium text-blue-700 dark:text-blue-300 hover:text-blue-900 dark:hover:text-blue-100"
        >
          {selectedCount === files.length ? (
            <CheckSquare className="w-4 h-4" />
          ) : (
            <Square className="w-4 h-4" />
          )}
          <span>
            {selectedCount === files.length ? 'Deselect All' : 'Select All'}
          </span>
        </button>
        
        <div className="text-sm text-blue-600 dark:text-blue-400">
          {selectedCount} of {files.length} selected
        </div>
      </div>

      <div className="flex items-center space-x-2">
        <button
          onClick={handleBulkDownload}
          disabled={selectedCount === 0}
          className="flex items-center space-x-1 px-3 py-1.5 text-sm font-medium text-blue-700 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-800/50 rounded-lg transition-colors disabled:opacity-50"
        >
          <Download className="w-4 h-4" />
          <span>Download</span>
        </button>

        <button
          onClick={handleBulkMove}
          disabled={selectedCount === 0}
          className="flex items-center space-x-1 px-3 py-1.5 text-sm font-medium text-blue-700 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-800/50 rounded-lg transition-colors disabled:opacity-50"
        >
          <Move className="w-4 h-4" />
          <span>Move</span>
        </button>

        <button
          onClick={handleBulkDelete}
          disabled={selectedCount === 0 || isProcessing}
          className="flex items-center space-x-1 px-3 py-1.5 text-sm font-medium text-red-700 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-800/50 rounded-lg transition-colors disabled:opacity-50"
        >
          {isProcessing ? (
            <div className="w-4 h-4 border-2 border-red-600 border-t-transparent rounded-full animate-spin" />
          ) : (
            <Trash2 className="w-4 h-4" />
          )}
          <span>Delete</span>
        </button>

        <button
          onClick={clearSelection}
          className="p-1.5 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};