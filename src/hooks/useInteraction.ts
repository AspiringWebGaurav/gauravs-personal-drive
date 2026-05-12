'use client'

import { useCallback, useRef, useEffect, useState } from 'react'

interface UseInteractionOptions {
  /** Called to open the item (desktop double-click, mobile single-tap) */
  onOpen: () => void
  /** Called to select the item (desktop single-click, mobile long-press or single-tap if in selection mode) */
  onSelect: (e?: React.MouseEvent | React.PointerEvent) => void
  /** Whether the list is currently in selection mode */
  selectionMode?: boolean
  /** Disable all interactions */
  disabled?: boolean
  /** Long press duration in ms. Default: 500 */
  longPressInterval?: number
}

interface InteractionHandlers {
  onPointerDown: (e: React.PointerEvent) => void
  onPointerMove: (e: React.PointerEvent) => void
  onPointerUp: (e: React.PointerEvent) => void
  onPointerCancel: (e: React.PointerEvent) => void
  onClick: (e: React.MouseEvent) => void
  onDoubleClick: (e: React.MouseEvent) => void
  onKeyDown: (e: React.KeyboardEvent) => void
}

export function useInteraction(options: UseInteractionOptions): {
  handlers: InteractionHandlers
} {
  const {
    onOpen,
    onSelect,
    selectionMode = false,
    disabled = false,
    longPressInterval = 500,
  } = options

  const longPressTimerRef = useRef<NodeJS.Timeout | null>(null)
  const isPointerDownRef = useRef(false)
  const startPosRef = useRef<{ x: number; y: number } | null>(null)
  const longPressFiredRef = useRef(false)
  
  // Track if we are on a touch device
  const [isTouch, setIsTouch] = useState(false)

  useEffect(() => {
    // Detect coarse pointer (touch) on mount
    const mediaQuery = window.matchMedia('(pointer: coarse)')
    setIsTouch(mediaQuery.matches)
    
    const handler = (e: MediaQueryListEvent) => setIsTouch(e.matches)
    mediaQuery.addEventListener('change', handler)
    return () => mediaQuery.removeEventListener('change', handler)
  }, [])

  const clearLongPress = useCallback(() => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current)
      longPressTimerRef.current = null
    }
  }, [])

  const onPointerDown = useCallback(
    (e: React.PointerEvent) => {
      if (disabled) return
      if (e.button !== 0 && e.pointerType === 'mouse') return // Only left clicks
      
      isPointerDownRef.current = true
      startPosRef.current = { x: e.clientX, y: e.clientY }
      longPressFiredRef.current = false

      // Only setup long press on touch
      if (e.pointerType === 'touch' || e.pointerType === 'pen') {
        clearLongPress()
        longPressTimerRef.current = setTimeout(() => {
          if (isPointerDownRef.current) {
            longPressFiredRef.current = true
            // Vibrate slightly if possible
            if (typeof navigator !== 'undefined' && navigator.vibrate) {
              navigator.vibrate(50)
            }
            onSelect(e)
          }
        }, longPressInterval)
      }
    },
    [disabled, onSelect, longPressInterval, clearLongPress]
  )

  const onPointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!isPointerDownRef.current || !startPosRef.current) return

      // If user moved finger too much, cancel long press
      const dx = Math.abs(e.clientX - startPosRef.current.x)
      const dy = Math.abs(e.clientY - startPosRef.current.y)
      if (dx > 10 || dy > 10) {
        clearLongPress()
      }
    },
    [clearLongPress]
  )

  const onPointerUp = useCallback(
    (e: React.PointerEvent) => {
      if (!isPointerDownRef.current) return
      isPointerDownRef.current = false
      clearLongPress()

      // If this was a touch interaction and long press didn't fire, it's a tap
      if ((e.pointerType === 'touch' || e.pointerType === 'pen') && !longPressFiredRef.current) {
        // Did we move a lot? Then it's a swipe/scroll, ignore tap
        if (startPosRef.current) {
          const dx = Math.abs(e.clientX - startPosRef.current.x)
          const dy = Math.abs(e.clientY - startPosRef.current.y)
          if (dx > 15 || dy > 15) return
        }
        
        if (selectionMode) {
          onSelect(e)
        } else {
          onOpen()
        }
      }
    },
    [clearLongPress, selectionMode, onOpen, onSelect]
  )

  const onPointerCancel = useCallback(
    (e: React.PointerEvent) => {
      isPointerDownRef.current = false
      clearLongPress()
    },
    [clearLongPress]
  )

  // Mouse fallback handlers (Desktop behavior)
  const onClick = useCallback(
    (e: React.MouseEvent) => {
      if (disabled || isTouch) return
      // Default left click action: select
      onSelect(e)
    },
    [disabled, isTouch, onSelect]
  )

  const onDoubleClick = useCallback(
    (e: React.MouseEvent) => {
      if (disabled || isTouch) return
      e.preventDefault()
      onOpen()
    },
    [disabled, isTouch, onOpen]
  )

  const onKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (disabled) return
      if (e.key === 'Enter') {
        e.preventDefault()
        onOpen()
      } else if (e.key === ' ') {
        e.preventDefault()
        onSelect()
      }
    },
    [disabled, onOpen, onSelect]
  )

  return {
    handlers: {
      onPointerDown,
      onPointerMove,
      onPointerUp,
      onPointerCancel,
      onClick,
      onDoubleClick,
      onKeyDown,
    },
  }
}
