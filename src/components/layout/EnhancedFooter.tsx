'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/components/auth/AuthProvider';
import { formatBytes, getUsagePercentage } from '@/lib/usage/tracking';
import { createOptimizedUsageTracker, getSyncStats } from '@/lib/firebase/sync-manager';
import { UsageStatus } from '@/types/usage';
import { Progress } from '@/components/ui/progress';
import { AnimatedCounter } from '@/components/ui/animated-counter';
import { Card } from '@/components/ui/card';
import { motion } from 'framer-motion';
import { Activity, Database, Wifi, WifiOff } from 'lucide-react';

export const EnhancedFooter = () => {
  const { user } = useAuth();
  const [usage, setUsage] = useState<UsageStatus | null>(null);
  const [syncStats, setSyncStats] = useState<any>(null);
  const [isConnected, setIsConnected] = useState(true);

  useEffect(() => {
    if (!user) return;

    // Create optimized usage tracker
    const cleanupUsageTracker = createOptimizedUsageTracker(user.uid, (usageData) => {
      import('@/lib/usage/tracking').then(({ getUsageLimits }) => {
        const limits = getUsageLimits();
        const current = usageData;
        
        // Calculate warning thresholds (80% of limit)
        const warnings = {
          storage: current.storageBytesUsed >= limits.storageBytes * 0.8,
          dailyDownloads: current.downloadsToday >= limits.downloadsDayBytes * 0.8,
          monthlyUploads: current.uploadsMonth >= limits.uploadsMonth * 0.8,
          monthlyDownloads: current.downloadsMonth >= limits.downloadsMonth * 0.8,
          dailyReads: current.readsToday >= limits.readsDay * 0.8,
          dailyWrites: current.writesToday >= limits.writesDay * 0.8,
          hostingBandwidth: current.hostingBandwidthToday >= limits.hostingBandwidthDay * 0.8
        };

        // Calculate block thresholds (90% of limit)
        const blocked = {
          storage: current.storageBytesUsed >= limits.storageBytes * 0.9,
          dailyDownloads: current.downloadsToday >= limits.downloadsDayBytes * 0.9,
          monthlyUploads: current.uploadsMonth >= limits.uploadsMonth * 0.9,
          monthlyDownloads: current.downloadsMonth >= limits.downloadsMonth * 0.9,
          dailyReads: current.readsToday >= limits.readsDay * 0.9,
          dailyWrites: current.writesToday >= limits.writesDay * 0.9,
          hostingBandwidth: current.hostingBandwidthToday >= limits.hostingBandwidthDay * 0.9
        };

        setUsage({ current, limits, warnings, blocked });
      });
    });

    // Update sync stats periodically
    const updateSyncStats = () => {
      const stats = getSyncStats();
      setSyncStats(stats);
      setIsConnected(stats.connectionHealthy);
    };

    updateSyncStats();
    const statsInterval = setInterval(updateSyncStats, 5000);

    return () => {
      cleanupUsageTracker();
      clearInterval(statsInterval);
    };
  }, [user]);

  if (!usage) return null;

  const storagePercentage = getUsagePercentage(usage.current.storageBytesUsed, usage.limits.storageBytes);
  const downloadsPercentage = getUsagePercentage(usage.current.downloadsToday, usage.limits.downloadsDayBytes);
  const uploadsPercentage = getUsagePercentage(usage.current.uploadsMonth, usage.limits.uploadsMonth);

  return (
    <motion.footer 
      className="glass-card border-t border-white/20 dark:border-gray-800/20"
      initial={{ y: 100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.5, ease: 'easeOut' }}
    >
      <div className="px-4 sm:px-6 lg:px-8 py-4">
        {/* Main Usage Display - Centered */}
        <div className="flex flex-col lg:flex-row items-center justify-center gap-6 lg:gap-8">
          
          {/* Storage Usage */}
          <Card variant="glass" className="p-4 min-w-[200px] flex-1 max-w-xs">
            <div className="text-center space-y-2">
              <div className="flex items-center justify-center gap-2">
                <Database className="w-4 h-4 text-blue-500" />
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Storage</span>
              </div>
              
              <Progress 
                value={storagePercentage} 
                className="h-3"
                showThresholds={true}
                warningThreshold={80}
                dangerThreshold={90}
              />
              
              <div className="flex items-center justify-between text-xs">
                <AnimatedCounter 
                  value={usage.current.storageBytesUsed} 
                  format={false}
                  suffix=""
                  className="font-semibold"
                />
                <span className="text-gray-500">/</span>
                <span className="text-gray-400">{formatBytes(usage.limits.storageBytes)}</span>
              </div>
              
              <div className="text-xs">
                <AnimatedCounter 
                  value={storagePercentage} 
                  suffix="%" 
                  className={
                    storagePercentage >= 90 ? 'text-red-600 dark:text-red-400' :
                    storagePercentage >= 80 ? 'text-yellow-600 dark:text-yellow-400' :
                    'text-green-600 dark:text-green-400'
                  }
                />
              </div>
            </div>
          </Card>

          {/* Daily Downloads */}
          <Card variant="glass" className="p-4 min-w-[200px] flex-1 max-w-xs">
            <div className="text-center space-y-2">
              <div className="flex items-center justify-center gap-2">
                <Activity className="w-4 h-4 text-green-500" />
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Downloads Today</span>
              </div>
              
              <Progress 
                value={downloadsPercentage} 
                className="h-3"
                showThresholds={true}
                warningThreshold={80}
                dangerThreshold={90}
              />
              
              <div className="flex items-center justify-between text-xs">
                <AnimatedCounter 
                  value={usage.current.downloadsToday} 
                  format={false}
                  suffix=""
                  className="font-semibold"
                />
                <span className="text-gray-500">/</span>
                <span className="text-gray-400">{formatBytes(usage.limits.downloadsDayBytes)}</span>
              </div>
              
              <div className="text-xs">
                <AnimatedCounter 
                  value={downloadsPercentage} 
                  suffix="%" 
                  className={
                    downloadsPercentage >= 90 ? 'text-red-600 dark:text-red-400' :
                    downloadsPercentage >= 80 ? 'text-yellow-600 dark:text-yellow-400' :
                    'text-green-600 dark:text-green-400'
                  }
                />
              </div>
            </div>
          </Card>

          {/* Monthly Uploads */}
          <Card variant="glass" className="p-4 min-w-[200px] flex-1 max-w-xs">
            <div className="text-center space-y-2">
              <div className="flex items-center justify-center gap-2">
                <Activity className="w-4 h-4 text-purple-500 rotate-180" />
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Uploads/Month</span>
              </div>
              
              <Progress 
                value={uploadsPercentage} 
                className="h-3"
                showThresholds={true}
                warningThreshold={80}
                dangerThreshold={90}
              />
              
              <div className="flex items-center justify-between text-xs">
                <AnimatedCounter 
                  value={usage.current.uploadsMonth} 
                  className="font-semibold"
                />
                <span className="text-gray-500">/</span>
                <span className="text-gray-400">{usage.limits.uploadsMonth}</span>
              </div>
              
              <div className="text-xs">
                <AnimatedCounter 
                  value={uploadsPercentage} 
                  suffix="%" 
                  className={
                    uploadsPercentage >= 90 ? 'text-red-600 dark:text-red-400' :
                    uploadsPercentage >= 80 ? 'text-yellow-600 dark:text-yellow-400' :
                    'text-green-600 dark:text-green-400'
                  }
                />
              </div>
            </div>
          </Card>
        </div>

        {/* Secondary Info Bar */}
        <div className="flex flex-col sm:flex-row items-center justify-between text-xs text-gray-500 dark:text-gray-400 mt-4 pt-4 border-t border-white/10 dark:border-gray-800/10">
          <div className="flex items-center space-x-4">
            {/* Connection Status */}
            <div className="flex items-center gap-2">
              {isConnected ? (
                <Wifi className="w-3 h-3 text-green-500" />
              ) : (
                <WifiOff className="w-3 h-3 text-red-500" />
              )}
              <span>
                {isConnected ? 'Connected' : 'Reconnecting...'}
              </span>
            </div>

            {/* Sync Stats */}
            {syncStats && (
              <div className="flex items-center gap-2">
                <Activity className="w-3 h-3" />
                <AnimatedCounter 
                  value={syncStats.activeListeners} 
                  suffix=" listeners"
                />
              </div>
            )}
          </div>
          
          <div className="flex items-center space-x-2 mt-2 sm:mt-0">
            <span>© 2024 GPD</span>
            <span>•</span>
            <a
              href={process.env.NEXT_PUBLIC_PORTFOLIO_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
            >
              Portfolio ↗
            </a>
          </div>
        </div>
      </div>
    </motion.footer>
  );
};