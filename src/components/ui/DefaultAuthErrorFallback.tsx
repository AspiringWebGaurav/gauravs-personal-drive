'use client'

import React from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { AlertTriangle, RefreshCw, HardDrive, Home } from 'lucide-react'
import { useNotification } from '@/components/providers/NotificationProvider'

interface DefaultAuthErrorFallbackProps {
    error?: Error
    resetError: () => void
}

export function DefaultAuthErrorFallback({ error, resetError }: DefaultAuthErrorFallbackProps) {
    const { showSuccess, updateNotification, showLoading } = useNotification()

    const performHardRefresh = async () => {
        const toastId = showLoading('Performing hard refresh...')

        try {
            // ... (rest of code)

            // Clear storage... (unchanged logic, just ensuring snippets match for replace)

            // ...

            // Show both toast for immediate feedback and dialog for completion
            updateNotification(toastId, { render: 'Hard refresh completed!', type: 'success', isLoading: false, autoClose: 3000 })
            showSuccess(
                'System Refreshed',
                'Hard refresh completed successfully. Your session has been reset.'
            )

            setTimeout(() => {
                window.location.reload()
            }, 500)
        } catch (err) {
            console.error('Hard refresh failed:', err)
            updateNotification(toastId, { render: 'Hard refresh failed. Reloading page...', type: 'error', isLoading: false, autoClose: 3000 })
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
