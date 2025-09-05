import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Debounce utility for Firebase operations
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout;
  return function executedFunction(...args: Parameters<T>) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

// Throttle utility for real-time updates
export function throttle<T extends (...args: any[]) => any>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle: boolean;
  return function executedFunction(...args: Parameters<T>) {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
  };
}

// Format numbers with animation-friendly increments
export function formatNumber(num: number): string {
  if (num >= 1000000) {
    return (num / 1000000).toFixed(1) + 'M';
  }
  if (num >= 1000) {
    return (num / 1000).toFixed(1) + 'K';
  }
  return num.toString();
}

// Get usage color based on percentage
export function getUsageColor(percentage: number): string {
  if (percentage >= 90) return 'text-red-600 dark:text-red-400';
  if (percentage >= 80) return 'text-yellow-600 dark:text-yellow-400';
  return 'text-green-600 dark:text-green-400';
}

// Get usage background color for progress bars
export function getUsageBgColor(percentage: number): string {
  if (percentage >= 90) return 'bg-red-500';
  if (percentage >= 80) return 'bg-yellow-500';
  return 'bg-green-500';
}

// Batch operations utility
export class OperationBatcher {
  private operations: Array<() => Promise<any>> = [];
  private timeout: NodeJS.Timeout | null = null;
  private batchSize: number;
  private delay: number;

  constructor(batchSize = 10, delay = 500) {
    this.batchSize = batchSize;
    this.delay = delay;
  }

  add(operation: () => Promise<any>) {
    this.operations.push(operation);
    
    if (this.operations.length >= this.batchSize) {
      this.flush();
    } else if (!this.timeout) {
      this.timeout = setTimeout(() => this.flush(), this.delay);
    }
  }

  async flush() {
    if (this.timeout) {
      clearTimeout(this.timeout);
      this.timeout = null;
    }

    if (this.operations.length === 0) return;

    const batch = this.operations.splice(0, this.batchSize);
    
    try {
      await Promise.all(batch.map(op => op()));
    } catch (error) {
      console.error('Batch operation failed:', error);
    }

    // Process remaining operations
    if (this.operations.length > 0) {
      setTimeout(() => this.flush(), 100);
    }
  }
}