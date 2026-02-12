'use client'

import { useEffect, useRef, useCallback } from 'react'

interface SwipeGestureOptions {
  onSwipeLeft?: () => void
  onSwipeRight?: () => void
  onSwipeUp?: () => void
  onSwipeDown?: () => void
  threshold?: number
  enabled?: boolean
}

/**
 * Swipe gesture hook using refs for touch tracking (no re-renders).
 */
export function useSwipeGesture(options: SwipeGestureOptions) {
  const {
    onSwipeLeft,
    onSwipeRight,
    onSwipeUp,
    onSwipeDown,
    threshold = 50,
    enabled = true
  } = options

  const elementRef = useRef<HTMLElement>(null)
  // Use refs instead of state for transient touch data
  const touchStartRef = useRef<{ x: number; y: number } | null>(null)
  const touchEndRef = useRef<{ x: number; y: number } | null>(null)

  // Stable callback refs to avoid stale closures
  // Stable callback refs to avoid stale closures
  const callbacksRef = useRef({ onSwipeLeft, onSwipeRight, onSwipeUp, onSwipeDown })

  useEffect(() => {
    callbacksRef.current = { onSwipeLeft, onSwipeRight, onSwipeUp, onSwipeDown }
  }, [onSwipeLeft, onSwipeRight, onSwipeUp, onSwipeDown])

  useEffect(() => {
    const element = elementRef.current
    if (!element || !enabled) return

    const handleTouchStart = (e: TouchEvent) => {
      const touch = e.touches[0]
      touchStartRef.current = { x: touch.clientX, y: touch.clientY }
      touchEndRef.current = null
    }

    const handleTouchMove = (e: TouchEvent) => {
      if (!touchStartRef.current) return
      const touch = e.touches[0]
      touchEndRef.current = { x: touch.clientX, y: touch.clientY }
    }

    const handleTouchEnd = () => {
      const start = touchStartRef.current
      const end = touchEndRef.current
      if (!start || !end) {
        touchStartRef.current = null
        touchEndRef.current = null
        return
      }

      const distanceX = start.x - end.x
      const distanceY = start.y - end.y
      const { onSwipeLeft, onSwipeRight, onSwipeUp, onSwipeDown } = callbacksRef.current

      if (Math.abs(distanceX) > Math.abs(distanceY)) {
        if (distanceX > threshold && onSwipeLeft) onSwipeLeft()
        else if (distanceX < -threshold && onSwipeRight) onSwipeRight()
      } else {
        if (distanceY > threshold && onSwipeUp) onSwipeUp()
        else if (distanceY < -threshold && onSwipeDown) onSwipeDown()
      }

      touchStartRef.current = null
      touchEndRef.current = null
    }

    element.addEventListener('touchstart', handleTouchStart, { passive: true })
    element.addEventListener('touchmove', handleTouchMove, { passive: true })
    element.addEventListener('touchend', handleTouchEnd, { passive: true })

    return () => {
      element.removeEventListener('touchstart', handleTouchStart)
      element.removeEventListener('touchmove', handleTouchMove)
      element.removeEventListener('touchend', handleTouchEnd)
    }
  }, [enabled, threshold])

  return { elementRef }
}