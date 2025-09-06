'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ThemeToggle } from '@/components/ThemeToggle'
import { HardDrive, Shield, Zap, Cloud, ArrowRight, RefreshCw } from 'lucide-react'
import { useAuth } from '@/components/providers/AuthProvider'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'

export default function HomePage() {
  const { user, loading } = useAuth()
  const router = useRouter()

  // Redirect authenticated users to dashboard
  useEffect(() => {
    if (!loading && user) {
      router.push('/dashboard')
    }
  }, [user, loading, router])

  const performHardRefresh = async () => {
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
                return new Promise((resolve, reject) => {
                  const deleteReq = indexedDB.deleteDatabase(name)
                  deleteReq.onsuccess = () => resolve()
                  deleteReq.onerror = () => reject(deleteReq.error)
                })
              }
              return Promise.resolve()
            })
          )
        } catch (error) {
          console.warn('Could not clear IndexedDB:', error)
        }
      }

      // Clear service worker cache
      if ('serviceWorker' in navigator && 'caches' in window) {
        try {
          const cacheNames = await caches.keys()
          await Promise.all(cacheNames.map(name => caches.delete(name)))
        } catch (error) {
          console.warn('Could not clear cache:', error)
        }
      }

      // Force page reload
      window.location.reload()
    } catch (error) {
      console.error('Hard refresh failed:', error)
      window.location.reload()
    }
  }

  // Show loading spinner while checking auth state
  if (loading) {
    return <LoadingSpinner />
  }

  // If user is authenticated, they'll be redirected
  if (user) {
    return <LoadingSpinner />
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50/50 via-white to-purple-50/50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      {/* Background pattern */}
      <div className="absolute inset-0 opacity-20">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-100/50 to-purple-100/50 dark:from-blue-900/20 dark:to-purple-900/20"></div>
      </div>
      
      {/* Theme toggle - positioned in top right */}
      <div className="absolute top-4 right-4 z-10">
        <ThemeToggle />
      </div>

      {/* Hard refresh button - positioned in top left */}
      <div className="absolute top-4 left-4 z-10">
        <Button
          onClick={performHardRefresh}
          size="sm"
          className="glass-button bg-orange-500/10 dark:bg-orange-400/10 hover:bg-orange-500/20 dark:hover:bg-orange-400/20 border border-orange-300/30 dark:border-orange-600/30 text-orange-700 dark:text-orange-300"
          variant="outline"
          title="Clear all app data and refresh"
        >
          <RefreshCw className="w-4 h-4" />
        </Button>
      </div>

      {/* Main content */}
      <div className="relative z-10 container mx-auto px-4 py-12">
        {/* Hero section */}
        <div className="text-center max-w-4xl mx-auto mb-16">
          <div className="flex items-center justify-center space-x-4 mb-8">
            <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center shadow-xl">
              <HardDrive className="h-8 w-8 text-white" />
            </div>
            <div>
              <h1 className="text-4xl md:text-6xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 dark:from-white dark:to-gray-300 bg-clip-text text-transparent">
                Gaurav's Personal Drive
              </h1>
            </div>
          </div>
          
          <p className="text-xl md:text-2xl text-gray-600 dark:text-gray-300 mb-8 leading-relaxed">
            Your secure cloud storage solution with advanced authentication and recovery features.
            <br />
            <span className="text-lg text-gray-500 dark:text-gray-400">Fast, minimal, and built for personal use.</span>
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button
              onClick={() => router.push('/login')}
              size="lg"
              className="h-14 px-8 glass-button bg-blue-500/10 dark:bg-blue-400/10 hover:bg-blue-500/20 dark:hover:bg-blue-400/20 border border-blue-300/30 dark:border-blue-600/30 text-blue-700 dark:text-blue-300 text-lg font-medium"
              variant="outline"
            >
              Get Started
              <ArrowRight className="w-5 h-5 ml-2" />
            </Button>
            
            <Button
              onClick={() => router.push('/dashboard')}
              size="lg"
              className="h-14 px-8 glass-button bg-purple-500/10 dark:bg-purple-400/10 hover:bg-purple-500/20 dark:hover:bg-purple-400/20 border border-purple-300/30 dark:border-purple-600/30 text-purple-700 dark:text-purple-300 text-lg font-medium"
              variant="outline"
            >
              Go to Dashboard
              <HardDrive className="w-5 h-5 ml-2" />
            </Button>
          </div>
        </div>

        {/* Features section */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
          <Card className="glass-card border-blue-200/20 dark:border-blue-800/20 shadow-xl backdrop-blur-xl hover:scale-[1.02] transition-all duration-300">
            <CardHeader className="text-center">
              <div className="w-12 h-12 mx-auto bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center shadow-lg mb-4">
                <Shield className="h-6 w-6 text-white" />
              </div>
              <CardTitle className="text-xl font-bold text-gray-900 dark:text-white">
                Advanced Authentication
              </CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription className="text-gray-600 dark:text-gray-300 leading-relaxed">
                Secure Google authentication with timeout detection, automatic retry mechanisms, and comprehensive error handling for a smooth sign-in experience.
              </CardDescription>
            </CardContent>
          </Card>

          <Card className="glass-card border-purple-200/20 dark:border-purple-800/20 shadow-xl backdrop-blur-xl hover:scale-[1.02] transition-all duration-300">
            <CardHeader className="text-center">
              <div className="w-12 h-12 mx-auto bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg mb-4">
                <RefreshCw className="h-6 w-6 text-white" />
              </div>
              <CardTitle className="text-xl font-bold text-gray-900 dark:text-white">
                Recovery Features
              </CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription className="text-gray-600 dark:text-gray-300 leading-relaxed">
                Hard refresh functionality that clears all cached data, browser storage, and service workers to resolve authentication issues and app state problems.
              </CardDescription>
            </CardContent>
          </Card>

          <Card className="glass-card border-green-200/20 dark:border-green-800/20 shadow-xl backdrop-blur-xl hover:scale-[1.02] transition-all duration-300">
            <CardHeader className="text-center">
              <div className="w-12 h-12 mx-auto bg-gradient-to-br from-green-500 to-green-600 rounded-xl flex items-center justify-center shadow-lg mb-4">
                <Zap className="h-6 w-6 text-white" />
              </div>
              <CardTitle className="text-xl font-bold text-gray-900 dark:text-white">
                Fast & Reliable
              </CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription className="text-gray-600 dark:text-gray-300 leading-relaxed">
                Built with modern web technologies, featuring glass morphism design, responsive layouts, and optimized performance for a premium user experience.
              </CardDescription>
            </CardContent>
          </Card>
        </div>

        {/* Footer */}
        <div className="text-center mt-16">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Built with ❤️ by Gaurav • Secure • Personal • Private
          </p>
        </div>
      </div>

      {/* Floating elements for visual appeal */}
      <div className="absolute top-1/4 left-4 w-24 h-24 bg-gradient-to-br from-blue-400/20 to-purple-400/20 rounded-full blur-xl"></div>
      <div className="absolute bottom-1/4 right-8 w-32 h-32 bg-gradient-to-br from-purple-400/20 to-blue-400/20 rounded-full blur-xl"></div>
      <div className="absolute top-3/4 left-1/3 w-16 h-16 bg-gradient-to-br from-green-400/20 to-blue-400/20 rounded-full blur-xl"></div>
    </div>
  )
}
