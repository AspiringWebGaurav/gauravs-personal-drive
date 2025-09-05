'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { AnimatedCounter } from '@/components/ui/animated-counter';
import { getSyncStats } from '@/lib/firebase/sync-manager';
import { 
  Activity, 
  Database, 
  Wifi, 
  Clock, 
  TrendingUp, 
  AlertTriangle,
  CheckCircle,
  XCircle,
  Minimize2,
  Maximize2
} from 'lucide-react';

interface PerformanceMetrics {
  syncStats: any;
  memoryUsage: number;
  renderTime: number;
  apiCalls: number;
  errors: number;
  lastUpdate: string;
}

export const PerformanceMonitor = ({ 
  enabled = true, 
  minimized = true 
}: { 
  enabled?: boolean; 
  minimized?: boolean; 
}) => {
  const [metrics, setMetrics] = useState<PerformanceMetrics>({
    syncStats: null,
    memoryUsage: 0,
    renderTime: 0,
    apiCalls: 0,
    errors: 0,
    lastUpdate: new Date().toISOString()
  });
  const [isMinimized, setIsMinimized] = useState(minimized);
  const [isVisible, setIsVisible] = useState(enabled);

  useEffect(() => {
    if (!enabled) return;

    const updateMetrics = () => {
      const syncStats = getSyncStats();
      
      // Get memory usage (if available)
      const memoryUsage = (performance as any).memory 
        ? (performance as any).memory.usedJSHeapSize / 1024 / 1024 
        : 0;

      // Performance timing
      const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
      const renderTime = navigation ? navigation.loadEventEnd - navigation.fetchStart : 0;

      setMetrics(prev => ({
        ...prev,
        syncStats,
        memoryUsage: Math.round(memoryUsage * 100) / 100,
        renderTime: Math.round(renderTime),
        lastUpdate: new Date().toISOString()
      }));
    };

    // Update metrics every 5 seconds
    const interval = setInterval(updateMetrics, 5000);
    updateMetrics(); // Initial update

    return () => clearInterval(interval);
  }, [enabled]);

  // Keyboard shortcut to toggle monitor
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.shiftKey && e.key === 'M') {
        setIsVisible(prev => !prev);
      }
      if (e.ctrlKey && e.shiftKey && e.key === 'N') {
        setIsMinimized(prev => !prev);
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, []);

  if (!isVisible) return null;

  const getHealthStatus = () => {
    if (!metrics.syncStats) return 'unknown';
    return metrics.syncStats.connectionHealthy ? 'healthy' : 'unhealthy';
  };

  const healthStatus = getHealthStatus();

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
      className={`fixed ${isMinimized ? 'bottom-4 right-4' : 'top-4 right-4'} z-50 max-w-sm`}
    >
      <Card variant="glass" className="border-2 border-blue-500/20 shadow-2xl">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Activity className="w-4 h-4 text-blue-500" />
              <CardTitle className="text-sm">Performance Monitor</CardTitle>
              <div className={`w-2 h-2 rounded-full ${
                healthStatus === 'healthy' ? 'bg-green-500' :
                healthStatus === 'unhealthy' ? 'bg-red-500' : 'bg-gray-500'
              }`} />
            </div>
            <div className="flex items-center space-x-1">
              <button
                onClick={() => setIsMinimized(!isMinimized)}
                className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded"
              >
                {isMinimized ? (
                  <Maximize2 className="w-3 h-3" />
                ) : (
                  <Minimize2 className="w-3 h-3" />
                )}
              </button>
              <button
                onClick={() => setIsVisible(false)}
                className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded"
              >
                <XCircle className="w-3 h-3" />
              </button>
            </div>
          </div>
        </CardHeader>

        <AnimatePresence>
          {!isMinimized && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
            >
              <CardContent className="pt-0 space-y-3">
                {/* Connection Health */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Wifi className="w-4 h-4" />
                    <span className="text-xs">Connection</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    {healthStatus === 'healthy' ? (
                      <CheckCircle className="w-4 h-4 text-green-500" />
                    ) : healthStatus === 'unhealthy' ? (
                      <AlertTriangle className="w-4 h-4 text-red-500" />
                    ) : (
                      <Clock className="w-4 h-4 text-gray-500" />
                    )}
                    <span className="text-xs font-medium">
                      {healthStatus === 'healthy' ? 'Healthy' : 
                       healthStatus === 'unhealthy' ? 'Issues' : 'Unknown'}
                    </span>
                  </div>
                </div>

                {/* Active Listeners */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Database className="w-4 h-4" />
                    <span className="text-xs">Listeners</span>
                  </div>
                  <AnimatedCounter
                    value={metrics.syncStats?.activeListeners || 0}
                    className="text-xs font-mono"
                  />
                </div>

                {/* Memory Usage */}
                {metrics.memoryUsage > 0 && (
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <TrendingUp className="w-4 h-4" />
                      <span className="text-xs">Memory</span>
                    </div>
                    <span className="text-xs font-mono">
                      <AnimatedCounter
                        value={metrics.memoryUsage}
                        suffix=" MB"
                        className="text-xs"
                      />
                    </span>
                  </div>
                )}

                {/* Render Time */}
                {metrics.renderTime > 0 && (
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Clock className="w-4 h-4" />
                      <span className="text-xs">Load Time</span>
                    </div>
                    <span className="text-xs font-mono">
                      <AnimatedCounter
                        value={metrics.renderTime}
                        suffix=" ms"
                        className="text-xs"
                      />
                    </span>
                  </div>
                )}

                {/* Last Update */}
                <div className="text-xs text-gray-500 dark:text-gray-400 pt-2 border-t border-gray-200 dark:border-gray-700">
                  Updated: {new Date(metrics.lastUpdate).toLocaleTimeString()}
                </div>

                {/* Keyboard Shortcuts */}
                <div className="text-xs text-gray-500 dark:text-gray-400 space-y-1">
                  <div>Ctrl+Shift+M: Toggle</div>
                  <div>Ctrl+Shift+N: Minimize</div>
                </div>
              </CardContent>
            </motion.div>
          )}
        </AnimatePresence>
      </Card>
    </motion.div>
  );
};

// Performance tracking hook
export const usePerformanceTracking = () => {
  useEffect(() => {
    // Track page load performance
    const trackPerformance = () => {
      const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
      if (navigation) {
        console.log('📊 Performance Metrics:', {
          domContentLoaded: navigation.domContentLoadedEventEnd - navigation.fetchStart,
          loadComplete: navigation.loadEventEnd - navigation.fetchStart,
          firstPaint: performance.getEntriesByType('paint')[0]?.startTime || 0,
          firstContentfulPaint: performance.getEntriesByType('paint')[1]?.startTime || 0
        });
      }
    };

    // Track when the page is fully loaded
    if (document.readyState === 'complete') {
      trackPerformance();
    } else {
      window.addEventListener('load', trackPerformance);
      return () => window.removeEventListener('load', trackPerformance);
    }
  }, []);
};

export default PerformanceMonitor;