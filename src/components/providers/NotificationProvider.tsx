'use client'

import React, { createContext, useContext, useCallback } from 'react'
import { toast, ToastOptions, Id } from 'react-toastify'

interface NotificationContextValue {
  showSuccess: (title: string, description?: string, options?: ToastOptions) => Id
  showInfo: (title: string, description?: string, options?: ToastOptions) => Id
  showWarning: (title: string, description?: string, options?: ToastOptions) => Id
  showError: (title: string, description?: string, options?: ToastOptions) => Id
  showLoading: (message: string, options?: ToastOptions) => Id
  updateNotification: (id: Id, options: ToastOptions & { render: string }) => void
  dismiss: (id?: Id) => void
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
}

export function NotificationProvider({ children }: NotificationProviderProps) {

  // Default options for "Rigid" system
  // Default options for "Rigid" system
  const defaultOptions: ToastOptions = React.useMemo(() => ({
    position: "top-right",
    autoClose: 2000,
    hideProgressBar: false,
    closeOnClick: true,
    pauseOnHover: false,
    draggable: true,
    progress: undefined,
  }), [])

  const showSuccess = useCallback((title: string, description?: string, options?: ToastOptions) => {
    return toast.success(
      <div>
        <div className="font-semibold">{title}</div>
        {description && <div className="text-sm opacity-90">{description}</div>}
      </div>,
      { ...defaultOptions, ...options }
    )
  }, [defaultOptions])

  const showInfo = useCallback((title: string, description?: string, options?: ToastOptions) => {
    return toast.info(
      <div>
        <div className="font-semibold">{title}</div>
        {description && <div className="text-sm opacity-90">{description}</div>}
      </div>,
      { ...defaultOptions, ...options }
    )
  }, [defaultOptions])

  const showWarning = useCallback((title: string, description?: string, options?: ToastOptions) => {
    return toast.warning(
      <div>
        <div className="font-semibold">{title}</div>
        {description && <div className="text-sm opacity-90">{description}</div>}
      </div>,
      { ...defaultOptions, ...options }
    )
  }, [defaultOptions])

  const showError = useCallback((title: string, description?: string, options?: ToastOptions) => {
    return toast.error(
      <div>
        <div className="font-semibold">{title}</div>
        {description && <div className="text-sm opacity-90">{description}</div>}
      </div>,
      { ...defaultOptions, ...options, autoClose: 4000 } // Errors stay longer
    )
  }, [defaultOptions])

  const showLoading = useCallback((message: string, options?: ToastOptions) => {
    return toast.loading(message, { ...defaultOptions, ...options, autoClose: false, closeOnClick: false })
  }, [defaultOptions])

  const updateNotification = useCallback((id: Id, options: ToastOptions & { render: string }) => {
    toast.update(id, { ...defaultOptions, ...options })
  }, [defaultOptions])

  const dismiss = useCallback((id?: Id) => {
    toast.dismiss(id)
  }, [])

  const contextValue: NotificationContextValue = {
    showSuccess,
    showInfo,
    showWarning,
    showError,
    showLoading,
    updateNotification,
    dismiss
  }

  return (
    <NotificationContext.Provider value={contextValue}>
      {children}
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
        details
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
        fullMessage
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
        `${fileName} has been uploaded successfully`
      )
    }
  }, [showSuccess])

  return {
    logCompletion,
    logAuthCompletion,
    logUploadCompletion
  }
}