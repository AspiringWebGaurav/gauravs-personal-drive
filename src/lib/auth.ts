'use client'

import {
  signInWithPopup,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  updateProfile,
  type User as FirebaseUser
} from 'firebase/auth'
import { doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore'
import { auth, googleProvider, firestore } from './firebaseClient'
import type { User } from '@/types'
import { logger } from '@/lib/logger'

// Auth state management
export const signInWithGoogle = async () => {
  try {
    logger.auth('Starting Google sign-in...')
    const signInStartTime = Date.now()
    const result = await signInWithPopup(auth, googleProvider)
    const user = result.user
    logger.auth('Google sign-in successful for user:', user.email, 'in', Date.now() - signInStartTime, 'ms')

    // Create or update user document in Firestore
    logger.auth('Creating/updating user document in Firestore...')
    const userDocRef = doc(firestore, 'users', user.uid)
    const userDoc = await getDoc(userDocRef)
    logger.auth('User document exists:', userDoc.exists())

    const userData: User = {
      uid: user.uid,
      email: user.email,
      displayName: user.displayName,
      photoURL: user.photoURL,
      emailVerified: user.emailVerified,
      lastLoginAt: serverTimestamp() as any,
    }

    if (!userDoc.exists()) {
      logger.auth('First time user - creating documents...')
      // First time user - create user document and usage document
      await setDoc(userDocRef, {
        ...userData,
        createdAt: serverTimestamp(),
      })
      logger.auth('User document created')

      // Initialize usage document
      await setDoc(doc(firestore, 'usage', user.uid), {
        usedBytes: 0,
        limitBytes: 5 * 1024 * 1024 * 1024, // 5GB default
        fileCount: 0,
        folderCount: 0,
        lastUpdated: serverTimestamp(),
      })
      logger.auth('Usage document created')
    } else {
      logger.auth('Existing user - updating last login...')
      // Update last login time
      await setDoc(userDocRef, userData, { merge: true })
      logger.auth('User document updated')
    }

    return { success: true, user: result.user }
  } catch (error: any) {
    logger.error('Error signing in with Google:', error)
    logger.error('Error details:', {
      code: error.code,
      message: error.message,
      stack: error.stack
    })
    return { 
      success: false, 
      error: error.message || 'Failed to sign in with Google' 
    }
  }
}

export const signOut = async () => {
  try {
    await firebaseSignOut(auth)
    return { success: true }
  } catch (error: any) {
    logger.error('Error signing out:', error)
    return { 
      success: false, 
      error: error.message || 'Failed to sign out' 
    }
  }
}

// Auth state listener
export const onAuthStateChange = (callback: (user: FirebaseUser | null) => void) => {
  logger.auth('Setting up auth state change listener')
  return onAuthStateChanged(auth, (user) => {
    logger.auth('Auth state changed:', user ? `User: ${user.email}` : 'No user')
    callback(user)
  })
}

// Get current user
export const getCurrentUser = () => {
  return auth.currentUser
}

// Get auth token
export const getAuthToken = async () => {
  try {
    const user = getCurrentUser()
    if (!user) return null
    
    const token = await user.getIdToken()
    return token
  } catch (error) {
    logger.error('Error getting auth token:', error)
    return null
  }
}

// Check if user is authenticated
export const isAuthenticated = () => {
  return !!getCurrentUser()
}

// User profile helpers
export const updateUserProfile = async (updates: { displayName?: string; photoURL?: string }) => {
  try {
    const user = getCurrentUser()
    if (!user) throw new Error('No authenticated user')

    // Update Firebase Auth profile
    await updateProfile(user, updates)

    // Update Firestore document
    const userDocRef = doc(firestore, 'users', user.uid)
    await setDoc(userDocRef, {
      ...updates,
      lastLoginAt: serverTimestamp(),
    }, { merge: true })

    return { success: true }
  } catch (error: any) {
    logger.error('Error updating profile:', error)
    return {
      success: false,
      error: error.message || 'Failed to update profile'
    }
  }
}

// Delete user account
export const deleteUserAccount = async () => {
  try {
    const user = getCurrentUser()
    if (!user) throw new Error('No authenticated user')

    // Note: In a production app, you'd want to delete all user data from Firestore
    // and Storage before deleting the auth account. This would typically be done
    // via a Cloud Function triggered by auth user deletion.
    
    await user.delete()
    return { success: true }
  } catch (error: any) {
    logger.error('Error deleting account:', error)
    return { 
      success: false, 
      error: error.message || 'Failed to delete account' 
    }
  }
}

// Utility to format user display name
export const getUserDisplayName = (user: FirebaseUser | null): string => {
  if (!user) return 'Anonymous'
  return user.displayName || user.email?.split('@')[0] || 'User'
}

// Utility to get user initials for avatar
export const getUserInitials = (user: FirebaseUser | null): string => {
  if (!user) return 'A'
  
  if (user.displayName) {
    const names = user.displayName.split(' ')
    return names.map(name => name.charAt(0)).join('').toUpperCase().slice(0, 2)
  }
  
  if (user.email) {
    return user.email.charAt(0).toUpperCase()
  }
  
  return 'U'
}

// Auth error messages
export const getAuthErrorMessage = (errorCode: string): string => {
  switch (errorCode) {
    case 'auth/user-disabled':
      return 'This account has been disabled.'
    case 'auth/user-not-found':
      return 'No account found with this email.'
    case 'auth/wrong-password':
      return 'Incorrect password.'
    case 'auth/email-already-in-use':
      return 'An account with this email already exists.'
    case 'auth/weak-password':
      return 'Password is too weak.'
    case 'auth/operation-not-allowed':
      return 'This sign-in method is not allowed.'
    case 'auth/popup-closed-by-user':
      return 'Sign-in popup was closed before completing.'
    case 'auth/cancelled-popup-request':
      return 'Only one popup request is allowed at a time.'
    case 'auth/popup-blocked':
      return 'Sign-in popup was blocked by the browser.'
    default:
      return 'An unexpected error occurred. Please try again.'
  }
}