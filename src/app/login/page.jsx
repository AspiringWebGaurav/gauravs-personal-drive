'use client'

import { useState } from 'react'
import { signInWithGoogle } from '@/lib/auth'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ThemeToggle } from '@/components/ThemeToggle'
import { Loader2 } from 'lucide-react'
import { useRedirectIfAuthenticated } from '@/components/providers/AuthProvider'
import { toast } from 'sonner'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { AuthLoadingSpinner } from '@/components/ui/AuthLoadingSpinner'
import { AuthErrorHandler } from '@/components/ui/AuthErrorHandler'

export default function LoginPage() {
  const [isLoading, setIsLoading] = useState(false)
  const [loadingStep, setLoadingStep] = useState('')
  const [authError, setAuthError] = useState(null)
  const [retryCount, setRetryCount] = useState(0)
  const { loading } = useRedirectIfAuthenticated()

  const handleGoogleSignIn = async () => {
    try {
      setIsLoading(true)
      setAuthError(null)
      setLoadingStep('Opening Google Sign-in...')
      
      // Add a small delay to show the initial loading state
      await new Promise(resolve => setTimeout(resolve, 100))
      
      const startTime = Date.now()
      const result = await signInWithGoogle()
      const duration = Date.now() - startTime
      
      if (result.success) {
        setLoadingStep('Setting up your session...')
        toast.success('Welcome to Gaurav\'s Personal Drive!')
        console.log(`🎉 Total sign-in process completed in ${duration}ms`)
        setRetryCount(0) // Reset retry count on success
        // No need for manual redirect - useRedirectIfAuthenticated hook handles this
      } else {
        console.error('Sign in failed:', result.error)
        
        // Handle specific error types
        let errorType = 'UNKNOWN_ERROR'
        if (result.error?.includes('popup-blocked')) {
          errorType = 'POPUP_BLOCKED'
        } else if (result.error?.includes('popup-closed')) {
          errorType = 'POPUP_CLOSED'
        } else if (result.error?.includes('network')) {
          errorType = 'NETWORK_ERROR'
        } else if (result.error?.includes('timeout')) {
          errorType = 'TIMEOUT'
        }
        
        setAuthError(errorType)
        setLoadingStep('')
        setIsLoading(false)
      }
    } catch (error) {
      console.error('Sign in error:', error)
      
      // Determine error type
      let errorType = 'UNKNOWN_ERROR'
      if (error.message?.includes('network') || error.message?.includes('fetch')) {
        errorType = 'NETWORK_ERROR'
      } else if (error.message?.includes('timeout')) {
        errorType = 'TIMEOUT'
      }
      
      setAuthError(errorType)
      setLoadingStep('')
      setIsLoading(false)
    }
  }

  const handleRetry = () => {
    setRetryCount(prev => prev + 1)
    handleGoogleSignIn()
  }

  const handleHardRefresh = () => {
    // The AuthErrorHandler will handle the hard refresh
    console.log('Hard refresh requested from login page')
  }

  // Show loading spinner while auth state is being determined
  if (loading) {
    return <LoadingSpinner />
  }

  return (
    <>
      {/* Full-screen loading overlay when signing in */}
      {isLoading && (
        <AuthLoadingSpinner
          step={loadingStep}
          onTimeout={() => {
            setAuthError('TIMEOUT')
            setIsLoading(false)
          }}
          onHardRefresh={handleHardRefresh}
          timeoutMs={25000} // 25 second timeout for login
          showRecoveryAfter={12000} // Show recovery after 12 seconds
        />
      )}
      
      {/* Error handler overlay */}
      {authError && (
        <AuthErrorHandler
          error={authError}
          onRetry={handleRetry}
          onHardRefresh={handleHardRefresh}
          isRetrying={isLoading}
          retryCount={retryCount}
          maxRetries={3}
        />
      )}
      
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 p-4">
      {/* Background pattern */}
      <div className="absolute inset-0 opacity-20">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-100/50 to-purple-100/50 dark:from-blue-900/20 dark:to-purple-900/20"></div>
      </div>
      
      {/* Theme toggle - positioned in top right */}
      <div className="absolute top-4 right-4 z-10">
        <ThemeToggle />
      </div>

      {/* Main login card */}
      <div className="w-full max-w-md relative z-10">
        <Card className="glass-card border-white/20 dark:border-white/10 shadow-2xl backdrop-blur-xl">
          <CardHeader className="text-center space-y-4 pb-8">
            <div className="w-16 h-16 mx-auto bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center shadow-lg">
              <svg 
                className="w-8 h-8 text-white" 
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <path 
                  strokeLinecap="round" 
                  strokeLinejoin="round" 
                  strokeWidth={2} 
                  d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2-2z" 
                />
                <path 
                  strokeLinecap="round" 
                  strokeLinejoin="round" 
                  strokeWidth={2} 
                  d="M8 5a2 2 0 012-2h4a2 2 0 012 2v0H8v0z" 
                />
              </svg>
            </div>
            
            <CardTitle className="text-2xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 dark:from-white dark:to-gray-300 bg-clip-text text-transparent">
              Gaurav's Personal Drive
            </CardTitle>
            
            <CardDescription className="text-base text-muted-foreground/80 max-w-sm mx-auto leading-relaxed">
              Your secure cloud storage solution. Fast, minimal, and built for personal use.
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-6 pb-8">
            <div className="space-y-4">
              <Button
                onClick={handleGoogleSignIn}
                disabled={isLoading}
                className="w-full h-12 glass-button bg-white/10 dark:bg-white/5 hover:bg-white/20 dark:hover:bg-white/10 border border-white/20 dark:border-white/10 shadow-lg transition-all duration-200 hover:scale-[1.02] hover:shadow-xl"
                variant="outline"
              >
                {isLoading ? (
                  <div className="flex flex-col items-center space-y-2">
                    <div className="flex items-center">
                      <Loader2 className="w-5 h-5 mr-3 animate-spin" />
                      Signing in...
                    </div>
                    {loadingStep && (
                      <div className="text-sm text-muted-foreground/70 animate-pulse">
                        {loadingStep}
                      </div>
                    )}
                  </div>
                ) : (
                  <>
                    <svg className="w-5 h-5 mr-3" viewBox="0 0 24 24">
                      <path
                        fill="#4285F4"
                        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                      />
                      <path
                        fill="#34A853"
                        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                      />
                      <path
                        fill="#FBBC05"
                        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                      />
                      <path
                        fill="#EA4335"
                        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                      />
                    </svg>
                    Continue with Google
                  </>
                )}
              </Button>
            </div>

            <div className="text-center">
              <p className="text-xs text-muted-foreground/60">
                By continuing, you agree to our terms of service and privacy policy
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Floating elements for visual appeal */}
        <div className="absolute -top-4 -left-4 w-24 h-24 bg-gradient-to-br from-blue-400/20 to-purple-400/20 rounded-full blur-xl"></div>
        <div className="absolute -bottom-4 -right-4 w-32 h-32 bg-gradient-to-br from-purple-400/20 to-pink-400/20 rounded-full blur-xl"></div>
      </div>
      </div>
    </>
  )
}