'use client'

import { Card, CardContent } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Button } from '@/components/ui/button'
import { HardDrive, AlertTriangle } from 'lucide-react'

export function UsageBar({ usage }) {
  const { usedBytes = 0, limitBytes = 5 * 1024 * 1024 * 1024 } = usage || {}
  
  const formatBytes = (bytes) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i]
  }

  const usagePercentage = Math.round((usedBytes / limitBytes) * 100)
  const isNearLimit = usagePercentage >= 90
  const isAtLimit = usagePercentage >= 100

  const getProgressColor = () => {
    if (isAtLimit) return 'bg-red-500'
    if (isNearLimit) return 'bg-yellow-500'
    return 'bg-blue-500'
  }

  return (
    <Card className="glass-card border-white/20 dark:border-white/10">
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center space-x-2">
            <HardDrive className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">Storage Usage</span>
            {isNearLimit && (
              <AlertTriangle className={`h-4 w-4 ${isAtLimit ? 'text-red-500' : 'text-yellow-500'}`} />
            )}
          </div>
          
          <div className="text-sm text-muted-foreground">
            {formatBytes(usedBytes)} of {formatBytes(limitBytes)}
          </div>
        </div>
        
        <div className="space-y-2">
          <Progress 
            value={usagePercentage} 
            className="h-2" 
          />
          
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">
              {usagePercentage}% used
            </span>
            
            {isAtLimit ? (
              <span className="text-red-600 dark:text-red-400 font-medium">
                Storage full
              </span>
            ) : isNearLimit ? (
              <span className="text-yellow-600 dark:text-yellow-400 font-medium">
                Almost full
              </span>
            ) : (
              <span className="text-green-600 dark:text-green-400">
                {formatBytes(limitBytes - usedBytes)} remaining
              </span>
            )}
          </div>
        </div>

        {isAtLimit && (
          <div className="mt-3 p-3 rounded-lg bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800">
            <div className="flex items-start space-x-3">
              <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
              <div className="flex-1 space-y-2">
                <p className="text-sm text-red-800 dark:text-red-200">
                  You've reached your storage limit. Consider deleting some files to free up space.
                </p>
                <Button
                  size="sm"
                  variant="outline"
                  className="text-red-600 border-red-200 hover:bg-red-50 dark:text-red-400 dark:border-red-800 dark:hover:bg-red-950/40"
                >
                  Manage Storage
                </Button>
              </div>
            </div>
          </div>
        )}

        {isNearLimit && !isAtLimit && (
          <div className="mt-3 p-3 rounded-lg bg-yellow-50 dark:bg-yellow-950/20 border border-yellow-200 dark:border-yellow-800">
            <div className="flex items-center space-x-2">
              <AlertTriangle className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
              <p className="text-sm text-yellow-800 dark:text-yellow-200">
                Your storage is almost full. Consider freeing up some space.
              </p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}