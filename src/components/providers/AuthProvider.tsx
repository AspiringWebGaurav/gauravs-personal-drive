'use client'

import React, { createContext, useContext, useEffect, useState } from 'react'
import { onAuthStateChange, getAuthToken, signOut } from '@/lib/auth'
import type { User } from 'firebase/auth'
import { useRouter } from 'next/navigation'
import { AuthErrorBoundary } from '@/components/ui/AuthErrorBoundary'
import { FirebaseErrorBoundary } from '@/components/ui/FirebaseErrorBoundary'
import { logger } from '@/lib/logger'

interface AuthContextType {
  user: User | null
  loading: boolean
  error: string | null
  signOut: () => Promise<void>
  refreshToken: () => Promise<string | null>
  clearError: () => void
  retryAuth: () => void
  isTokenReady: boolean
  getValidToken: () => Promise<string | null>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

interface AuthProviderProps {
  children: React.ReactNode
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [retryCount, setRetryCount] = useState(0)
  const [isTokenReady, setIsTokenReady] = useState(false)
  const router = useRouter()

  const clearError = () => setError(null)
  
  const retryAuth = () => {
    setRetryCount(prev => prev + 1)
    setError(null)
    setLoading(true)
  }

  // Helper function to get a valid authentication token
  const getValidToken = async (): Promise<string | null> => {
    try {
      const currentUser = user
      if (!currentUser) {
        logger.warn('No authenticated user for token retrieval')
        return null
      }
      
      const token = await currentUser.getIdToken(true) // Force refresh
      return token
    } catch (error) {
      logger.error('Error getting valid token:', error)
      return null
    }
  }

  useEffect(() => {
    const unsubscribe = onAuthStateChange(async (firebaseUser) => {
      logger.auth('Auth state change detected:', firebaseUser ? `User: ${firebaseUser.email}` : 'No user')
      
      // Keep loading state true until all operations complete
      setLoading(true)
      setError(null)
      setIsTokenReady(false)
      
      if (firebaseUser) {
        logger.auth('Setting up authentication for user:', firebaseUser.email)
        
        try {
          // Step 1: Get and verify the authentication token
          logger.auth('Step 1: Getting authentication token...')
          const tokenPromise = firebaseUser.getIdToken(true) // Force refresh
          const tokenTimeout = new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error('TOKEN_TIMEOUT')), 8000)
          )
          
          const token = await Promise.race([tokenPromise, tokenTimeout])
          logger.auth('Authentication token obtained successfully')
          
          // Step 2: Set up session cookie with timeout
          logger.auth('Step 2: Setting up session cookie...')
          const controller = new AbortController()
          const sessionTimeout = setTimeout(() => {
            logger.error('Session setup timeout')
            controller.abort()
          }, 10000)
          
          const response = await fetch('/api/auth/session', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ token }),
            signal: controller.signal,
          })
          
          clearTimeout(sessionTimeout)
          
          if (response.ok) {
            logger.auth('Session cookie set successfully')
            // Step 3: Verify token is ready for Firestore
            const verifyToken = await firebaseUser.getIdToken()
            if (verifyToken) {
              logger.auth('Token verified and ready for Firestore operations')
              setUser(firebaseUser)
              setIsTokenReady(true)
              setRetryCount(0)
            } else {
              throw new Error('TOKEN_VERIFICATION_FAILED')
            }
          } else {
            // Handle session setup errors
            const errorData = await response.json().catch(() => ({ error: 'Unknown error' }))
            logger.error('Session setup failed:', errorData)
            
            // Try token refresh for specific errors
            if (errorData.code === 'TOKEN_EXPIRED' || errorData.code === 'TOKEN_REVOKED') {
              logger.auth('Attempting token refresh...')
              const newToken = await firebaseUser.getIdToken(true)
              const retryResponse = await fetch('/api/auth/session', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ token: newToken }),
              })
              
              if (retryResponse.ok) {
                logger.auth('Token refresh successful')
                setUser(firebaseUser)
                setIsTokenReady(true)
                setError(null)
              } else {
                logger.error('Token refresh failed')
                setError('TOKEN_REFRESH_FAILED')
                // Still set user for Firebase operations
                setUser(firebaseUser)
                setIsTokenReady(true)
              }
            } else {
              setError('SESSION_ERROR')
              // Still set user for Firebase operations
              setUser(firebaseUser)
              setIsTokenReady(true)
            }
          }
        } catch (error: any) {
          logger.error('Authentication setup error:', error.message)
          
          // Categorize errors
          if (error.message === 'TOKEN_TIMEOUT') {
            setError('TIMEOUT')
          } else if (error.name === 'AbortError') {
            setError('TIMEOUT')
          } else if (error.message.includes('network')) {
            setError('NETWORK_ERROR')
          } else {
            setError('AUTH_SETUP_ERROR')
          }
          
          // Always set user for Firebase auth operations, even if session setup fails
          setUser(firebaseUser)
          setIsTokenReady(true) // Allow Firestore queries to proceed
        }
      } else {
        logger.auth('No authenticated user - clearing session')
        // Clear session cookie when user is not authenticated
        try {
          await fetch('/api/auth/session', { method: 'DELETE' })
        } catch (error) {
          logger.error('Error clearing session:', error)
        }
        setUser(null)
        setIsTokenReady(false)
      }
      
      // Always set loading to false after operations complete
      setLoading(false)
      logger.auth('Authentication flow completed')
    })

    return unsubscribe
  }, [retryCount])

  const handleSignOut = async () => {
    try {
      setLoading(true)
      
      // Clear session cookie first
      await fetch('/api/auth/session', { method: 'DELETE' })
      
      // Then sign out from Firebase
      await signOut()
      
      router.push('/login')
    } catch (error) {
      logger.error('Error signing out:', error)
    } finally {
      setLoading(false)
    }
  }

  const refreshToken = async () => {
    try {
      return await getAuthToken()
    } catch (error) {
      logger.error('Error refreshing token:', error)
      return null
    }
  }

  const value: AuthContextType = {
    user,
    loading,
    error,
    signOut: handleSignOut,
    refreshToken,
    clearError,
    retryAuth,
    isTokenReady,
    getValidToken,
  }

  return (
    <FirebaseErrorBoundary
      onError={(error, errorInfo) => {
        logger.critical('Firebase Error in AuthProvider:', error, errorInfo)
        // Clear auth state on critical errors
        if (error.message.includes('permission-denied') || error.message.includes('unauthenticated')) {
          setUser(null)
          setIsTokenReady(false)
        }
      }}
    >
      <AuthErrorBoundary>
        <AuthContext.Provider value={value}>
          {children}
        </AuthContext.Provider>
      </AuthErrorBoundary>
    </FirebaseErrorBoundary>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

// Hook to protect pages that require authentication
export function useRequireAuth() {
  const { user, loading, isTokenReady, getValidToken, error, clearError, retryAuth } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login')
    }
  }, [user, loading, router])

  return {
    user,
    loading,
    isTokenReady,
    getValidToken,
    error,
    clearError,
    retryAuth
  }
}

// Hook to redirect authenticated users (for login page)
export function useRedirectIfAuthenticated() {
  const { user, loading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!loading && user) {
      // Use replace instead of push to prevent back button issues
      router.replace('/dashboard')
    }
  }, [user, loading, router])

  return { user, loading }
}