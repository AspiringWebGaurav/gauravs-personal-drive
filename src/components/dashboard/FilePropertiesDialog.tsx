'use client';

import { useState, useEffect } from 'react';
import { FileDocument } from '@/types/files';
import { duplicateFile } from '@/lib/firebase/storage';
import { duplicateFileDoc, updateFileDoc } from '@/lib/firebase/firestore';
import { moveFileToVault } from '@/lib/firebase/storage';
import { formatBytes } from '@/lib/usage/tracking';
import { useAuth } from '@/components/auth/AuthProvider';
import toast from 'react-hot-toast';
import {
  X,
  Info,
  Calendar,
  HardDrive,
  FileType,
  Lock,
  Unlock,
  Copy,
  Move,
  Hash
} from 'lucide-react';

interface FilePropertiesDialogProps {
  file: FileDocument | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const FilePropertiesDialog = ({ file, isOpen, onClose, onSuccess }: FilePropertiesDialogProps) => {
  const { user } = useAuth();
  const [isProcessing, setIsProcessing] = useState(false);

  const formatDate = (timestamp: any) => {
    const date = timestamp?.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  const handleDuplicate = async () => {
    if (!file || !user) return;

    setIsProcessing(true);
    try {
      // Generate duplicate file name
      const nameWithoutExt = file.name.replace(/\.[^/.]+$/, '');
      const extension = file.name.includes('.') ? file.name.split('.').pop() : '';
      const duplicateName = `${nameWithoutExt} (Copy)${extension ? `.${extension}` : ''}`;
      
      // Generate new path
      const timestamp = Date.now();
      const newFileName = `${timestamp}_${duplicateName}`;
      const newPath = `users/${user.uid}/${file.isSecret ? 'secret' : 'files'}/${newFileName}`;

      // Duplicate in storage
      const { error: storageError } = await duplicateFile(file.path, newPath);
      if (storageError) {
        throw new Error(`Storage error: ${storageError}`);
      }

      // Create duplicate document
      const { error: docError } = await duplicateFileDoc(file, newPath, duplicateName);
      if (docError) {
        throw new Error(`Database error: ${docError}`);
      }

      toast.success(`File duplicated as "${duplicateName}"`);
      onSuccess();
      onClose();
      
    } catch (error: any) {
      console.error('Duplicate error:', error);
      toast.error('Failed to duplicate file');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleMoveToVault = async () => {
    if (!file || !user) return;

    const targetVault = file.isSecret ? 'regular' : 'secret';
    const confirmMessage = `Move this file to the ${targetVault} vault?`;
    
    if (!confirm(confirmMessage)) return;

    setIsProcessing(true);
    try {
      // Move in storage
      const { error: storageError } = await moveFileToVault(
        file.path,
        user.uid,
        file.name,
        !file.isSecret
      );
      
      if (storageError) {
        throw new Error(`Storage error: ${storageError}`);
      }

      // Update document
      const { error: docError } = await updateFileDoc(file.id, {
        isSecret: !file.isSecret,
        path: `users/${user.uid}/${!file.isSecret ? 'secret' : 'files'}/${file.name}`
      });
      
      if (docError) {
        throw new Error(`Database error: ${docError}`);
      }

      toast.success(`File moved to ${targetVault} vault`);
      onSuccess();
      onClose();
      
    } catch (error: any) {
      console.error('Move error:', error);
      toast.error('Failed to move file');
    } finally {
      setIsProcessing(false);
    }
  };

  if (!isOpen || !file) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="glass-card w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-white/10">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/20 rounded-full flex items-center justify-center">
              <Info className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                File Properties
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                View and manage file details
              </p>
            </div>
          </div>
          
          <button
            onClick={onClose}
            disabled={isProcessing}
            className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* File Name */}
          <div>
            <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-2 flex items-center space-x-2">
              <FileType className="w-4 h-4" />
              <span>File Name</span>
            </h4>
            <p className="text-sm text-gray-600 dark:text-gray-400 break-all">{file.name}</p>
          </div>

          {/* File Size */}
          <div>
            <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-2 flex items-center space-x-2">
              <HardDrive className="w-4 h-4" />
              <span>Size</span>
            </h4>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {formatBytes(file.size)} ({file.size.toLocaleString()} bytes)
            </p>
          </div>

          {/* File Type */}
          <div>
            <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-2">Type</h4>
            <p className="text-sm text-gray-600 dark:text-gray-400">{file.type || 'Unknown'}</p>
          </div>

          {/* Created Date */}
          <div>
            <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-2 flex items-center space-x-2">
              <Calendar className="w-4 h-4" />
              <span>Created</span>
            </h4>
            <p className="text-sm text-gray-600 dark:text-gray-400">{formatDate(file.createdAt)}</p>
          </div>

          {/* Vault Status */}
          <div>
            <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-2 flex items-center space-x-2">
              {file.isSecret ? <Lock className="w-4 h-4" /> : <Unlock className="w-4 h-4" />}
              <span>Vault</span>
            </h4>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {file.isSecret ? 'Secret Vault (Encrypted)' : 'Regular Storage'}
            </p>
          </div>

          {/* File Hash */}
          {file.sha256 && (
            <div>
              <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-2 flex items-center space-x-2">
                <Hash className="w-4 h-4" />
                <span>SHA-256</span>
              </h4>
              <p className="text-xs text-gray-600 dark:text-gray-400 font-mono break-all">
                {file.sha256}
              </p>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="border-t border-white/10 p-6">
          <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-4">Actions</h4>
          
          <div className="space-y-3">
            <button
              onClick={handleDuplicate}
              disabled={isProcessing}
              className="w-full flex items-center justify-between p-3 text-left hover:bg-white/5 rounded-lg transition-colors group"
            >
              <div className="flex items-center space-x-3">
                <Copy className="w-4 h-4 text-gray-600 dark:text-gray-400 group-hover:text-blue-600 dark:group-hover:text-blue-400" />
                <div>
                  <p className="text-sm font-medium text-gray-900 dark:text-white">Duplicate File</p>
                  <p className="text-xs text-gray-600 dark:text-gray-400">Create a copy of this file</p>
                </div>
              </div>
            </button>

            <button
              onClick={handleMoveToVault}
              disabled={isProcessing}
              className="w-full flex items-center justify-between p-3 text-left hover:bg-white/5 rounded-lg transition-colors group"
            >
              <div className="flex items-center space-x-3">
                <Move className="w-4 h-4 text-gray-600 dark:text-gray-400 group-hover:text-blue-600 dark:group-hover:text-blue-400" />
                <div>
                  <p className="text-sm font-medium text-gray-900 dark:text-white">
                    Move to {file.isSecret ? 'Regular' : 'Secret'} Vault
                  </p>
                  <p className="text-xs text-gray-600 dark:text-gray-400">
                    Transfer to {file.isSecret ? 'regular storage' : 'encrypted vault'}
                  </p>
                </div>
              </div>
            </button>
          </div>

          {isProcessing && (
            <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
              <div className="flex items-center space-x-2">
                <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                <p className="text-sm text-blue-600 dark:text-blue-400">Processing...</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};