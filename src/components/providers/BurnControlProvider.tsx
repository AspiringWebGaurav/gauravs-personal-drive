'use client'

import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react'
import { useAuth } from './AuthProvider'
import { logger } from '@/lib/logger'

// Idle timeouts in milliseconds
const IDLE_TIMEOUT_MS = 2 * 60 * 1000 // 2 minutes
const SLEEP_TIMEOUT_MS = 10 * 60 * 1000 // 10 minutes

interface BurnControlContextType {
    isIdle: boolean
    isSleeping: boolean
    resetTimer: () => void
    syncStatus: 'active' | 'passive' | 'suspended'
}

const BurnControlContext = createContext<BurnControlContextType | undefined>(undefined)

export function BurnControlProvider({ children }: { children: React.ReactNode }) {
    const { user, signOut } = useAuth()
    const [isIdle, setIsIdle] = useState(false)
    const [isSleeping, setIsSleeping] = useState(false)
    const [isVisible, setIsVisible] = useState(true) // Default to visible
    const [isOnline, setIsOnline] = useState(true)   // Default to online

    // Timers
    const idleTimerRef = useRef<NodeJS.Timeout | null>(null)
    const sleepTimerRef = useRef<NodeJS.Timeout | null>(null)

    // Derived Sync Status
    // Active: User active + Tab visible + Online
    // Passive: User idle OR Tab hidden + Online
    // Suspended: Offline OR Sleeping
    const syncStatus: 'active' | 'passive' | 'suspended' = (() => {
        if (!isOnline || isSleeping) return 'suspended'
        if (isIdle || !isVisible) return 'passive'
        return 'active'
    })()

    const resetTimer = useCallback(() => {
        if (isSleeping) return

        // Wake up if idle
        if (isIdle) {
            setIsIdle(false)
            logger.info('BurnControl: Waking up from Idle')
        }

        // Clear existing timers
        if (idleTimerRef.current) clearTimeout(idleTimerRef.current)
        if (sleepTimerRef.current) clearTimeout(sleepTimerRef.current)

        // Set new timers
        idleTimerRef.current = setTimeout(() => {
            setIsIdle(true)
            logger.info('BurnControl: Entering Idle Mode (Pausing polls)')
        }, IDLE_TIMEOUT_MS)

        sleepTimerRef.current = setTimeout(() => {
            setIsSleeping(true)
            logger.info('BurnControl: Entering Sleep Mode (Auto-Logout)')
            handleSleep()
        }, SLEEP_TIMEOUT_MS)
    }, [isIdle, isSleeping])

    const handleSleep = async () => {
        if (!user) return
        try {
            await signOut()
            window.location.href = '/login?reason=timeout'
        } catch (error) {
            logger.error('BurnControl: Auto-logout failed', error)
        }
    }

    // Activity listeners
    useEffect(() => {
        if (!user) return

        const events = ['mousedown', 'keydown', 'touchstart', 'scroll', 'mousemove', 'wheel']
        const handleActivity = () => resetTimer()

        let lastActivity = Date.now()
        const throttledActivity = () => {
            const now = Date.now()
            if (now - lastActivity > 1000) {
                resetTimer()
                lastActivity = now
            }
        }

        events.forEach(event => {
            if (event === 'mousemove' || event === 'wheel' || event === 'scroll') {
                window.addEventListener(event, throttledActivity, { passive: true })
            } else {
                window.addEventListener(event, handleActivity, { passive: true })
            }
        })

        // Visibility Change Listener
        const handleVisibilityChange = () => {
            const visible = document.visibilityState === 'visible'
            setIsVisible(visible)
            logger.info(`BurnControl: Visibility changed to ${visible ? 'Visible' : 'Hidden'}`)
            if (visible) resetTimer() // Wake up on visibility
        }
        document.addEventListener('visibilitychange', handleVisibilityChange)

        // Network Status Listeners
        const handleOnline = () => {
            setIsOnline(true)
            logger.info('BurnControl: Network Online')
            resetTimer()
        }
        const handleOffline = () => {
            setIsOnline(false)
            logger.info('BurnControl: Network Offline')
        }
        window.addEventListener('online', handleOnline)
        window.addEventListener('offline', handleOffline)

        // Set initial states
        setIsVisible(document.visibilityState === 'visible')
        setIsOnline(navigator.onLine)

        // Initial start
        resetTimer()

        return () => {
            events.forEach(event => {
                if (event === 'mousemove' || event === 'wheel' || event === 'scroll') {
                    window.removeEventListener(event, throttledActivity)
                } else {
                    window.removeEventListener(event, handleActivity)
                }
            })
            document.removeEventListener('visibilitychange', handleVisibilityChange)
            window.removeEventListener('online', handleOnline)
            window.removeEventListener('offline', handleOffline)

            if (idleTimerRef.current) clearTimeout(idleTimerRef.current)
            if (sleepTimerRef.current) clearTimeout(sleepTimerRef.current)
        }
    }, [user, resetTimer])

    return (
        <BurnControlContext.Provider value={{ isIdle, isSleeping, resetTimer, syncStatus }}>
            {children}
            {/* Debug Indicator (Optional, can be removed or behind a flag) */}

        </BurnControlContext.Provider>
    )
}

export function useBurnControl() {
    const context = useContext(BurnControlContext)
    if (context === undefined) {
        throw new Error('useBurnControl must be used within a BurnControlProvider')
    }
    return context
}
