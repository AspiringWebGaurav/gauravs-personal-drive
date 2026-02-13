'use client'

import { Loader2 } from 'lucide-react'

export function LoadingSpinner({ size = 'default', className = '', fullScreen = false, label = '' }) {
  const sizeClasses = {
    sm: 'h-4 w-4',
    default: 'h-6 w-6',
    lg: 'h-10 w-10',
    xl: 'h-16 w-16'
  }

  const spinner = (
    <div className={`flex flex-col items-center justify-center gap-4 min-h-[200px] ${className}`}>
      <div className="relative">
        <Loader2 className={`animate-spin text-teal-600 dark:text-teal-400 ${sizeClasses[size]}`} />
        {fullScreen && (
          <div className={`absolute inset-0 rounded-full border-2 border-teal-200 dark:border-teal-800 animate-pulse ${sizeClasses[size]}`}></div>
        )}
      </div>
      {label && (
        <p className="text-sm font-medium text-gray-600 dark:text-gray-300 animate-pulse">
          {label}
        </p>
      )}
    </div>
  )

  if (fullScreen) {
    return (
      <div className="fixed inset-0 z-[100] flex items-center justify-center bg-white/60 dark:bg-gray-950/60 backdrop-blur-xl">
        {spinner}
      </div>
    )
  }

  return spinner
}