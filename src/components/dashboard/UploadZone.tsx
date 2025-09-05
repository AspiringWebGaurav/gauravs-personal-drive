'use client';

import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { useAuth } from '@/components/auth/AuthProvider';
import { uploadFile, getUserFilePath } from '@/lib/firebase/storage';
import { createFileDoc } from '@/lib/firebase/firestore';
import { canUpload, trackUpload } from '@/lib/usage/tracking';
import { generateFileHash, bufferToHex } from '@/lib/crypto/encryption';
import { getUserSettings } from '@/lib/firebase/firestore';
import { UsageStatus } from '@/types/usage';
import { UploadProgress } from '@/types/files';
import toast from 'react-hot-toast';
import { Upload, X, CheckCircle, AlertCircle } from 'lucide-react';

interface UploadZoneProps {
  isSecretMode: boolean;
  onFileUploaded: () => void;
  usage: UsageStatus | null;
}

export const UploadZone = ({ isSecretMode, onFileUploaded, usage }: UploadZoneProps) => {
  const { user } = useAuth();
  const [uploads, setUploads] = useState<UploadProgress[]>([]);
  const [isDragOver, setIsDragOver] = useState(false);

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    if (!user) return;

    // Check if files can be uploaded based on usage limits
    for (const file of acceptedFiles) {
      const canUploadResult = await canUpload(user.uid, file.size);
      if (!canUploadResult.allowed) {
        toast.error(`Cannot upload ${file.name}: ${canUploadResult.reason}`);
        return;
      }
    }

    // Add files to upload queue
    const newUploads: UploadProgress[] = acceptedFiles.map(file => ({
      file,
      progress: 0,
      status: 'uploading' as const
    }));

    setUploads(prev => [...prev, ...newUploads]);

    // Process uploads
    for (let i = 0; i < acceptedFiles.length; i++) {
      const file = acceptedFiles[i];
      await processUpload(file, i + uploads.length);
    }
  }, [user, uploads.length, isSecretMode]);

  const processUpload = async (file: File, uploadIndex: number) => {
    if (!user) return;

    try {
      // Always calculate file hash for integrity checking
      const buffer = await file.arrayBuffer();
      const fileHash = await generateFileHash(buffer);

      // Generate storage path
      const filename = `${Date.now()}_${file.name}`;
      const storagePath = getUserFilePath(user.uid, filename, isSecretMode);

      // Upload file with progress tracking
      const uploadTask = uploadFile(
        file,
        storagePath,
        (progress) => {
          updateUploadProgress(uploadIndex, progress);
        },
        (error) => {
          console.error('Upload error:', error);
          toast.error(`Failed to upload ${file.name}`);
          updateUploadStatus(uploadIndex, 'error', error);
        },
        async (downloadURL) => {
          console.log(`📤 Storage upload completed for ${file.name}, URL: ${downloadURL}`);
          
          try {
            // Create file document
            const fileDoc = {
              ownerUid: user.uid,
              path: storagePath,
              name: file.name,
              size: file.size,
              type: file.type,
              isSecret: isSecretMode,
              sha256: fileHash
            };

            console.log(`📝 Creating Firestore document for ${file.name}:`, fileDoc);
            
            const { id: docId, error: docError } = await createFileDoc(fileDoc);
            if (docError) {
              console.error(`❌ Firestore document creation failed for ${file.name}:`, docError);
              throw new Error(`Database error: ${docError}`);
            }
            
            console.log(`✅ Firestore document created successfully - ID: ${docId}`);

            // Track usage
            console.log(`📊 Tracking upload usage for ${file.name}`);
            await trackUpload(user.uid, file.size);

            updateUploadStatus(uploadIndex, 'completed');
            toast.success(`${file.name} uploaded successfully!`);
            
            // Verify file can be retrieved immediately
            console.log(`🔍 Verifying file retrieval immediately after upload`);
            setTimeout(async () => {
              try {
                // Trigger refresh and verify file appears
                console.log(`🔄 Triggering dashboard refresh for ${file.name}`);
                await onFileUploaded();
                
                // Additional verification: Try to fetch the specific file
                const { getUserFiles } = await import('@/lib/firebase/firestore');
                const { files: verifyFiles, error: verifyError } = await getUserFiles(user.uid, isSecretMode);
                
                if (verifyError) {
                  console.warn(`⚠️ File verification query failed: ${verifyError}`);
                } else {
                  const uploadedFile = verifyFiles.find(f => f.name === file.name && f.size === file.size);
                  if (uploadedFile) {
                    console.log(`✅ File verification successful - ${file.name} found in dashboard`);
                  } else {
                    console.warn(`⚠️ File verification failed - ${file.name} not found in dashboard query results`);
                    toast(`File uploaded but may need manual refresh`, { icon: '⚠️' });
                  }
                }
                
                removeUpload(uploadIndex);
              } catch (verifyError) {
                console.error(`❌ Upload verification failed:`, verifyError);
                removeUpload(uploadIndex);
              }
            }, 1000); // Reduced timeout for faster feedback

          } catch (error: any) {
            console.error(`❌ Error creating file document for ${file.name}:`, error);
            toast.error(`Failed to save ${file.name} metadata: ${error.message}`);
            updateUploadStatus(uploadIndex, 'error', `Failed to save metadata: ${error.message}`);
          }
        }
      );

    } catch (error) {
      console.error('Upload processing error:', error);
      toast.error(`Failed to process ${file.name}`);
      updateUploadStatus(uploadIndex, 'error', 'Processing failed');
    }
  };

  const updateUploadProgress = (index: number, progress: number) => {
    setUploads(prev => prev.map((upload, i) => 
      i === index ? { ...upload, progress } : upload
    ));
  };

  const updateUploadStatus = (index: number, status: UploadProgress['status'], error?: string) => {
    setUploads(prev => prev.map((upload, i) => 
      i === index ? { ...upload, status, error } : upload
    ));
  };

  const removeUpload = (index: number) => {
    setUploads(prev => prev.filter((_, i) => i !== index));
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    onDragEnter: () => setIsDragOver(true),
    onDragLeave: () => setIsDragOver(false),
    disabled: usage?.blocked.storage || usage?.blocked.monthlyUploads,
    maxSize: 100 * 1024 * 1024, // 100MB max file size
  });

  const isDisabled = usage?.blocked.storage || usage?.blocked.monthlyUploads;

  return (
    <div className="space-y-4">
      {/* Upload Zone */}
      <div
        {...getRootProps()}
        className={`
          relative border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all duration-200
          ${isDragActive || isDragOver
            ? 'border-blue-400 bg-blue-50/50 dark:bg-blue-900/20' 
            : 'border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500'
          }
          ${isDisabled ? 'opacity-50 cursor-not-allowed' : ''}
        `}
      >
        <input {...getInputProps()} />
        
        <div className="space-y-3">
          <div className="mx-auto w-12 h-12 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center">
            <Upload className="w-6 h-6 text-gray-600 dark:text-gray-400" />
          </div>
          
          <div>
            <p className="text-lg font-medium text-gray-900 dark:text-white">
              {isDragActive ? 'Drop files here...' : 'Upload files'}
            </p>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {isDisabled
                ? 'Upload disabled due to usage limits'
                : isSecretMode
                  ? 'Files will be encrypted and stored securely'
                  : 'Drag & drop files or click to browse'
              }
            </p>
          </div>

          {!isDisabled && (
            <div className="text-xs text-gray-500 dark:text-gray-400">
              Max file size: 100MB • All file types supported
            </div>
          )}
        </div>
      </div>

      {/* Upload Progress */}
      {uploads.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-gray-900 dark:text-white">
            Uploading {uploads.length} file{uploads.length > 1 ? 's' : ''}
          </h4>
          
          {uploads.map((upload, index) => (
            <div key={index} className="glass-card p-3">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center space-x-2 min-w-0">
                  {upload.status === 'completed' && (
                    <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0" />
                  )}
                  {upload.status === 'error' && (
                    <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0" />
                  )}
                  {upload.status === 'uploading' && (
                    <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin flex-shrink-0" />
                  )}
                  
                  <span className="text-sm font-medium text-gray-900 dark:text-white truncate">
                    {upload.file.name}
                  </span>
                </div>
                
                <button
                  onClick={() => removeUpload(index)}
                  className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              
              {upload.status === 'uploading' && (
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                  <div
                    className="bg-blue-600 h-2 rounded-full transition-all duration-200"
                    style={{ width: `${upload.progress}%` }}
                  />
                </div>
              )}
              
              {upload.status === 'error' && upload.error && (
                <p className="text-xs text-red-600 dark:text-red-400 mt-1">
                  {upload.error}
                </p>
              )}
              
              {upload.status === 'completed' && (
                <p className="text-xs text-green-600 dark:text-green-400 mt-1">
                  Upload completed successfully
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
