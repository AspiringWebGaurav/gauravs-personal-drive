import { initializeApp, getApps, cert, type ServiceAccount } from 'firebase-admin/app'
import { getAuth } from 'firebase-admin/auth'
import { getFirestore } from 'firebase-admin/firestore'
import { getStorage } from 'firebase-admin/storage'

// Service account configuration
const serviceAccount: ServiceAccount = {
  projectId: process.env.FIREBASE_ADMIN_PROJECT_ID!,
  clientEmail: process.env.FIREBASE_ADMIN_CLIENT_EMAIL!,
  privateKey: process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, '\n')!,
}

// Initialize Firebase Admin SDK only if it hasn't been initialized already
const adminApp = getApps().find(app => app.name === 'admin') || 
  initializeApp(
    {
      credential: cert(serviceAccount),
      databaseURL: process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL!,
      storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET!,
    },
    'admin'
  )

// Initialize Admin services
export const adminAuth = getAuth(adminApp)
export const adminFirestore = getFirestore(adminApp)
export const adminStorage = getStorage(adminApp)

// Helper functions for server-side operations
export const verifyIdToken = async (token: string) => {
  try {
    const decodedToken = await adminAuth.verifyIdToken(token)
    return { success: true, uid: decodedToken.uid, user: decodedToken }
  } catch (error) {
    console.error('Error verifying ID token:', error)
    return { success: false, error: 'Invalid token' }
  }
}

export const createCustomToken = async (uid: string, additionalClaims?: object) => {
  try {
    const customToken = await adminAuth.createCustomToken(uid, additionalClaims)
    return { success: true, token: customToken }
  } catch (error) {
    console.error('Error creating custom token:', error)
    return { success: false, error: 'Failed to create token' }
  }
}

// Firestore helpers
export const getFilesByUserId = async (userId: string) => {
  try {
    const snapshot = await adminFirestore
      .collection('files')
      .where('userId', '==', userId)
      .orderBy('createdAt', 'desc')
      .get()
    
    const files = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }))
    
    return { success: true, files }
  } catch (error) {
    console.error('Error getting files:', error)
    return { success: false, error: 'Failed to get files' }
  }
}

export const getFoldersByUserId = async (userId: string, parentId: string | null = null) => {
  try {
    const snapshot = await adminFirestore
      .collection('folders')
      .where('userId', '==', userId)
      .where('parentId', '==', parentId)
      .orderBy('createdAt', 'desc')
      .get()
    
    const folders = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }))
    
    return { success: true, folders }
  } catch (error) {
    console.error('Error getting folders:', error)
    return { success: false, error: 'Failed to get folders' }
  }
}

export const getUserUsage = async (userId: string) => {
  try {
    const doc = await adminFirestore
      .collection('usage')
      .doc(userId)
      .get()
    
    if (!doc.exists) {
      // Create initial usage document
      const initialUsage = {
        usedBytes: 0,
        limitBytes: 5 * 1024 * 1024 * 1024, // 5GB
        fileCount: 0,
        folderCount: 0,
        lastUpdated: new Date()
      }
      
      await adminFirestore
        .collection('usage')
        .doc(userId)
        .set(initialUsage)
      
      return { success: true, usage: initialUsage }
    }
    
    return { success: true, usage: doc.data() }
  } catch (error) {
    console.error('Error getting user usage:', error)
    return { success: false, error: 'Failed to get usage data' }
  }
}

export const updateUserUsage = async (
  userId: string, 
  updates: Partial<{ usedBytes: number; fileCount: number; folderCount: number }>
) => {
  try {
    await adminFirestore
      .collection('usage')
      .doc(userId)
      .update({
        ...updates,
        lastUpdated: new Date()
      })
    
    return { success: true }
  } catch (error) {
    console.error('Error updating user usage:', error)
    return { success: false, error: 'Failed to update usage' }
  }
}

// Storage helpers
export const deleteFileFromStorage = async (filePath: string) => {
  try {
    await adminStorage.bucket().file(filePath).delete()
    return { success: true }
  } catch (error) {
    console.error('Error deleting file from storage:', error)
    return { success: false, error: 'Failed to delete file' }
  }
}

export const getSignedUrl = async (filePath: string, expiresIn: number = 3600000) => {
  try {
    const [url] = await adminStorage
      .bucket()
      .file(filePath)
      .getSignedUrl({
        action: 'read',
        expires: Date.now() + expiresIn
      })
    
    return { success: true, url }
  } catch (error) {
    console.error('Error getting signed URL:', error)
    return { success: false, error: 'Failed to get download URL' }
  }
}

export default adminApp