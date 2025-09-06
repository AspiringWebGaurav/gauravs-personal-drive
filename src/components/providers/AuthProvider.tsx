'use client'

import React, { createContext, useContext, useEffect, useState } from 'react'
import { onAuthStateChange, getAuthToken, signOut } from '@/lib/auth'
import type { User } from 'firebase/auth'
import { useRouter } from 'next/navigation'

interface AuthContextType {
  user: User | null
  loading: boolean
  signOut: () => Promise<void>
  refreshToken: () => Promise<string | null>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

interface AuthProviderProps {
  children: React.ReactNode
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    const unsubscribe = onAuthStateChange(async (firebaseUser) => {
      setUser(firebaseUser)
      setLoading(false)

      if (firebaseUser) {
        // Set session cookie when user is authenticated
        try {
          const token = await firebaseUser.getIdToken()
          
          // Set session cookie via API route
          await fetch('/api/auth/session', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ token }),
          })
        } catch (error) {
          console.error('Error setting session:', error)
        }
      } else {
        // Clear session cookie when user is not authenticated
        try {
          await fetch('/api/auth/session', {
            method: 'DELETE',
          })
        } catch (error) {
          console.error('Error clearing session:', error)
        }
      }
    })

    return unsubscribe
  }, [])

  const handleSignOut = async () => {
    try {
      await signOut()
      // Clear session cookie
      await fetch('/api/auth/session', {
        method: 'DELETE',
      })
      router.push('/login')
    } catch (error) {
      console.error('Error signing out:', error)
    }
  }

  const refreshToken = async () => {
    try {
      return await getAuthToken()
    } catch (error) {
      console.error('Error refreshing token:', error)
      return null
    }
  }

  const value: AuthContextType = {
    user,
    loading,
    signOut: handleSignOut,
    refreshToken,
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
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
  const { user, loading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login')
    }
  }, [user, loading, router])

  return { user, loading }
}

// Hook to redirect authenticated users (for login page)
export function useRedirectIfAuthenticated() {
  const { user, loading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!loading && user) {
      router.push('/dashboard')
    }
  }, [user, loading, router])

  return { user, loading }
}