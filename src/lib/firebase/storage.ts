import {
  ref,
  uploadBytesResumable,
  getDownloadURL,
  deleteObject,
  getMetadata,
  UploadTask
} from 'firebase/storage';
import { storage } from './config';

export const createStorageRef = (path: string) => {
  return ref(storage, path);
};

export const uploadFile = (
  file: File,
  path: string,
  onProgress?: (progress: number) => void,
  onError?: (error: string) => void,
  onComplete?: (downloadURL: string) => void
): UploadTask => {
  const storageRef = createStorageRef(path);
  const uploadTask = uploadBytesResumable(storageRef, file);

  uploadTask.on('state_changed',
    (snapshot) => {
      const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
      onProgress?.(progress);
    },
    (error) => {
      onError?.(error.message);
    },
    () => {
      getDownloadURL(uploadTask.snapshot.ref).then((downloadURL) => {
        onComplete?.(downloadURL);
      });
    }
  );

  return uploadTask;
};

export const deleteFile = async (path: string) => {
  try {
    const storageRef = createStorageRef(path);
    await deleteObject(storageRef);
    return { error: null };
  } catch (error: any) {
    return { error: error.message };
  }
};

export const getFileMetadata = async (path: string) => {
  try {
    const storageRef = createStorageRef(path);
    const metadata = await getMetadata(storageRef);
    return { metadata, error: null };
  } catch (error: any) {
    return { metadata: null, error: error.message };
  }
};

export const getFileDownloadURL = async (path: string) => {
  try {
    const storageRef = createStorageRef(path);
    const url = await getDownloadURL(storageRef);
    return { url, error: null };
  } catch (error: any) {
    return { url: null, error: error.message };
  }
};

// Helper to generate user file paths
export const getUserFilePath = (uid: string, filename: string, isSecret = false) => {
  const basePath = isSecret ? `users/${uid}/secret` : `users/${uid}/files`;
  return `${basePath}/${filename}`;
};

// Rename file in storage
export const renameFile = async (oldPath: string, newPath: string) => {
  try {
    const oldRef = createStorageRef(oldPath);
    const newRef = createStorageRef(newPath);
    
    // Get file metadata and download URL
    const { url: downloadURL, error: urlError } = await getFileDownloadURL(oldPath);
    if (urlError) {
      return { error: urlError };
    }
    
    // Fetch file data
    const response = await fetch(downloadURL!);
    if (!response.ok) {
      return { error: 'Failed to fetch file data for rename' };
    }
    
    const fileData = await response.blob();
    
    // Upload to new location
    const uploadTask = uploadBytesResumable(newRef, fileData);
    
    await new Promise<void>((resolve, reject) => {
      uploadTask.on('state_changed',
        null,
        (error) => reject(error),
        () => resolve()
      );
    });
    
    // Delete old file
    await deleteObject(oldRef);
    
    // Get new download URL
    const newDownloadURL = await getDownloadURL(newRef);
    
    return { newPath, downloadURL: newDownloadURL, error: null };
  } catch (error: any) {
    return { newPath: null, downloadURL: null, error: error.message };
  }
};

// Duplicate file in storage
export const duplicateFile = async (sourcePath: string, targetPath: string) => {
  try {
    const sourceRef = createStorageRef(sourcePath);
    const targetRef = createStorageRef(targetPath);
    
    // Get file download URL
    const { url: downloadURL, error: urlError } = await getFileDownloadURL(sourcePath);
    if (urlError) {
      return { error: urlError };
    }
    
    // Fetch file data
    const response = await fetch(downloadURL!);
    if (!response.ok) {
      return { error: 'Failed to fetch file data for duplication' };
    }
    
    const fileData = await response.blob();
    
    // Upload to target location
    const uploadTask = uploadBytesResumable(targetRef, fileData);
    
    await new Promise<void>((resolve, reject) => {
      uploadTask.on('state_changed',
        null,
        (error) => reject(error),
        () => resolve()
      );
    });
    
    // Get target download URL
    const targetDownloadURL = await getDownloadURL(targetRef);
    
    return { targetPath, downloadURL: targetDownloadURL, error: null };
  } catch (error: any) {
    return { targetPath: null, downloadURL: null, error: error.message };
  }
};

// Bulk delete files
export const bulkDeleteFiles = async (filePaths: string[]) => {
  const results: Array<{ path: string; success: boolean; error?: string }> = [];
  
  for (const path of filePaths) {
    try {
      await deleteObject(createStorageRef(path));
      results.push({ path, success: true });
    } catch (error: any) {
      results.push({ path, success: false, error: error.message });
    }
  }
  
  const successCount = results.filter(r => r.success).length;
  const failureCount = results.length - successCount;
  
  return { results, successCount, failureCount };
};

// Move file between vaults (regular <-> secret)
export const moveFileToVault = async (
  oldPath: string,
  uid: string,
  filename: string,
  toSecret: boolean
) => {
  const newPath = getUserFilePath(uid, filename, toSecret);
  return await renameFile(oldPath, newPath);
};