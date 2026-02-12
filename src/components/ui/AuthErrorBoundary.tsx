import React from 'react'
import { toast } from 'react-toastify'
import { DefaultAuthErrorFallback } from './DefaultAuthErrorFallback'

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
    toast.error('Authentication error occurred: The app encountered an unexpected error')
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

// Hook version for functional components
export function useAuthErrorBoundary() {
  const [error, setError] = React.useState<Error | null>(null)

  const resetError = React.useCallback(() => {
    setError(null)
  }, [])

  const captureError = React.useCallback((error: Error) => {
    setError(error)
    console.error('Auth error captured:', error)
    toast.error(`Authentication error occurred: ${error.message}`)
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