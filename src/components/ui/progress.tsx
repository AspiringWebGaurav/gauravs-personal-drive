'use client';

import * as React from 'react';
import * as ProgressPrimitive from '@radix-ui/react-progress';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

const Progress = React.forwardRef<
  React.ElementRef<typeof ProgressPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof ProgressPrimitive.Root> & {
    showThresholds?: boolean;
    warningThreshold?: number;
    dangerThreshold?: number;
  }
>(({ className, value, showThresholds = false, warningThreshold = 80, dangerThreshold = 90, ...props }, ref) => {
  const percentage = value || 0;
  
  const getProgressColor = () => {
    if (percentage >= dangerThreshold) return 'bg-red-500 dark:bg-red-400';
    if (percentage >= warningThreshold) return 'bg-yellow-500 dark:bg-yellow-400';
    return 'bg-green-500 dark:bg-green-400';
  };

  return (
    <div className="relative">
      <ProgressPrimitive.Root
        ref={ref}
        className={cn(
          'relative h-2 w-full overflow-hidden rounded-full bg-gray-200 dark:bg-gray-800',
          className
        )}
        {...props}
      >
        <motion.div
          className={cn('h-full w-full flex-1 transition-all', getProgressColor())}
          initial={{ width: 0 }}
          animate={{ width: `${percentage}%` }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
        />
      </ProgressPrimitive.Root>
      
      {showThresholds && (
        <>
          {/* Warning threshold line */}
          <div
            className="absolute top-0 h-2 w-0.5 bg-yellow-600 dark:bg-yellow-400 opacity-60"
            style={{ left: `${warningThreshold}%` }}
          />
          {/* Danger threshold line */}
          <div
            className="absolute top-0 h-2 w-0.5 bg-red-600 dark:bg-red-400 opacity-60"
            style={{ left: `${dangerThreshold}%` }}
          />
        </>
      )}
    </div>
  );
});

Progress.displayName = ProgressPrimitive.Root.displayName;

export { Progress };