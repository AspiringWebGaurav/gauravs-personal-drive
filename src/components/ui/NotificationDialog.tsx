'use client'

import { useEffect } from 'react'
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription 
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { 
  CheckCircle, 
  Info, 
  AlertCircle, 
  XCircle, 
  X 
} from 'lucide-react'
import { cn } from '@/lib/utils'

export type NotificationType = 'success' | 'info' | 'warning' | 'error'

interface NotificationDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  type: NotificationType
  title: string
  description?: string
  autoClose?: boolean
  autoCloseDuration?: number
  showCloseButton?: boolean
  className?: string
}

const notificationConfig = {
  success: {
    icon: CheckCircle,
    iconClass: 'text-green-500 dark:text-green-400',
    titleClass: 'text-green-900 dark:text-green-100',
    descriptionClass: 'text-green-700 dark:text-green-200',
    borderClass: 'border-green-200/50 dark:border-green-800/50',
    bgClass: 'bg-green-50/90 dark:bg-green-900/20'
  },
  info: {
    icon: Info,
    iconClass: 'text-blue-500 dark:text-blue-400',
    titleClass: 'text-blue-900 dark:text-blue-100',
    descriptionClass: 'text-blue-700 dark:text-blue-200',
    borderClass: 'border-blue-200/50 dark:border-blue-800/50',
    bgClass: 'bg-blue-50/90 dark:bg-blue-900/20'
  },
  warning: {
    icon: AlertCircle,
    iconClass: 'text-yellow-500 dark:text-yellow-400',
    titleClass: 'text-yellow-900 dark:text-yellow-100',
    descriptionClass: 'text-yellow-700 dark:text-yellow-200',
    borderClass: 'border-yellow-200/50 dark:border-yellow-800/50',
    bgClass: 'bg-yellow-50/90 dark:bg-yellow-900/20'
  },
  error: {
    icon: XCircle,
    iconClass: 'text-red-500 dark:text-red-400',
    titleClass: 'text-red-900 dark:text-red-100',
    descriptionClass: 'text-red-700 dark:text-red-200',
    borderClass: 'border-red-200/50 dark:border-red-800/50',
    bgClass: 'bg-red-50/90 dark:bg-red-900/20'
  }
}

export function NotificationDialog({
  open,
  onOpenChange,
  type,
  title,
  description,
  autoClose = true,
  autoCloseDuration = 3000,
  showCloseButton = true,
  className
}: NotificationDialogProps) {
  const config = notificationConfig[type]
  const Icon = config.icon

  // Auto-close functionality
  useEffect(() => {
    if (open && autoClose) {
      const timer = setTimeout(() => {
        onOpenChange(false)
      }, autoCloseDuration)

      return () => clearTimeout(timer)
    }
  }, [open, autoClose, autoCloseDuration, onOpenChange])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={cn(
          // Base glass effect with transparent background
          'glass-card backdrop-blur-md bg-background/80',
          // Border styling based on notification type
          config.borderClass,
          // Additional background tint
          config.bgClass,
          // Custom positioning and animations
          'data-[state=open]:animate-in data-[state=closed]:animate-out',
          'data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0',
          'data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95',
          'data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%]',
          'data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%]',
          'duration-300 ease-out',
          // Size and spacing
          'max-w-md w-full mx-4 p-0 shadow-2xl',
          className
        )}
        showCloseButton={false}
      >
        {/* Custom header with icon */}
        <DialogHeader className="relative p-6 pb-4">
          <div className="flex items-center gap-3">
            <div className={cn(
              'flex-shrink-0 w-10 h-10 rounded-full',
              'bg-background/50 backdrop-blur-sm',
              'flex items-center justify-center',
              'transition-all duration-200 hover:scale-110'
            )}>
              <Icon className={cn('w-5 h-5', config.iconClass)} />
            </div>
            
            <div className="flex-1 min-w-0">
              <DialogTitle className={cn(
                'text-lg font-semibold leading-6',
                config.titleClass
              )}>
                {title}
              </DialogTitle>
              
              {description && (
                <DialogDescription className={cn(
                  'text-sm mt-1 leading-5',
                  config.descriptionClass
                )}>
                  {description}
                </DialogDescription>
              )}
            </div>

            {/* Custom close button */}
            {showCloseButton && (
              <Button
                variant="ghost"
                size="sm"
                className={cn(
                  'flex-shrink-0 w-8 h-8 p-0 rounded-full',
                  'hover:bg-background/50 transition-all duration-200',
                  'opacity-70 hover:opacity-100',
                  config.titleClass
                )}
                onClick={() => onOpenChange(false)}
                aria-label="Close notification"
              >
                <X className="w-4 h-4" />
              </Button>
            )}
          </div>
        </DialogHeader>

        {/* Auto-close progress indicator */}
        {autoClose && open && (
          <div className="px-6 pb-4">
            <div className="w-full h-1 bg-background/30 rounded-full overflow-hidden">
              <div 
                className={cn(
                  'h-full rounded-full transition-all ease-linear',
                  type === 'success' && 'bg-green-500/60',
                  type === 'info' && 'bg-blue-500/60',
                  type === 'warning' && 'bg-yellow-500/60',
                  type === 'error' && 'bg-red-500/60'
                )}
                style={{
                  animation: `shrink-width ${autoCloseDuration}ms linear`
                }}
              />
            </div>
          </div>
        )}
      </DialogContent>
      
      {/* Custom overlay with enhanced transparency */}
      <style jsx global>{`
        [data-slot="dialog-overlay"] {
          background: rgba(0, 0, 0, 0.2) !important;
          backdrop-filter: blur(8px);
          -webkit-backdrop-filter: blur(8px);
        }
        
        @keyframes shrink-width {
          from { width: 100%; }
          to { width: 0%; }
        }
        
        .glass-card {
          background: rgba(255, 255, 255, 0.1);
          backdrop-filter: blur(16px);
          -webkit-backdrop-filter: blur(16px);
          border: 1px solid rgba(255, 255, 255, 0.2);
        }
        
        .dark .glass-card {
          background: rgba(0, 0, 0, 0.2);
          border: 1px solid rgba(255, 255, 255, 0.1);
        }
      `}</style>
    </Dialog>
  )
}

// Convenience components for specific types
export function SuccessDialog(props: Omit<NotificationDialogProps, 'type'>) {
  return <NotificationDialog {...props} type="success" />
}

export function InfoDialog(props: Omit<NotificationDialogProps, 'type'>) {
  return <NotificationDialog {...props} type="info" />
}

export function WarningDialog(props: Omit<NotificationDialogProps, 'type'>) {
  return <NotificationDialog {...props} type="warning" />
}

export function ErrorDialog(props: Omit<NotificationDialogProps, 'type'>) {
  return <NotificationDialog {...props} type="error" />
}