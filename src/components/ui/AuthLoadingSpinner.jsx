'use client'

import { useState, useEffect } from 'react'
import { Loader2, RotateCcw, HardDrive, AlertTriangle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useNotification } from '@/components/providers/NotificationProvider'

export function AuthLoadingSpinner({
  step = '',
  showSteps = true,
  onTimeout = null,
  onHardRefresh = null,
  timeoutMs = 20000, // 20 seconds default timeout
  showRecoveryAfter = 10000 // Show recovery options after 10 seconds
}) {
  const [elapsedTime, setElapsedTime] = useState(0)
  const [showRecovery, setShowRecovery] = useState(false)
  const [isTimedOut, setIsTimedOut] = useState(false)
  const [isPerformingHardRefresh, setIsPerformingHardRefresh] = useState(false)
  const { showSuccess, showInfo, showError, showLoading, updateNotification } = useNotification()

  const steps = [
    'Opening Google Sign-in...',
    'Authenticating with Google...',
    'Setting up your session...',
    'Finalizing sign-in...',
    'Redirecting to dashboard...'
  ]

  const currentStepIndex = Math.max(0, steps.findIndex(s =>
    step && s.toLowerCase().includes(step.toLowerCase().split(' ')[0])
  ))

  // Timer for elapsed time and timeout detection
  useEffect(() => {
    const interval = setInterval(() => {
      setElapsedTime(prev => {
        const newTime = prev + 100

        // Show recovery options after specified time
        if (newTime >= showRecoveryAfter && !showRecovery) {
          setShowRecovery(true)
          showInfo('Taking longer than expected? Try refreshing.')
        }

        // Trigger timeout
        if (newTime >= timeoutMs && !isTimedOut) {
          setIsTimedOut(true)
          if (onTimeout) {
            onTimeout()
          } else {
            showError('Sign-in timed out. Please try again.')
          }
        }

        return newTime
      })
    }, 100)

    return () => clearInterval(interval)
  }, [showRecoveryAfter, timeoutMs, showRecovery, isTimedOut, onTimeout, showInfo, showError])

  const performHardRefresh = async () => {
    setIsPerformingHardRefresh(true)
    const toastId = showLoading('Performing hard refresh...')

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

      // Show both toast for immediate feedback and dialog for completion
      updateNotification(toastId, { render: 'Hard refresh completed!', type: 'success', isLoading: false, autoClose: 2000 })
      showSuccess(
        'System Refreshed',
        'Hard refresh completed successfully. Your session has been reset.'
      )

      setTimeout(() => {
        if (onHardRefresh) {
          onHardRefresh()
        } else {
          window.location.reload()
        }
      }, 500)
    } catch (error) {
      console.error('Hard refresh failed:', error)
      updateNotification(toastId, { render: 'Hard refresh failed. Reloading page...', type: 'error', isLoading: false, autoClose: 2000 })
      setTimeout(() => window.location.reload(), 1000)
    }
  }

  const formatTime = (ms) => {
    const seconds = Math.floor(ms / 1000)
    return seconds < 60 ? `${seconds}s` : `${Math.floor(seconds / 60)}m ${seconds % 60}s`
  }

  const getProgressPercentage = () => {
    if (isTimedOut) return 100
    return Math.min((elapsedTime / timeoutMs) * 100, 95)
  }

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="glass-card border-blue-200/20 dark:border-blue-800/20 shadow-2xl p-8 max-w-md mx-4 w-full">
        <div className="flex flex-col items-center space-y-6">
          {/* App Branding */}
          <div className="flex items-center space-x-3 mb-2">
            <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg">
              <HardDrive className="h-6 w-6 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-bold bg-gradient-to-r from-gray-900 to-gray-600 dark:from-white dark:to-gray-300 bg-clip-text text-transparent">
                Gaurav&apos;s Personal Drive
              </h2>
            </div>
          </div>

          {/* Loading Animation */}
          <div className="relative">
            <div className="w-16 h-16 relative">
              <Loader2 className="w-16 h-16 animate-spin text-blue-600 dark:text-blue-400" />
              <div className="absolute inset-0 rounded-full border-2 border-blue-200 dark:border-blue-800 animate-pulse"></div>

              {/* Timeout indicator */}
              {isTimedOut && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <AlertTriangle className="w-6 h-6 text-red-500 animate-pulse" />
                </div>
              )}
            </div>
          </div>

          {/* Status and Progress */}
          <div className="text-center w-full space-y-4">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white">
              {isTimedOut ? 'Sign-in Taking Too Long' : 'Signing you in...'}
            </h3>

            {showSteps && step && !isTimedOut && (
              <p className="text-sm text-gray-600 dark:text-gray-300 animate-pulse">
                {step}
              </p>
            )}

            {/* Progress Bar */}
            <div className="w-full space-y-2">
              <div className="flex justify-between items-center text-xs text-gray-500 dark:text-gray-400">
                <span>Progress</span>
                <span>{formatTime(elapsedTime)}</span>
              </div>
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 overflow-hidden">
                <div
                  className={`h-2 rounded-full transition-all duration-300 ${isTimedOut
                    ? 'bg-gradient-to-r from-red-500 to-orange-500'
                    : 'bg-gradient-to-r from-blue-500 to-purple-600'
                    }`}
                  style={{ width: `${getProgressPercentage()}%` }}
                />
              </div>
            </div>

            {/* Step Progress */}
            {showSteps && !isTimedOut && (
              <div className="space-y-3">
                {steps.map((stepText, index) => (
                  <div
                    key={index}
                    className={`flex items-center text-xs transition-all duration-300 ${index <= currentStepIndex
                      ? 'text-blue-600 dark:text-blue-400'
                      : 'text-gray-400 dark:text-gray-600'
                      }`}
                  >
                    <div
                      className={`w-2 h-2 rounded-full mr-3 transition-all duration-300 ${index < currentStepIndex
                        ? 'bg-green-500 scale-110'
                        : index === currentStepIndex
                          ? 'bg-blue-600 dark:bg-blue-400 animate-pulse scale-110'
                          : 'bg-gray-300 dark:bg-gray-600'
                        }`}
                    />
                    <span className={index === currentStepIndex ? 'font-medium' : ''}>
                      {stepText}
                    </span>
                  </div>
                ))}
              </div>
            )}

            {/* Recovery Options */}
            {(showRecovery || isTimedOut) && (
              <div className="space-y-3 pt-4 border-t border-gray-200/50 dark:border-gray-700/50">
                {isTimedOut && (
                  <div className="text-center">
                    <p className="text-sm text-red-600 dark:text-red-400 mb-3">
                      Authentication timed out. Try one of the options below:
                    </p>
                  </div>
                )}

                <div className="space-y-2">
                  <Button
                    onClick={performHardRefresh}
                    disabled={isPerformingHardRefresh}
                    size="sm"
                    className="w-full glass-button bg-orange-500/10 dark:bg-orange-400/10 hover:bg-orange-500/20 dark:hover:bg-orange-400/20 border border-orange-300/30 dark:border-orange-600/30 text-orange-700 dark:text-orange-300"
                    variant="outline"
                  >
                    {isPerformingHardRefresh ? (
                      <RotateCcw className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <RotateCcw className="w-4 h-4 mr-2" />
                    )}
                    Hard Refresh
                  </Button>

                  <Button
                    onClick={() => window.location.reload()}
                    size="sm"
                    className="w-full glass-button bg-gray-500/10 dark:bg-gray-400/10 hover:bg-gray-500/20 dark:hover:bg-gray-400/20 border border-gray-300/30 dark:border-gray-600/30 text-gray-700 dark:text-gray-300"
                    variant="outline"
                  >
                    <HardDrive className="w-4 h-4 mr-2" />
                    Simple Reload
                  </Button>
                </div>
              </div>
            )}

            {!isTimedOut && (
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {showRecovery
                  ? "Having trouble? Try the recovery options above."
                  : "This may take a few seconds..."
                }
              </p>
            )}
          </div>
        </div>

        {/* Floating elements for visual appeal */}
        <div className="absolute -top-4 -left-4 w-24 h-24 bg-gradient-to-br from-blue-400/20 to-purple-400/20 rounded-full blur-xl"></div>
        <div className="absolute -bottom-4 -right-4 w-32 h-32 bg-gradient-to-br from-purple-400/20 to-blue-400/20 rounded-full blur-xl"></div>
      </div>
    </div>
  )
}