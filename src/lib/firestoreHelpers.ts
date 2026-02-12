'use client'

import {
  collection,
  query,
  onSnapshot,
  DocumentData,
  Query,
  FirestoreError,
  Unsubscribe
} from 'firebase/firestore'
import { firestore } from './firebaseClient'
import { getCurrentUser } from './auth'
import { logger } from '@/lib/logger'

interface RetryableSnapshotOptions {
  maxRetries?: number
  retryDelay?: number
  onError?: (error: FirestoreError, retryCount: number) => void
  onRetry?: (retryCount: number) => void
  requireAuth?: boolean
}

/**
 * Enhanced onSnapshot with automatic retry logic for permission errors
 */
export function onSnapshotWithRetry<T = DocumentData>(
  query: Query<T>,
  onNext: (snapshot: any) => void,
  options: RetryableSnapshotOptions = {}
): () => void {
  const {
    maxRetries = 3,
    retryDelay = 2000,
    onError,
    onRetry,
    requireAuth = true
  } = options

  let retryCount = 0
  let currentUnsubscribe: Unsubscribe | null = null
  let retryTimeout: NodeJS.Timeout | null = null
  let isDestroyed = false
  let lastSuccessTime = Date.now()
  let consecutiveErrors = 0

  const cleanup = () => {
    isDestroyed = true
    if (currentUnsubscribe) {
      currentUnsubscribe()
      currentUnsubscribe = null
    }
    if (retryTimeout) {
      clearTimeout(retryTimeout)
      retryTimeout = null
    }
  }

  const attemptSnapshot = async (): Promise<void> => {
    if (isDestroyed) return

    // Check authentication if required
    if (requireAuth) {
      const user = getCurrentUser()
      if (!user) {
        logger.warn('Firestore query attempted without authentication')
        onError?.(new Error('NO_AUTH') as FirestoreError, retryCount)
        return
      }

      try {
        // Verify token is still valid with timeout
        const tokenPromise = user.getIdToken()
        const tokenTimeout = new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('TOKEN_TIMEOUT')), 5000)
        )
        await Promise.race([tokenPromise, tokenTimeout])

        // Check if too many consecutive errors
        if (consecutiveErrors >= 5) {
          logger.warn('Too many consecutive errors, forcing token refresh')
          await user.getIdToken(true) // Force refresh
          consecutiveErrors = 0
        }
      } catch (tokenError) {
        logger.error('Token verification failed:', tokenError)
        consecutiveErrors++
        if (retryCount < maxRetries) {
          scheduleRetry()
          return
        } else {
          onError?.(tokenError as FirestoreError, retryCount)
          return
        }
      }
    }

    try {
      logger.firebase(`Setting up Firestore listener (attempt ${retryCount + 1})`)

      currentUnsubscribe = onSnapshot(
        query,
        (snapshot) => {
          logger.firebase('Firestore snapshot received successfully')
          retryCount = 0 // Reset retry count on success
          consecutiveErrors = 0 // Reset error count on success
          lastSuccessTime = Date.now()

          // Defensive programming: validate snapshot
          if (!snapshot) {
            logger.warn('Received null/undefined snapshot')
            return
          }

          try {
            onNext(snapshot)
          } catch (callbackError) {
            logger.error('Error in snapshot callback:', callbackError)
            onError?.(callbackError as FirestoreError, retryCount)
          }
        },
        (error: FirestoreError) => {
          // Check if error is due to sign out
          if (error.code === 'permission-denied') {
            const user = getCurrentUser()
            if (!user) {
              logger.log('Permission denied due to sign out - suppressing error')
              return;
            }
          }

          logger.error('Firestore listener error:', error.code, error.message)
          consecutiveErrors++

          // Check if we've been offline too long
          const timeSinceLastSuccess = Date.now() - lastSuccessTime
          if (timeSinceLastSuccess > 300000) { // 5 minutes
            logger.critical('No successful connection for 5 minutes, may need full app restart')
          }

          // Handle different error types with enhanced logic
          if (error.code === 'permission-denied') {
            logger.log('Permission denied - checking retry options')

            // If we've had recent success, likely a temporary auth issue
            if (timeSinceLastSuccess < 30000 && retryCount < maxRetries) {
              logger.log('Recent success detected, treating as temporary auth issue')
              scheduleRetry()
            } else if (retryCount < maxRetries) {
              // Standard permission retry
              scheduleRetry()
            } else {
              logger.error('Max retries reached for permission denied error')
              onError?.(error, retryCount)
            }
          } else if (error.code === 'unavailable' || error.code === 'deadline-exceeded') {
            logger.log('Network error - will retry with backoff')
            if (retryCount < maxRetries) {
              scheduleRetry()
            } else {
              logger.error('Max retries reached for network error')
              onError?.(error, retryCount)
            }
          } else if (error.code === 'failed-precondition' || error.code === 'aborted') {
            logger.log('Transient error - will retry')
            if (retryCount < maxRetries) {
              scheduleRetry()
            } else {
              onError?.(error, retryCount)
            }
          } else {
            // For other errors, don't retry but check if it's really non-retryable
            logger.error('Potentially non-retryable error:', error.code)

            // Some errors that look non-retryable might actually be transient
            if (['internal', 'unknown'].includes(error.code) && retryCount === 0) {
              logger.log('Attempting one retry for potential transient error')
              scheduleRetry()
            } else {
              onError?.(error, retryCount)
            }
          }
        }
      )
    } catch (error) {
      logger.error('Error setting up Firestore listener:', error)
      if (retryCount < maxRetries) {
        scheduleRetry()
      } else {
        onError?.(error as FirestoreError, retryCount)
      }
    }
  }

  const scheduleRetry = () => {
    if (isDestroyed) return

    retryCount++
    logger.log(`Scheduling Firestore retry ${retryCount}/${maxRetries} in ${retryDelay}ms`)

    onRetry?.(retryCount)

    // Calculate backoff with jitter to prevent thundering herd
    const backoffMs = Math.min(retryDelay * Math.pow(2, retryCount - 1), 30000) // Max 30s
    const jitter = Math.random() * 1000 // Add up to 1s of jitter
    const totalDelay = backoffMs + jitter

    logger.log(`Retry scheduled in ${Math.round(totalDelay)}ms`)

    retryTimeout = setTimeout(() => {
      if (!isDestroyed) {
        attemptSnapshot()
      }
    }, totalDelay)
  }

  // Initial attempt
  attemptSnapshot()

  // Return cleanup function
  return cleanup
}

/**
 * Helper to create user-scoped queries with proper error handling
 */
export function createUserQuery(collectionName: string, userId: string, additionalWhere?: any[]) {
  const baseQuery = query(
    collection(firestore, collectionName),
    ...additionalWhere || []
  )

  return baseQuery
}

/**
 * Enhanced error handler for Firestore operations
 */
export function handleFirestoreError(error: FirestoreError, operation: string): string {
  logger.error(`Firestore error in ${operation}:`, error.code, error.message)

  switch (error.code) {
    case 'permission-denied':
      return 'Access denied. Please make sure you are properly signed in.'
    case 'not-found':
      return 'The requested data was not found.'
    case 'already-exists':
      return 'This item already exists.'
    case 'resource-exhausted':
      return 'Request quota exceeded. Please try again later.'
    case 'deadline-exceeded':
    case 'unavailable':
      return 'Service temporarily unavailable. Please try again.'
    case 'unauthenticated':
      return 'Authentication required. Please sign in again.'
    case 'invalid-argument':
      return 'Invalid request. Please check your input.'
    default:
      return `An error occurred: ${error.message || 'Unknown error'}`
  }
}

/**
 * Utility to wait for authentication before executing Firestore operations
 */
export async function waitForAuth(timeoutMs: number = 10000): Promise<boolean> {
  return new Promise((resolve) => {
    const startTime = Date.now()

    const checkAuth = () => {
      const user = getCurrentUser()
      if (user) {
        logger.log('Authentication confirmed for Firestore operations')
        resolve(true)
        return
      }

      if (Date.now() - startTime > timeoutMs) {
        logger.warn('Authentication timeout for Firestore operations')
        resolve(false)
        return
      }

      // Check again in 100ms
      setTimeout(checkAuth, 100)
    }

    checkAuth()
  })
}