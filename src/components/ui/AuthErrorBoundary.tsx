'use client'

import React from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { AlertTriangle, RefreshCw, HardDrive, Home } from 'lucide-react'
import { toast } from 'sonner'
import { useNotification } from '@/components/providers/NotificationProvider'

interface AuthErrorBoundaryState {
  hasError: boolean
  error?: Error
  errorInfo?: React.ErrorInfo
}

interface AuthErrorBoundaryProps {
  children: React.ReactNode
  fallback?: React.ComponentType<{ error?: Error; resetError: () => void }>
}

export class AuthErrorBoundary extends React.Component<
  AuthErrorBoundaryProps,
  AuthErrorBoundaryState
> {
  constructor(props: AuthErrorBoundaryProps) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(error: Error): AuthErrorBoundaryState {
    // Update state so the next render will show the fallback UI
    return {
      hasError: true,
      error,
    }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Log the error to the console and potentially to an error reporting service
    console.error('AuthErrorBoundary caught an error:', error, errorInfo)
    
    // Log to external service if needed
    // logErrorToService(error, errorInfo)
    
    this.setState({
      error,
      errorInfo,
    })

    // Show error toast
    toast.error('Authentication error occurred', {
      description: 'The app encountered an unexpected error',
      duration: 5000,
    })
  }

  resetError = () => {
    this.setState({ hasError: false, error: undefined, errorInfo: undefined })
  }

  render() {
    if (this.state.hasError) {
      // If a custom fallback is provided, use it
      if (this.props.fallback) {
        const FallbackComponent = this.props.fallback
        return <FallbackComponent error={this.state.error} resetError={this.resetError} />
      }

      // Default fallback UI
      return <DefaultAuthErrorFallback error={this.state.error} resetError={this.resetError} />
    }

    return this.props.children
  }
}

interface DefaultAuthErrorFallbackProps {
  error?: Error
  resetError: () => void
}

function DefaultAuthErrorFallback({ error, resetError }: DefaultAuthErrorFallbackProps) {
  const { showSuccess } = useNotification()
  
  const performHardRefresh = async () => {
    toast.loading('Performing hard refresh...', { id: 'hard-refresh' })

    try {
      // Clear all browser storage
      localStorage.clear()
      sessionStorage.clear()

      // Clear IndexedDB
      if ('indexedDB' in window) {
        try {
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
        } catch (err) {
          console.warn('Could not clear IndexedDB:', err)
        }
      }

      // Clear service worker cache
      if ('serviceWorker' in navigator && 'caches' in window) {
        try {
          const cacheNames = await caches.keys()
          await Promise.all(cacheNames.map(name => caches.delete(name)))
        } catch (err) {
          console.warn('Could not clear cache:', err)
        }
      }

      // Show both toast for immediate feedback and dialog for completion
      toast.success('Hard refresh completed!', { id: 'hard-refresh' })
      showSuccess(
        'System Refreshed',
        'Hard refresh completed successfully. Your session has been reset.',
        { autoCloseDuration: 3000 }
      )
      
      setTimeout(() => {
        window.location.reload()
      }, 500)
    } catch (err) {
      console.error('Hard refresh failed:', err)
      toast.error('Hard refresh failed. Reloading page...', { id: 'hard-refresh' })
      setTimeout(() => window.location.reload(), 1000)
    }
  }

  const getErrorMessage = (error?: Error) => {
    if (!error) return 'An unexpected error occurred'

    const message = error.message.toLowerCase()
    
    if (message.includes('auth') || message.includes('firebase')) {
      return 'Authentication system error. This might be a temporary issue.'
    }
    if (message.includes('network') || message.includes('fetch')) {
      return 'Network connection error. Please check your internet connection.'
    }
    if (message.includes('timeout')) {
      return 'Request timeout. The operation took too long to complete.'
    }
    
    return 'An unexpected error occurred in the application.'
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50/50 via-white to-orange-50/50 dark:from-red-900/20 dark:via-gray-800 dark:to-orange-900/20 flex items-center justify-center p-4">
      {/* Background pattern */}
      <div className="absolute inset-0 opacity-20">
        <div className="absolute inset-0 bg-gradient-to-br from-red-100/50 to-orange-100/50 dark:from-red-900/20 dark:to-orange-900/20"></div>
      </div>

      <div className="w-full max-w-md relative z-10">
        <Card className="glass-card border-red-200/20 dark:border-red-800/20 shadow-2xl backdrop-blur-xl">
          <CardHeader className="text-center space-y-4">
            <div className="w-16 h-16 mx-auto bg-gradient-to-br from-red-100 to-orange-100 dark:from-red-900/20 dark:to-orange-900/20 rounded-2xl flex items-center justify-center shadow-lg">
              <AlertTriangle className="h-8 w-8 text-red-600 dark:text-red-400" />
            </div>
            
            <div className="space-y-2">
              <CardTitle className="text-xl font-bold text-gray-900 dark:text-white">
                Something Went Wrong
              </CardTitle>
              
              <CardDescription className="text-base text-gray-600 dark:text-gray-300 leading-relaxed">
                {getErrorMessage(error)}
              </CardDescription>
            </div>
          </CardHeader>

          <CardContent className="space-y-6">
            {/* Error Details (for development) */}
            {process.env.NODE_ENV === 'development' && error && (
              <div className="p-3 bg-gray-100 dark:bg-gray-800 rounded-lg">
                <details className="text-xs">
                  <summary className="cursor-pointer font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Error Details
                  </summary>
                  <pre className="text-gray-600 dark:text-gray-400 whitespace-pre-wrap break-all">
                    {error.stack || error.message}
                  </pre>
                </details>
              </div>
            )}

            {/* Action Buttons */}
            <div className="space-y-3">
              <Button
                onClick={resetError}
                size="lg"
                className="w-full h-12 glass-button bg-blue-500/10 dark:bg-blue-400/10 hover:bg-blue-500/20 dark:hover:bg-blue-400/20 border border-blue-300/30 dark:border-blue-600/30 text-blue-700 dark:text-blue-300"
                variant="outline"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Try Again
              </Button>

              <Button
                onClick={performHardRefresh}
                size="lg"
                className="w-full h-12 glass-button bg-orange-500/10 dark:bg-orange-400/10 hover:bg-orange-500/20 dark:hover:bg-orange-400/20 border border-orange-300/30 dark:border-orange-600/30 text-orange-700 dark:text-orange-300"
                variant="outline"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Hard Refresh
              </Button>

              <Button
                onClick={() => window.location.href = '/'}
                size="lg"
                className="w-full h-12 glass-button bg-green-500/10 dark:bg-green-400/10 hover:bg-green-500/20 dark:hover:bg-green-400/20 border border-green-300/30 dark:border-green-600/30 text-green-700 dark:text-green-300"
                variant="outline"
              >
                <Home className="w-4 h-4 mr-2" />
                Go Home
              </Button>

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

            <div className="text-center">
              <p className="text-xs text-muted-foreground/70">
                If the problem persists, try hard refresh to clear all app data
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Floating elements */}
        <div className="absolute -top-4 -left-4 w-24 h-24 bg-gradient-to-br from-red-400/20 to-orange-400/20 rounded-full blur-xl"></div>
        <div className="absolute -bottom-4 -right-4 w-32 h-32 bg-gradient-to-br from-orange-400/20 to-red-400/20 rounded-full blur-xl"></div>
      </div>
    </div>
  )
}

// Hook version for functional components
export function useAuthErrorBoundary() {
  const [error, setError] = React.useState<Error | null>(null)

  const resetError = React.useCallback(() => {
    setError(null)
  }, [])

  const captureError = React.useCallback((error: Error) => {
    setError(error)
    console.error('Auth error captured:', error)
    toast.error('Authentication error occurred', {
      description: error.message,
      duration: 5000,
    })
  }, [])

  React.useEffect(() => {
    if (error) {
      // Log error or send to monitoring service
      console.error('Auth boundary error:', error)
    }
  }, [error])

  return {
    error,
    resetError,
    captureError,
    hasError: !!error,
  }
}