'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Image from 'next/image'
import { signInWithGoogle, getAuthErrorMessage } from '@/lib/auth'
import { useRedirectIfAuthenticated } from '@/components/providers/AuthProvider'
import { Button } from '@/components/ui/button'
import { ThemeToggle } from '@/components/ThemeToggle'
import {
    HardDrive,
    Shield,
    Zap,
    Cloud,
    Lock,
    ArrowRight,
    Loader2,
    AlertCircle,
    CheckCircle2,
} from 'lucide-react'

function LoginContent() {
    const { user, loading: authLoading } = useRedirectIfAuthenticated()
    const [isSigningIn, setIsSigningIn] = useState(false)
    const [error, setError] = useState(null)
    const [mounted, setMounted] = useState(false)
    const router = useRouter()
    const searchParams = useSearchParams()
    const redirect = searchParams.get('redirect') || '/dashboard'

    useEffect(() => {
        setMounted(true)
    }, [])

    const handleGoogleSignIn = async () => {
        setError(null)
        setIsSigningIn(true)

        try {
            const result = await signInWithGoogle()
            if (result.success) {
                router.push(redirect)
            } else {
                setError(result.error || 'Failed to sign in. Please try again.')
            }
        } catch (err) {
            setError(
                err?.code
                    ? getAuthErrorMessage(err.code)
                    : 'An unexpected error occurred. Please try again.'
            )
        } finally {
            setIsSigningIn(false)
        }
    }

    // Show nothing until mounted to prevent hydration mismatch
    if (!mounted || authLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 via-white to-teal-50/30 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950">
                <div className="flex flex-col items-center gap-3">
                    <Loader2 className="w-8 h-8 animate-spin text-teal-500" />
                    <p className="text-sm text-gray-500 dark:text-gray-400">Loading...</p>
                </div>
            </div>
        )
    }

    // If user is already authenticated, show loading while redirecting
    if (user) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 via-white to-teal-50/30 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950">
                <div className="flex flex-col items-center gap-3">
                    <Loader2 className="w-8 h-8 animate-spin text-teal-500" />
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                        Redirecting to dashboard...
                    </p>
                </div>
            </div>
        )
    }

    const features = [
        {
            icon: Shield,
            title: 'Secure Storage',
            description: 'End-to-end encrypted file storage with enterprise-grade security.',
            color: 'from-teal-500 to-cyan-500',
        },
        {
            icon: Zap,
            title: 'Lightning Fast',
            description: 'Optimized uploads and downloads for the best performance.',
            color: 'from-amber-500 to-orange-500',
        },
        {
            icon: Cloud,
            title: 'Access Anywhere',
            description: 'Your files available on any device, anytime, anywhere.',
            color: 'from-purple-500 to-pink-500',
        },
    ]

    return (
        <div className="min-h-screen flex flex-col lg:flex-row relative overflow-hidden">
            {/* Theme toggle - absolute top right */}
            <div className="absolute top-4 right-4 z-50">
                <ThemeToggle />
            </div>

            {/* ===================== LEFT PANEL — Info Section ===================== */}
            <div className="relative w-full lg:w-1/2 flex flex-col justify-center px-6 py-12 sm:px-12 lg:px-16 xl:px-20 bg-gradient-to-br from-teal-600 via-teal-700 to-cyan-800 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 text-white overflow-hidden">
                {/* Decorative blobs */}
                <div className="absolute -top-24 -left-24 w-72 h-72 bg-white/10 rounded-full blur-3xl pointer-events-none" />
                <div className="absolute -bottom-32 -right-32 w-96 h-96 bg-cyan-400/10 rounded-full blur-3xl pointer-events-none" />
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-teal-400/5 rounded-full blur-3xl pointer-events-none" />

                <div className="relative z-10 max-w-lg mx-auto lg:mx-0 animate-fade-in">
                    {/* Logo & Title */}
                    <div className="flex items-center gap-4 mb-8">
                        <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center shadow-xl">
                            <Image
                                src="/logo-1024.png"
                                alt="Gaurav's Personal Drive"
                                width={48}
                                height={48}
                                className="w-12 h-12 object-contain"
                                priority
                            />
                        </div>
                        <div>
                            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
                                Gaurav&apos;s Personal Drive
                            </h1>
                            <p className="text-sm text-teal-100/80 dark:text-gray-400 mt-0.5">
                                Your private cloud storage
                            </p>
                        </div>
                    </div>

                    {/* Tagline */}
                    <p className="text-lg sm:text-xl text-teal-50/90 dark:text-gray-300 leading-relaxed mb-10">
                        Store, manage, and access your files securely from anywhere.
                        Built for speed, privacy, and simplicity.
                    </p>

                    {/* Feature list */}
                    <div className="space-y-5">
                        {features.map((feature, index) => (
                            <div
                                key={feature.title}
                                className="flex items-start gap-4 group"
                                style={{ animationDelay: `${index * 100 + 200}ms` }}
                            >
                                <div
                                    className={`flex-shrink-0 w-10 h-10 rounded-xl bg-gradient-to-br ${feature.color} flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300`}
                                >
                                    <feature.icon className="w-5 h-5 text-white" />
                                </div>
                                <div>
                                    <h3 className="font-semibold text-white text-sm sm:text-base">
                                        {feature.title}
                                    </h3>
                                    <p className="text-sm text-teal-100/70 dark:text-gray-400 leading-snug mt-0.5">
                                        {feature.description}
                                    </p>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Bottom badge — hidden on mobile for cleanliness */}
                    <div className="hidden lg:flex items-center gap-2 mt-12 pt-8 border-t border-white/10">
                        <Lock className="w-4 h-4 text-teal-200/60" />
                        <span className="text-xs text-teal-200/60">
                            Protected by Firebase Authentication
                        </span>
                    </div>
                </div>
            </div>

            {/* ===================== RIGHT PANEL — Sign-In Form ===================== */}
            <div className="relative w-full lg:w-1/2 flex items-center justify-center px-6 py-12 sm:px-12 lg:px-16 bg-gradient-to-br from-gray-50 via-white to-teal-50/30 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950">
                {/* Subtle decorative elements */}
                <div className="absolute top-20 right-20 w-40 h-40 bg-teal-200/20 dark:bg-teal-800/10 rounded-full blur-3xl pointer-events-none" />
                <div className="absolute bottom-20 left-20 w-32 h-32 bg-purple-200/20 dark:bg-purple-800/10 rounded-full blur-3xl pointer-events-none" />

                <div className="relative z-10 w-full max-w-md animate-fade-in">
                    {/* Welcome text */}
                    <div className="text-center mb-8">
                        {/* Mobile-only logo (since left panel is above on mobile) */}
                        <div className="lg:hidden flex justify-center mb-4">
                            <div className="w-16 h-16 bg-gradient-to-br from-teal-500 to-cyan-600 rounded-2xl flex items-center justify-center shadow-lg">
                                <Image
                                    src="/logo-1024.png"
                                    alt="Gaurav's Personal Drive"
                                    width={48}
                                    height={48}
                                    className="w-12 h-12 object-contain brightness-0 invert"
                                    priority
                                />
                            </div>
                        </div>
                        <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">
                            Welcome back
                        </h2>
                        <p className="mt-2 text-gray-500 dark:text-gray-400">
                            Sign in to access your personal drive
                        </p>
                    </div>

                    {/* Sign-in card */}
                    <div className="glass-card p-6 sm:p-8 rounded-2xl border border-gray-200/50 dark:border-gray-700/50 shadow-xl bg-white/70 dark:bg-gray-800/50 backdrop-blur-xl">
                        {/* Error message */}
                        {error && (
                            <div className="mb-6 p-4 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200/50 dark:border-red-800/30 flex items-start gap-3 animate-fade-in">
                                <AlertCircle className="w-5 h-5 text-red-500 dark:text-red-400 flex-shrink-0 mt-0.5" />
                                <div>
                                    <p className="text-sm font-medium text-red-800 dark:text-red-300">
                                        Sign-in failed
                                    </p>
                                    <p className="text-sm text-red-600 dark:text-red-400 mt-0.5">
                                        {error}
                                    </p>
                                </div>
                            </div>
                        )}

                        {/* Google Sign-In Button */}
                        <Button
                            onClick={handleGoogleSignIn}
                            disabled={isSigningIn}
                            className="w-full h-12 sm:h-14 rounded-xl text-base font-medium bg-gray-900 dark:bg-white text-white dark:text-gray-900 hover:bg-gray-800 dark:hover:bg-gray-100 shadow-lg hover:shadow-xl transition-all duration-300 flex items-center justify-center gap-3 disabled:opacity-70 disabled:cursor-not-allowed"
                        >
                            {isSigningIn ? (
                                <>
                                    <Loader2 className="w-5 h-5 animate-spin" />
                                    Signing in...
                                </>
                            ) : (
                                <>
                                    {/* Google "G" icon */}
                                    <svg
                                        className="w-5 h-5"
                                        viewBox="0 0 24 24"
                                        xmlns="http://www.w3.org/2000/svg"
                                    >
                                        <path
                                            d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
                                            fill="#4285F4"
                                        />
                                        <path
                                            d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                                            fill="#34A853"
                                        />
                                        <path
                                            d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                                            fill="#FBBC05"
                                        />
                                        <path
                                            d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                                            fill="#EA4335"
                                        />
                                    </svg>
                                    Continue with Google
                                </>
                            )}
                        </Button>

                        {/* Divider */}
                        <div className="relative my-6">
                            <div className="absolute inset-0 flex items-center">
                                <div className="w-full border-t border-gray-200 dark:border-gray-700" />
                            </div>
                            <div className="relative flex justify-center text-xs">
                                <span className="bg-white dark:bg-gray-800 px-3 text-gray-400 dark:text-gray-500 rounded">
                                    Secure authentication
                                </span>
                            </div>
                        </div>

                        {/* Security badges */}
                        <div className="grid grid-cols-3 gap-3">
                            {[
                                { icon: Shield, label: 'Encrypted' },
                                { icon: Lock, label: 'Private' },
                                { icon: CheckCircle2, label: 'Verified' },
                            ].map((badge) => (
                                <div
                                    key={badge.label}
                                    className="flex flex-col items-center gap-1.5 py-3 rounded-xl bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-700/50"
                                >
                                    <badge.icon className="w-4 h-4 text-teal-500 dark:text-teal-400" />
                                    <span className="text-xs text-gray-500 dark:text-gray-400 font-medium">
                                        {badge.label}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Footer */}
                    <p className="text-center text-xs text-gray-400 dark:text-gray-500 mt-6">
                        By signing in, you agree to our{' '}
                        <a
                            href="/terms"
                            className="underline hover:text-teal-600 dark:hover:text-teal-400 transition-colors"
                        >
                            Terms of Service
                        </a>{' '}
                        and{' '}
                        <a
                            href="/privacy"
                            className="underline hover:text-teal-600 dark:hover:text-teal-400 transition-colors"
                        >
                            Privacy Policy
                        </a>
                    </p>
                </div>
            </div>
        </div>
    )
}

export default function LoginPage() {
    return (
        <Suspense
            fallback={
                <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 via-white to-teal-50/30 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950">
                    <div className="flex flex-col items-center gap-3">
                        <Loader2 className="w-8 h-8 animate-spin text-teal-500" />
                        <p className="text-sm text-gray-500 dark:text-gray-400">Loading...</p>
                    </div>
                </div>
            }
        >
            <LoginContent />
        </Suspense>
    )
}
