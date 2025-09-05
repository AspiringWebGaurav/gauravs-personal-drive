import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  collection,
  query,
  where,
  orderBy,
  limit,
  getDocs,
  addDoc,
  Timestamp,
  increment
} from 'firebase/firestore';
import { db } from './config';

// Collection references
export const collections = {
  files: 'files',
  shares: 'shares',
  settings: 'settings',
  usage: 'usage'
};

// File document operations
export const createFileDoc = async (fileData: any) => {
  try {
    const docRef = await addDoc(collection(db, collections.files), {
      ...fileData,
      createdAt: Timestamp.now()
    });
    return { id: docRef.id, error: null };
  } catch (error: any) {
    return { id: null, error: error.message };
  }
};

export const getFileDoc = async (fileId: string) => {
  try {
    const docRef = doc(db, collections.files, fileId);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      return { data: { id: docSnap.id, ...docSnap.data() }, error: null };
    } else {
      return { data: null, error: 'File not found' };
    }
  } catch (error: any) {
    return { data: null, error: error.message };
  }
};

export const getUserFiles = async (uid: string, isSecret?: boolean) => {
  console.log(`🔍 getUserFiles called - uid: ${uid}, isSecret: ${isSecret}`);
  
  try {
    let q;
    let files: any[] = [];
    
    // Try optimized query with indexes first
    if (typeof isSecret === 'boolean') {
      console.log(`📋 Attempting compound query with isSecret filter`);
      try {
        q = query(
          collection(db, collections.files),
          where('ownerUid', '==', uid),
          where('isSecret', '==', isSecret),
          orderBy('createdAt', 'desc')
        );
        
        const querySnapshot = await getDocs(q);
        files = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        
        console.log(`✅ Compound query succeeded - found ${files.length} files`);
        return { files, error: null };
        
      } catch (compoundError: any) {
        console.warn(`⚠️ Compound query failed: ${compoundError.message}`);
        
        // Check if it's an index error
        if (compoundError.message.includes('index') ||
            compoundError.message.includes('composite') ||
            compoundError.code === 'failed-precondition') {
          console.log(`📝 Index missing, falling back to client-side filtering`);
          
          // Fallback: Get all user files then filter on client
          try {
            q = query(
              collection(db, collections.files),
              where('ownerUid', '==', uid),
              orderBy('createdAt', 'desc')
            );
            
            const fallbackSnapshot = await getDocs(q);
            const allFiles = fallbackSnapshot.docs.map(doc => ({
              id: doc.id,
              ...doc.data()
            }));
            
            // Filter on client side
            files = allFiles.filter((file: any) => file.isSecret === isSecret);
            console.log(`✅ Fallback query succeeded - filtered to ${files.length} files`);
            return { files, error: null };
            
          } catch (fallbackError: any) {
            console.error(`❌ Fallback query also failed: ${fallbackError.message}`);
            throw fallbackError;
          }
        } else {
          throw compoundError;
        }
      }
    } else {
      // Simple query without isSecret filter
      console.log(`📋 Attempting simple query without isSecret filter`);
      q = query(
        collection(db, collections.files),
        where('ownerUid', '==', uid),
        orderBy('createdAt', 'desc')
      );
      
      const querySnapshot = await getDocs(q);
      files = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      console.log(`✅ Simple query succeeded - found ${files.length} files`);
      return { files, error: null };
    }
    
  } catch (error: any) {
    console.error(`❌ getUserFiles failed completely:`, error);
    console.error(`Error code: ${error.code}, message: ${error.message}`);
    return { files: [], error: error.message };
  }
};

export const deleteFileDoc = async (fileId: string) => {
  try {
    await deleteDoc(doc(db, collections.files, fileId));
    return { error: null };
  } catch (error: any) {
    return { error: error.message };
  }
};

export const getFileById = async (fileId: string) => {
  try {
    const docRef = doc(db, collections.files, fileId);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      return { data: { id: docSnap.id, ...docSnap.data() }, error: null };
    } else {
      return { data: null, error: 'File not found' };
    }
  } catch (error: any) {
    return { data: null, error: error.message };
  }
};

// Share document operations
export const createShareDoc = async (shareData: any) => {
  try {
    const docRef = await addDoc(collection(db, collections.shares), {
      ...shareData,
      createdAt: Timestamp.now(),
      downloadCount: 0
    });
    return { id: docRef.id, error: null };
  } catch (error: any) {
    return { id: null, error: error.message };
  }
};

export const getShareDoc = async (token: string) => {
  try {
    const q = query(
      collection(db, collections.shares),
      where('token', '==', token),
      limit(1)
    );
    const querySnapshot = await getDocs(q);
    
    if (!querySnapshot.empty) {
      const doc = querySnapshot.docs[0];
      return { data: { id: doc.id, ...doc.data() }, error: null };
    } else {
      return { data: null, error: 'Share link not found' };
    }
  } catch (error: any) {
    return { data: null, error: error.message };
  }
};

export const incrementDownloadCount = async (shareId: string) => {
  try {
    const docRef = doc(db, collections.shares, shareId);
    await updateDoc(docRef, {
      downloadCount: increment(1),
      lastDownload: Timestamp.now()
    });
    return { error: null };
  } catch (error: any) {
    return { error: error.message };
  }
};

// User settings operations
export const getUserSettings = async (uid: string) => {
  try {
    const docRef = doc(db, collections.settings, uid);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      return { data: docSnap.data(), error: null };
    } else {
      return { data: null, error: null }; // Settings don't exist yet
    }
  } catch (error: any) {
    return { data: null, error: error.message };
  }
};

export const updateUserSettings = async (uid: string, settings: any) => {
  try {
    const docRef = doc(db, collections.settings, uid);
    await setDoc(docRef, settings, { merge: true });
    return { error: null };
  } catch (error: any) {
    return { error: error.message };
  }
};

// Usage tracking operations
export const getUserUsage = async (uid: string) => {
  try {
    const docRef = doc(db, collections.usage, uid);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      return { data: docSnap.data(), error: null };
    } else {
      // Initialize usage tracking
      const initialUsage = {
        ownerUid: uid,
        storageBytesUsed: 0,
        downloadsToday: 0,
        uploadsMonth: 0,
        downloadsMonth: 0,
        readsToday: 0,
        writesToday: 0,
        hostingBandwidthToday: 0,
        lastUpdated: Timestamp.now(),
        lastDayReset: Timestamp.now(),
        lastMonthReset: Timestamp.now()
      };
      await setDoc(docRef, initialUsage);
      return { data: initialUsage, error: null };
    }
  } catch (error: any) {
    return { data: null, error: error.message };
  }
};

export const updateUsage = async (uid: string, updates: any) => {
  try {
    const docRef = doc(db, collections.usage, uid);
    await updateDoc(docRef, {
      ...updates,
      lastUpdated: Timestamp.now()
    });
    return { error: null };
  } catch (error: any) {
    return { error: error.message };
  }
};

// Update file document (for rename, move, etc.)
export const updateFileDoc = async (fileId: string, updates: any) => {
  try {
    const docRef = doc(db, collections.files, fileId);
    await updateDoc(docRef, {
      ...updates,
      updatedAt: Timestamp.now()
    });
    return { error: null };
  } catch (error: any) {
    return { error: error.message };
  }
};

// Duplicate file document
export const duplicateFileDoc = async (sourceFile: any, newPath: string, newName: string) => {
  try {
    const duplicateData = {
      ...sourceFile,
      path: newPath,
      name: newName,
      createdAt: Timestamp.now()
    };
    
    // Remove the ID as we want a new document
    delete duplicateData.id;
    
    const docRef = await addDoc(collection(db, collections.files), duplicateData);
    return { id: docRef.id, error: null };
  } catch (error: any) {
    return { id: null, error: error.message };
  }
};

// Bulk delete file documents
export const bulkDeleteFileDocs = async (fileIds: string[]) => {
  const results: Array<{ id: string; success: boolean; error?: string }> = [];
  
  for (const fileId of fileIds) {
    try {
      await deleteDoc(doc(db, collections.files, fileId));
      results.push({ id: fileId, success: true });
    } catch (error: any) {
      results.push({ id: fileId, success: false, error: error.message });
    }
  }
  
  const successCount = results.filter(r => r.success).length;
  const failureCount = results.length - successCount;
  
  return { results, successCount, failureCount };
};

// Search files by name
export const searchUserFiles = async (uid: string, searchTerm: string, isSecret?: boolean) => {
  try {
    let q;
    
    if (typeof isSecret === 'boolean') {
      q = query(
        collection(db, collections.files),
        where('ownerUid', '==', uid),
        where('isSecret', '==', isSecret),
        orderBy('createdAt', 'desc')
      );
    } else {
      q = query(
        collection(db, collections.files),
        where('ownerUid', '==', uid),
        orderBy('createdAt', 'desc')
      );
    }
    
    const querySnapshot = await getDocs(q);
    const allFiles = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    
    // Filter by search term on client side (Firestore doesn't support full-text search)
    const filteredFiles = allFiles.filter((file: any) =>
      file.name.toLowerCase().includes(searchTerm.toLowerCase())
    );
    
    return { files: filteredFiles, error: null };
  } catch (error: any) {
    return { files: [], error: error.message };
  }
};

// Get files by type
export const getFilesByType = async (uid: string, fileType: string, isSecret?: boolean) => {
  try {
    let q;
    
    if (typeof isSecret === 'boolean') {
      q = query(
        collection(db, collections.files),
        where('ownerUid', '==', uid),
        where('isSecret', '==', isSecret),
        orderBy('createdAt', 'desc')
      );
    } else {
      q = query(
        collection(db, collections.files),
        where('ownerUid', '==', uid),
        orderBy('createdAt', 'desc')
      );
    }
    
    const querySnapshot = await getDocs(q);
    const allFiles = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    
    // Filter by file type on client side
    const filteredFiles = allFiles.filter((file: any) =>
      file.type.startsWith(fileType)
    );
    
    return { files: filteredFiles, error: null };
  } catch (error: any) {
    return { files: [], error: error.message };
  }
};