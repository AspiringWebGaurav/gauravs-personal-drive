'use client';

import { debounce, throttle, OperationBatcher } from '@/lib/utils';
import { onSnapshot, query, where, orderBy, collection, Unsubscribe } from 'firebase/firestore';
import { db } from './config';

// Connection health monitoring
class ConnectionHealth {
  private isHealthy = true;
  private lastSuccessfulOperation = Date.now();
  private failureCount = 0;
  private readonly maxFailures = 3;
  private readonly healthCheckInterval = 30000; // 30 seconds

  constructor() {
    setInterval(() => this.checkHealth(), this.healthCheckInterval);
  }

  recordSuccess() {
    this.isHealthy = true;
    this.lastSuccessfulOperation = Date.now();
    this.failureCount = 0;
  }

  recordFailure(error?: any) {
    console.warn('Firebase operation failed:', error);
    this.failureCount++;
    
    if (this.failureCount >= this.maxFailures) {
      this.isHealthy = false;
      console.error('Firebase connection marked as unhealthy');
    }
  }

  isConnectionHealthy(): boolean {
    const timeSinceLastSuccess = Date.now() - this.lastSuccessfulOperation;
    return this.isHealthy && timeSinceLastSuccess < 60000; // 1 minute threshold
  }

  private checkHealth() {
    const timeSinceLastSuccess = Date.now() - this.lastSuccessfulOperation;
    if (timeSinceLastSuccess > 120000) { // 2 minutes
      this.isHealthy = false;
      console.warn('Firebase connection health check failed - too long since last successful operation');
    }
  }
}

// Smart listener manager to prevent redundant connections
class ListenerManager {
  private activeListeners = new Map<string, Unsubscribe>();
  private listenerRegistry = new Map<string, {
    query: any;
    callback: (snapshot: any) => void;
    lastActivity: number;
  }>();

  createListener(
    key: string,
    queryFn: () => any,
    callback: (snapshot: any) => void,
    options?: { 
      debounceMs?: number;
      throttleMs?: number;
    }
  ): () => void {
    // Clean up existing listener if it exists
    this.removeListener(key);

    const debouncedCallback = options?.debounceMs 
      ? debounce(callback, options.debounceMs)
      : callback;

    const throttledCallback = options?.throttleMs
      ? throttle(debouncedCallback, options.throttleMs)
      : debouncedCallback;

    try {
      const q = queryFn();
      const unsubscribe = onSnapshot(
        q,
        (snapshot: any) => {
          connectionHealth.recordSuccess();
          this.listenerRegistry.set(key, {
            query: q,
            callback,
            lastActivity: Date.now()
          });
          throttledCallback(snapshot);
        },
        (error: any) => {
          connectionHealth.recordFailure(error);
          console.error(`Listener error for ${key}:`, error);
        }
      );

      this.activeListeners.set(key, unsubscribe);
      console.log(`✅ Created optimized listener: ${key}`);

      return () => this.removeListener(key);
    } catch (error) {
      connectionHealth.recordFailure(error);
      console.error(`Failed to create listener ${key}:`, error);
      return () => {};
    }
  }

  removeListener(key: string) {
    const unsubscribe = this.activeListeners.get(key);
    if (unsubscribe) {
      unsubscribe();
      this.activeListeners.delete(key);
      this.listenerRegistry.delete(key);
      console.log(`🧹 Removed listener: ${key}`);
    }
  }

  removeAllListeners() {
    console.log('🧹 Cleaning up all listeners');
    this.activeListeners.forEach((unsubscribe, key) => {
      unsubscribe();
      console.log(`🧹 Removed listener: ${key}`);
    });
    this.activeListeners.clear();
    this.listenerRegistry.clear();
  }

  getActiveListenerCount(): number {
    return this.activeListeners.size;
  }

  // Clean up stale listeners (inactive for more than 5 minutes)
  cleanupStaleListeners() {
    const staleThreshold = 5 * 60 * 1000; // 5 minutes
    const now = Date.now();

    this.listenerRegistry.forEach((info, key) => {
      if (now - info.lastActivity > staleThreshold) {
        console.warn(`🧹 Cleaning up stale listener: ${key}`);
        this.removeListener(key);
      }
    });
  }
}

// Operation batching for Firebase operations
class FirebaseOperationBatcher extends OperationBatcher {
  constructor() {
    super(10, 1000); // Batch size 10, delay 1 second
  }

  batchRead(operation: () => Promise<any>): Promise<any> {
    return new Promise((resolve, reject) => {
      this.add(async () => {
        try {
          const result = await operation();
          connectionHealth.recordSuccess();
          resolve(result);
        } catch (error) {
          connectionHealth.recordFailure(error);
          reject(error);
        }
      });
    });
  }
}

// Global instances
export const connectionHealth = new ConnectionHealth();
export const listenerManager = new ListenerManager();
export const operationBatcher = new FirebaseOperationBatcher();

// Smart sync functions
export const createOptimizedFileListener = (
  uid: string,
  isSecret?: boolean,
  callback?: (files: any[]) => void
) => {
  const key = `files_${uid}_${isSecret}`;
  
  return listenerManager.createListener(
    key,
    () => {
      let q = query(
        collection(db, 'files'),
        where('ownerUid', '==', uid),
        orderBy('createdAt', 'desc')
      );
      
      if (typeof isSecret === 'boolean') {
        q = query(q, where('isSecret', '==', isSecret));
      }
      
      return q;
    },
    (querySnapshot) => {
      const files = querySnapshot.docs.map((doc: any) => ({
        id: doc.id,
        ...doc.data()
      }));
      
      console.log(`📱 Optimized sync update: ${files.length} files`);
      callback?.(files);
    },
    {
      debounceMs: 300, // Debounce rapid updates
      throttleMs: 1000 // Throttle to max 1 update per second
    }
  );
};

// Usage tracking with smart intervals
export const createOptimizedUsageTracker = (
  uid: string,
  callback: (usage: any) => void
) => {
  let intervalId: NodeJS.Timeout;
  let currentInterval = 30000; // Start with 30 seconds
  const maxInterval = 300000; // Max 5 minutes
  const minInterval = 10000; // Min 10 seconds

  const updateUsage = async () => {
    try {
      if (!connectionHealth.isConnectionHealthy()) {
        console.warn('Skipping usage update - connection unhealthy');
        return;
      }

      const { getUserUsage } = await import('./firestore');
      const { data, error } = await getUserUsage(uid);
      
      if (!error && data) {
        connectionHealth.recordSuccess();
        callback(data);
        
        // Adaptive interval: reduce frequency if no significant changes
        currentInterval = Math.min(currentInterval * 1.1, maxInterval);
      } else {
        connectionHealth.recordFailure(error);
        // Increase frequency on errors (within limits)
        currentInterval = Math.max(currentInterval * 0.8, minInterval);
      }
    } catch (error) {
      connectionHealth.recordFailure(error);
      currentInterval = Math.max(currentInterval * 0.8, minInterval);
    } finally {
      // Schedule next update with adaptive interval
      clearTimeout(intervalId);
      intervalId = setTimeout(updateUsage, currentInterval);
    }
  };

  // Start tracking
  updateUsage();

  // Return cleanup function
  return () => {
    clearTimeout(intervalId);
  };
};

// Cleanup function for app unmount
export const cleanupSyncManager = () => {
  console.log('🧹 Cleaning up sync manager');
  listenerManager.removeAllListeners();
  operationBatcher.flush();
};

// Performance monitoring
export const getSyncStats = () => ({
  activeListeners: listenerManager.getActiveListenerCount(),
  connectionHealthy: connectionHealth.isConnectionHealthy(),
  timestamp: new Date().toISOString()
});

// Auto-cleanup stale listeners every 5 minutes
setInterval(() => {
  listenerManager.cleanupStaleListeners();
}, 5 * 60 * 1000);