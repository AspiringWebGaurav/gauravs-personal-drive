'use client'

import React, { createContext, useContext, useState, useCallback, useRef } from 'react'
import { NotificationDialog, NotificationType } from '@/components/ui/NotificationDialog'

interface NotificationData {
  id: string
  type: NotificationType
  title: string
  description?: string
  autoClose?: boolean
  autoCloseDuration?: number
  showCloseButton?: boolean
}

interface NotificationContextValue {
  showNotification: (notification: Omit<NotificationData, 'id'>) => string
  hideNotification: (id: string) => void
  showSuccess: (title: string, description?: string, options?: Partial<NotificationData>) => string
  showInfo: (title: string, description?: string, options?: Partial<NotificationData>) => string
  showWarning: (title: string, description?: string, options?: Partial<NotificationData>) => string
  showError: (title: string, description?: string, options?: Partial<NotificationData>) => string
  clearAll: () => void
}

const NotificationContext = createContext<NotificationContextValue | undefined>(undefined)

export function useNotification() {
  const context = useContext(NotificationContext)
  if (!context) {
    throw new Error('useNotification must be used within a NotificationProvider')
  }
  return context
}

interface NotificationProviderProps {
  children: React.ReactNode
  maxNotifications?: number
}

export function NotificationProvider({ 
  children, 
  maxNotifications = 3 
}: NotificationProviderProps) {
  const [notifications, setNotifications] = useState<NotificationData[]>([])
  const idCounter = useRef(0)

  // Generate unique ID for notifications
  const generateId = useCallback(() => {
    idCounter.current += 1
    return `notification-${Date.now()}-${idCounter.current}`
  }, [])

  // Add a notification
  const showNotification = useCallback((
    notification: Omit<NotificationData, 'id'>
  ) => {
    const id = generateId()
    const newNotification: NotificationData = {
      id,
      autoClose: true,
      autoCloseDuration: 3000,
      showCloseButton: true,
      ...notification
    }

    setNotifications(prev => {
      // Remove oldest notification if we're at the limit
      const updated = prev.length >= maxNotifications 
        ? prev.slice(1) 
        : prev
      
      return [...updated, newNotification]
    })

    return id
  }, [generateId, maxNotifications])

  // Remove a specific notification
  const hideNotification = useCallback((id: string) => {
    setNotifications(prev => prev.filter(notification => notification.id !== id))
  }, [])

  // Convenience methods for different types
  const showSuccess = useCallback((
    title: string, 
    description?: string, 
    options?: Partial<NotificationData>
  ) => {
    return showNotification({
      type: 'success',
      title,
      description,
      ...options
    })
  }, [showNotification])

  const showInfo = useCallback((
    title: string, 
    description?: string, 
    options?: Partial<NotificationData>
  ) => {
    return showNotification({
      type: 'info',
      title,
      description,
      ...options
    })
  }, [showNotification])

  const showWarning = useCallback((
    title: string, 
    description?: string, 
    options?: Partial<NotificationData>
  ) => {
    return showNotification({
      type: 'warning',
      title,
      description,
      ...options
    })
  }, [showNotification])

  const showError = useCallback((
    title: string, 
    description?: string, 
    options?: Partial<NotificationData>
  ) => {
    return showNotification({
      type: 'error',
      title,
      description,
      autoClose: false, // Errors should stay visible by default
      ...options
    })
  }, [showNotification])

  // Clear all notifications
  const clearAll = useCallback(() => {
    setNotifications([])
  }, [])

  const contextValue: NotificationContextValue = {
    showNotification,
    hideNotification,
    showSuccess,
    showInfo,
    showWarning,
    showError,
    clearAll
  }

  return (
    <NotificationContext.Provider value={contextValue}>
      {children}
      
      {/* Render notification dialogs */}
      {notifications.map((notification, index) => (
        <NotificationDialog
          key={notification.id}
          open={true}
          onOpenChange={(open) => {
            if (!open) {
              hideNotification(notification.id)
            }
          }}
          type={notification.type}
          title={notification.title}
          description={notification.description}
          autoClose={notification.autoClose}
          autoCloseDuration={notification.autoCloseDuration}
          showCloseButton={notification.showCloseButton}
          className={`z-[${60 + index}]`} // Stack notifications with increasing z-index
        />
      ))}
    </NotificationContext.Provider>
  )
}

// Additional hook for replacing console.log completion messages
export function useCompletionNotification() {
  const { showSuccess, showInfo } = useNotification()
  
  // Helper to replace console.log completion messages
  const logCompletion = useCallback((
    message: string, 
    details?: string,
    showDialog: boolean = true
  ) => {
    // Always log to console for debugging
    console.log(`✅ ${message}`, details ? `- ${details}` : '')
    
    // Optionally show dialog notification
    if (showDialog) {
      showSuccess(
        message.replace('✅ ', ''), 
        details,
        { autoCloseDuration: 2000 }
      )
    }
  }, [showSuccess])

  // Helper for authentication completions
  const logAuthCompletion = useCallback((
    message: string,
    duration?: number,
    showDialog: boolean = false // Auth messages are usually too frequent for dialogs
  ) => {
    const fullMessage = duration 
      ? `${message} (${duration}ms)`
      : message
    
    console.log(`🎉 ${fullMessage}`)
    
    if (showDialog) {
      showInfo(
        'Authentication Complete',
        fullMessage,
        { autoCloseDuration: 1500 }
      )
    }
  }, [showInfo])

  // Helper for upload completions
  const logUploadCompletion = useCallback((
    fileName: string,
    showDialog: boolean = true
  ) => {
    const message = `Upload completed for: ${fileName}`
    console.log(`✅ UPLOAD DEBUG: ${message}`)
    
    if (showDialog) {
      showSuccess(
        'Upload Complete',
        `${fileName} has been uploaded successfully`,
        { autoCloseDuration: 2500 }
      )
    }
  }, [showSuccess])

  return {
    logCompletion,
    logAuthCompletion,
    logUploadCompletion
  }
}