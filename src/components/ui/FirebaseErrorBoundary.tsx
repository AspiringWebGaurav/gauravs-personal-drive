'use client'

import React, { Component, ErrorInfo, ReactNode } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { AlertTriangle, RefreshCw, LogOut } from 'lucide-react'

interface Props {
  children: ReactNode
  fallback?: ReactNode
  onError?: (error: Error, errorInfo: ErrorInfo) => void
}

interface State {
  hasError: boolean
  error?: Error
  errorInfo?: ErrorInfo
  retryCount: number
}

export class FirebaseErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false, retryCount: 0 }
  }

  static getDerivedStateFromError(error: Error): State {
    return { 
      hasError: true, 
      error, 
      retryCount: 0 
    }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('🚨 Firebase Error Boundary caught an error:', error, errorInfo)
    
    this.setState({ 
      error, 
      errorInfo,
      hasError: true 
    })
    
    // Call custom error handler if provided
    this.props.onError?.(error, errorInfo)
    
    // Log detailed error information
    this.logErrorDetails(error, errorInfo)
  }

  private logErrorDetails = (error: Error, errorInfo: ErrorInfo) => {
    const errorDetails = {
      message: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      url: window.location.href,
    }
    
    console.error('🔍 Detailed error information:', errorDetails)
    
    // Check for specific Firebase-related errors
    if (error.message.includes('permission-denied')) {
      console.error('🔐 Permission denied error detected')
    } else if (error.message.includes('unauthenticated')) {
      console.error('🔓 Authentication error detected')
    } else if (error.message.includes('network')) {
      console.error('🌐 Network error detected')
    }
  }

  private handleRetry = () => {
    console.log('🔄 Attempting to recover from error')
    this.setState(prevState => ({ 
      hasError: false, 
      error: undefined, 
      errorInfo: undefined,
      retryCount: prevState.retryCount + 1 
    }))
  }

  private handleSignOut = () => {
    console.log('🔓 User requested sign out from error boundary')
    // Clear any cached data and redirect to login
    localStorage.clear()
    sessionStorage.clear()
    window.location.href = '/login'
  }

  private getErrorType = (error?: Error): string => {
    if (!error) return 'Unknown'
    
    const message = error.message.toLowerCase()
    
    if (message.includes('permission-denied')) return 'Permission'
    if (message.includes('unauthenticated')) return 'Authentication'
    if (message.includes('network') || message.includes('fetch')) return 'Network'
    if (message.includes('timeout')) return 'Timeout'
    if (message.includes('quota')) return 'Quota'
    
    return 'Application'
  }

  private getErrorSolution = (error?: Error): string[] => {
    if (!error) return ['Please try refreshing the page']
    
    const message = error.message.toLowerCase()
    
    if (message.includes('permission-denied')) {
      return [
        'Sign out and sign back in',
        'Check your internet connection',
        'Contact support if the problem persists'
      ]
    }
    
    if (message.includes('unauthenticated')) {
      return [
        'Your session has expired',
        'Please sign in again',
        'Clear browser cache if problems continue'
      ]
    }
    
    if (message.includes('network') || message.includes('fetch')) {
      return [
        'Check your internet connection',
        'Try refreshing the page',
        'Wait a moment and try again'
      ]
    }
    
    if (message.includes('timeout')) {
      return [
        'Your connection is slow',
        'Wait a moment and try again',
        'Check your internet connection'
      ]
    }
    
    return [
      'Try refreshing the page',
      'Clear browser cache',
      'Contact support if the problem persists'
    ]
  }

  render() {
    if (this.state.hasError) {
      // Custom fallback UI
      if (this.props.fallback) {
        return this.props.fallback
      }

      const errorType = this.getErrorType(this.state.error)
      const solutions = this.getErrorSolution(this.state.error)
      const canRetry = this.state.retryCount < 3

      return (
        <div className="min-h-screen bg-gradient-to-br from-red-50/50 via-white to-orange-50/50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 flex items-center justify-center p-4">
          <Card className="w-full max-w-md">
            <CardHeader className="text-center">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-100 dark:bg-red-950">
                <AlertTriangle className="h-6 w-6 text-red-600 dark:text-red-400" />
              </div>
              <CardTitle className="text-xl font-semibold">
                {errorType} Error Detected
              </CardTitle>
              <CardDescription className="text-center">
                Something went wrong with your connection to our services.
              </CardDescription>
            </CardHeader>
            
            <CardContent className="space-y-4">
              {/* Error Details */}
              <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-3">
                <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">
                  What happened?
                </h4>
                <p className="text-xs text-gray-600 dark:text-gray-400 font-mono break-all">
                  {this.state.error?.message || 'An unexpected error occurred'}
                </p>
              </div>

              {/* Solutions */}
              <div>
                <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">
                  Try these solutions:
                </h4>
                <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
                  {solutions.map((solution, index) => (
                    <li key={index} className="flex items-start">
                      <span className="inline-block w-2 h-2 bg-blue-400 rounded-full mr-2 mt-1.5 flex-shrink-0" />
                      {solution}
                    </li>
                  ))}
                </ul>
              </div>

              {/* Actions */}
              <div className="flex flex-col gap-2 pt-2">
                {canRetry && (
                  <Button onClick={this.handleRetry} variant="default" size="default" className="w-full">
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Try Again {this.state.retryCount > 0 && `(${this.state.retryCount + 1}/3)`}
                  </Button>
                )}
                
                <Button onClick={this.handleSignOut} variant="outline" size="default" className="w-full">
                  <LogOut className="h-4 w-4 mr-2" />
                  Sign Out & Restart
                </Button>
                
                <Button 
                  onClick={() => window.location.reload()} 
                  variant="ghost" 
                  size="sm" 
                  className="w-full"
                >
                  Refresh Page
                </Button>
              </div>

              {/* Technical Details (Development Mode) */}
              {process.env.NODE_ENV === 'development' && (
                <details className="mt-4">
                  <summary className="text-xs text-gray-500 cursor-pointer">
                    Technical Details
                  </summary>
                  <div className="mt-2 p-2 bg-gray-100 dark:bg-gray-800 rounded text-xs font-mono text-gray-600 dark:text-gray-400 overflow-auto max-h-32">
                    <div><strong>Stack:</strong></div>
                    <pre className="whitespace-pre-wrap text-xs">
                      {this.state.error?.stack}
                    </pre>
                  </div>
                </details>
              )}
            </CardContent>
          </Card>
        </div>
      )
    }

    return this.props.children
  }
}

// Higher-order component for easier usage
export function withFirebaseErrorBoundary<T extends object>(
  Component: React.ComponentType<T>
) {
  return function WithFirebaseErrorBoundaryComponent(props: T) {
    return (
      <FirebaseErrorBoundary>
        <Component {...props} />
      </FirebaseErrorBoundary>
    )
  }
}