'use client'

import { useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { AlertTriangle, RefreshCw, Home } from 'lucide-react'
import Link from 'next/link'

export default function Error({
    error,
    reset,
}: {
    error: Error & { digest?: string }
    reset: () => void
}) {
    useEffect(() => {
        // Log the error to an error reporting service
        console.error(error)
    }, [error])

    return (
        <div className="min-h-screen flex items-center justify-center bg-background/95 backdrop-blur-xl relative overflow-hidden">

            {/* Background Decor */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-red-500/10 rounded-full blur-[100px]" />

            <div className="relative z-10 text-center space-y-8 p-8 max-w-md w-full glass-card border-red-500/20">

                {/* Icon Container */}
                <div className="mx-auto w-24 h-24 relative">
                    <div className="absolute inset-0 bg-red-500/20 rounded-full animate-ping opacity-20" />
                    <div className="relative bg-red-100 dark:bg-red-900/30 w-full h-full rounded-full flex items-center justify-center border border-red-200 dark:border-red-900/50">
                        <AlertTriangle className="w-10 h-10 text-red-600 dark:text-red-400" />
                    </div>
                </div>

                <div className="space-y-4">
                    <h2 className="text-2xl font-bold text-foreground">Something went wrong!</h2>
                    <p className="text-muted-foreground text-sm">
                        We encountered an unexpected error. Don&apos;t worry, nothing is lost.
                    </p>
                    {process.env.NODE_ENV === 'development' && (
                        <p className="text-xs font-mono bg-muted p-2 rounded text-red-500 break-all">
                            {error.message}
                        </p>
                    )}
                </div>

                <div className="flex flex-col gap-3">
                    <Button
                        onClick={reset}
                        size="lg"
                        className="w-full bg-red-600 hover:bg-red-700 text-white shadow-lg hover:shadow-red-500/25"
                    >
                        <RefreshCw className="mr-2 h-4 w-4" />
                        Try again
                    </Button>

                    <Button asChild variant="ghost" size="sm">
                        <Link href="/dashboard">
                            <Home className="mr-2 h-4 w-4" />
                            Return directly to Dashboard
                        </Link>
                    </Button>
                </div>
            </div>
        </div>
    )
}
