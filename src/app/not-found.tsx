import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { FileQuestion, Home } from 'lucide-react'

export default function NotFound() {
    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-500/20 via-purple-500/20 to-pink-500/20 dark:from-indigo-900/40 dark:via-purple-900/40 dark:to-pink-900/40 relative overflow-hidden">

            {/* Background Decor */}
            <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-500/30 rounded-full blur-[128px] animate-pulse" />
            <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-500/30 rounded-full blur-[128px] animate-pulse delay-1000" />

            <div className="relative z-10 text-center space-y-8 p-8 max-w-md w-full">

                {/* Icon Container */}
                <div className="mx-auto w-32 h-32 relative">
                    <div className="absolute inset-0 bg-gradient-to-tr from-blue-500 to-purple-500 rounded-3xl rotate-6 opacity-20 animate-pulse" />
                    <div className="absolute inset-0 bg-background/50 backdrop-blur-xl rounded-3xl border border-white/20 shadow-2xl flex items-center justify-center">
                        <FileQuestion className="w-16 h-16 text-foreground/80" />
                    </div>
                </div>

                <div className="space-y-4">
                    <h1 className="text-6xl font-bold tracking-tighter bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-purple-600 dark:from-blue-400 dark:to-purple-400">
                        404
                    </h1>
                    <h2 className="text-2xl font-semibold text-foreground">Page Not Found</h2>
                    <p className="text-muted-foreground">
                        The file or folder you&apos;re looking for seems to have vanished into the digital void.
                    </p>
                </div>

                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                    <Button asChild size="lg" className="rounded-full shadow-lg hover:shadow-xl transition-all duration-300">
                        <Link href="/dashboard">
                            <Home className="mr-2 h-4 w-4" />
                            Go to Dashboard
                        </Link>
                    </Button>
                    <Button asChild variant="outline" size="lg" className="rounded-full bg-background/50 backdrop-blur-sm border-white/20 hover:bg-background/80">
                        <Link href="/">
                            Return Home
                        </Link>
                    </Button>
                </div>
            </div>
        </div>
    )
}
