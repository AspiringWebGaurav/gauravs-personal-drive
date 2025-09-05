'use client';

import { useState, useEffect } from 'react';
import { FileDocument } from '@/types/files';
import { renameFile } from '@/lib/firebase/storage';
import { updateFileDoc } from '@/lib/firebase/firestore';
import { getUserFilePath } from '@/lib/firebase/storage';
import { useAuth } from '@/components/auth/AuthProvider';
import toast from 'react-hot-toast';
import { X, Edit2, AlertCircle } from 'lucide-react';

interface FileRenameDialogProps {
  file: FileDocument | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const FileRenameDialog = ({ file, isOpen, onClose, onSuccess }: FileRenameDialogProps) => {
  const { user } = useAuth();
  const [newName, setNewName] = useState('');
  const [isRenaming, setIsRenaming] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (file) {
      setNewName(file.name);
      setError('');
    }
  }, [file]);

  const handleRename = async () => {
    if (!file || !user || !newName.trim()) return;

    const trimmedName = newName.trim();
    if (trimmedName === file.name) {
      onClose();
      return;
    }

    // Basic validation
    if (trimmedName.length === 0) {
      setError('File name cannot be empty');
      return;
    }

    if (trimmedName.includes('/') || trimmedName.includes('\\')) {
      setError('File name cannot contain / or \\');
      return;
    }

    setIsRenaming(true);
    setError('');

    try {
      // Generate new file path
      const timestamp = Date.now();
      const newFileName = `${timestamp}_${trimmedName}`;
      const newPath = getUserFilePath(user.uid, newFileName, file.isSecret);

      // Rename in storage
      const { error: storageError } = await renameFile(file.path, newPath);
      if (storageError) {
        throw new Error(`Storage error: ${storageError}`);
      }

      // Update document in Firestore
      const { error: docError } = await updateFileDoc(file.id, {
        name: trimmedName,
        path: newPath
      });
      
      if (docError) {
        throw new Error(`Database error: ${docError}`);
      }

      toast.success(`File renamed to "${trimmedName}"`);
      onSuccess();
      onClose();
      
    } catch (error: any) {
      console.error('Rename error:', error);
      setError(error.message || 'Failed to rename file');
      toast.error('Failed to rename file');
    } finally {
      setIsRenaming(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !isRenaming) {
      handleRename();
    } else if (e.key === 'Escape') {
      onClose();
    }
  };

  if (!isOpen || !file) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="glass-card w-full max-w-md">
        <div className="flex items-center justify-between p-6 border-b border-white/10">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/20 rounded-full flex items-center justify-center">
              <Edit2 className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Rename File
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Enter a new name for this file
              </p>
            </div>
          </div>
          
          <button
            onClick={onClose}
            disabled={isRenaming}
            className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <div>
            <label htmlFor="fileName" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              File Name
            </label>
            <input
              id="fileName"
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={isRenaming}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
              placeholder="Enter file name"
              autoFocus
            />
          </div>

          {error && (
            <div className="flex items-center space-x-2 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
              <AlertCircle className="w-4 h-4 text-red-600 dark:text-red-400 flex-shrink-0" />
              <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
            </div>
          )}

          <div className="text-xs text-gray-500 dark:text-gray-400">
            <p>Original: {file.name}</p>
          </div>
        </div>

        <div className="flex items-center justify-end space-x-3 p-6 border-t border-white/10">
          <button
            onClick={onClose}
            disabled={isRenaming}
            className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleRename}
            disabled={isRenaming || !newName.trim() || newName.trim() === file.name}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-colors flex items-center space-x-2"
          >
            {isRenaming && (
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            )}
            <span>Rename</span>
          </button>
        </div>
      </div>
    </div>
  );
};