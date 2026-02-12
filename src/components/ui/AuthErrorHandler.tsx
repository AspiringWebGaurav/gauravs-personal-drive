'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { AlertTriangle, RefreshCw, RotateCcw, HardDrive, Wifi } from 'lucide-react'
import { useNotification } from '@/components/providers/NotificationProvider'

interface AuthErrorHandlerProps {
  error?: string | null
  onRetry?: () => void
  onHardRefresh?: () => void
  isRetrying?: boolean
  retryCount?: number
  maxRetries?: number
}

export function AuthErrorHandler({
  error,
  onRetry,
  onHardRefresh,
  isRetrying = false,
  retryCount = 0,
  maxRetries = 3
}: AuthErrorHandlerProps) {
  const [isPerformingHardRefresh, setIsPerformingHardRefresh] = useState(false)
  const { showSuccess, showError, showLoading } = useNotification()

  // Auto-retry with exponential backoff
  useEffect(() => {
    if (error && retryCount < maxRetries && onRetry) {
      const retryDelay = Math.min(2000 * Math.pow(2, retryCount), 10000) // Max 10 seconds
      const timer = setTimeout(() => {
        onRetry()
      }, retryDelay)

      return () => clearTimeout(timer)
    }
  }, [error, retryCount, maxRetries, onRetry])

  const performHardRefresh = async () => {
    setIsPerformingHardRefresh(true)
    showLoading('Performing hard refresh...', { toastId: 'hard-refresh' })

    try {
      // Clear all browser storage
      localStorage.clear()
      sessionStorage.clear()

      // Clear IndexedDB (Firebase uses it)
      if ('indexedDB' in window) {
        const databases = await indexedDB.databases()
        await Promise.all(
          databases.map(({ name }) => {
            if (name) {
              return new Promise<void>((resolve, reject) => {
                const deleteReq = indexedDB.deleteDatabase(name)
                deleteReq.onsuccess = () => resolve()
                deleteReq.onerror = () => reject(deleteReq.error)
              })
            }
            return Promise.resolve()
          })
        )
      }

      // Clear service worker cache
      if ('serviceWorker' in navigator) {
        const cacheNames = await caches.keys()
        await Promise.all(cacheNames.map(name => caches.delete(name)))
      }

      // Clear cookies (if any)
      document.cookie.split(";").forEach((c) => {
        const eqPos = c.indexOf("=")
        const name = eqPos > -1 ? c.substr(0, eqPos) : c
        document.cookie = name + "=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/"
        document.cookie = name + "=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/;domain=" + window.location.hostname
        document.cookie = name + "=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/;domain=." + window.location.hostname
      })

      // Show both toast for immediate feedback and dialog for completion
      showSuccess('Hard refresh completed!')
      showSuccess(
        'System Refreshed',
        'Hard refresh completed successfully. Your session has been reset.',
        { autoClose: 3000 }
      )

      // Small delay to show the success message
      setTimeout(() => {
        if (onHardRefresh) {
          onHardRefresh()
        } else {
          // Force page reload with cache bypass
          window.location.reload()
        }
      }, 500)
    } catch (error) {
      console.error('Hard refresh failed:', error)
      showError('Hard refresh failed. Reloading page...')
      // Fallback to simple reload
      setTimeout(() => window.location.reload(), 1000)
    }
  }

  const getErrorMessage = (error: string) => {
    switch (error) {
      case 'TOKEN_EXPIRED':
        return 'Your session has expired. Please sign in again.'
      case 'TOKEN_REVOKED':
        return 'Your access has been revoked. Please sign in again.'
      case 'NETWORK_ERROR':
        return 'Network connection issue. Please check your internet connection.'
      case 'TIMEOUT':
        return 'Sign-in is taking longer than expected. Try refreshing the page.'
      case 'POPUP_BLOCKED':
        return 'Pop-up blocked. Please allow pop-ups and try again.'
      case 'POPUP_CLOSED':
        return 'Sign-in window was closed. Please try again.'
      default:
        return error || 'An unexpected error occurred during sign-in.'
    }
  }

  const getErrorIcon = (error: string) => {
    switch (error) {
      case 'NETWORK_ERROR':
        return <Wifi className="h-8 w-8 text-orange-500" />
      case 'TIMEOUT':
        return <RotateCcw className="h-8 w-8 text-blue-500" />
      default:
        return <AlertTriangle className="h-8 w-8 text-red-500" />
    }
  }

  if (!error) return null

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <Card className="glass-card border-red-200/20 dark:border-red-800/20 shadow-2xl backdrop-blur-xl max-w-md w-full mx-4">
        <CardHeader className="text-center space-y-4">
          <div className="w-16 h-16 mx-auto bg-gradient-to-br from-red-100 to-red-50 dark:from-red-900/20 dark:to-red-800/20 rounded-2xl flex items-center justify-center shadow-lg">
            {getErrorIcon(error)}
          </div>

          <CardTitle className="text-xl font-bold text-gray-900 dark:text-white">
            Authentication Error
          </CardTitle>

          <CardDescription className="text-base text-gray-600 dark:text-gray-300 leading-relaxed">
            {getErrorMessage(error)}
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Retry Progress */}
          {retryCount > 0 && (
            <div className="text-center">
              <p className="text-sm text-muted-foreground mb-2">
                Retry attempt {retryCount} of {maxRetries}
              </p>
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                <div
                  className="bg-gradient-to-r from-blue-500 to-purple-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${(retryCount / maxRetries) * 100}%` }}
                />
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="space-y-3">
            {/* Retry Button */}
            {retryCount < maxRetries && onRetry && (
              <Button
                onClick={onRetry}
                disabled={isRetrying}
                size="lg"
                className="w-full h-12 glass-button bg-blue-500/10 dark:bg-blue-400/10 hover:bg-blue-500/20 dark:hover:bg-blue-400/20 border border-blue-300/30 dark:border-blue-600/30 text-blue-700 dark:text-blue-300"
                variant="outline"
              >
                {isRetrying ? (
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <RefreshCw className="w-4 h-4 mr-2" />
                )}
                Try Again
              </Button>
            )}

            {/* Hard Refresh Button */}
            <Button
              onClick={performHardRefresh}
              disabled={isPerformingHardRefresh}
              size="lg"
              className="w-full h-12 glass-button bg-orange-500/10 dark:bg-orange-400/10 hover:bg-orange-500/20 dark:hover:bg-orange-400/20 border border-orange-300/30 dark:border-orange-600/30 text-orange-700 dark:text-orange-300"
              variant="outline"
            >
              {isPerformingHardRefresh ? (
                <RotateCcw className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <RotateCcw className="w-4 h-4 mr-2" />
              )}
              Hard Refresh
            </Button>

            {/* Reload Page Button (fallback) */}
            <Button
              onClick={() => window.location.reload()}
              size="lg"
              className="w-full h-12 glass-button bg-gray-500/10 dark:bg-gray-400/10 hover:bg-gray-500/20 dark:hover:bg-gray-400/20 border border-gray-300/30 dark:border-gray-600/30 text-gray-700 dark:text-gray-300"
              variant="outline"
            >
              <HardDrive className="w-4 h-4 mr-2" />
              Reload Page
            </Button>
          </div>

          {/* Help Text */}
          <div className="text-center">
            <p className="text-xs text-muted-foreground/70">
              If the problem persists, try hard refresh to clear all cached data
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Floating elements for visual appeal */}
      <div className="absolute -top-4 -left-4 w-24 h-24 bg-gradient-to-br from-red-400/20 to-orange-400/20 rounded-full blur-xl"></div>
      <div className="absolute -bottom-4 -right-4 w-32 h-32 bg-gradient-to-br from-orange-400/20 to-red-400/20 rounded-full blur-xl"></div>
    </div>
  )
}