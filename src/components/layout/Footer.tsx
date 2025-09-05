'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/components/auth/AuthProvider';
import { getUsageStatus, formatBytes } from '@/lib/usage/tracking';
import { UsageStatus } from '@/types/usage';

export const Footer = () => {
  const { user } = useAuth();
  const [usage, setUsage] = useState<UsageStatus | null>(null);

  useEffect(() => {
    if (user) {
      loadUsage();
      // Refresh usage every 30 seconds
      const interval = setInterval(loadUsage, 30000);
      return () => clearInterval(interval);
    }
  }, [user]);

  const loadUsage = async () => {
    if (!user) return;
    const usageData = await getUsageStatus(user.uid);
    setUsage(usageData);
  };

  const getUsageColor = (current: number, limit: number) => {
    const percentage = (current / limit) * 100;
    if (percentage >= 100) return 'text-red-600';
    if (percentage >= 80) return 'text-yellow-600';
    return 'text-green-600';
  };

  if (!usage) return null;

  return (
    <footer className="glass-card border-t border-white/20 dark:border-gray-800/20 px-4 sm:px-6 lg:px-8 py-3">
      <div className="flex flex-col sm:flex-row items-center justify-between text-xs text-gray-600 dark:text-gray-400 space-y-2 sm:space-y-0">
        <div className="flex items-center space-x-4">
          <span className={getUsageColor(usage.current.storageBytesUsed, usage.limits.storageBytes)}>
            💾 {formatBytes(usage.current.storageBytesUsed)} / {formatBytes(usage.limits.storageBytes)}
          </span>
          
          <span className={getUsageColor(usage.current.downloadsToday, usage.limits.downloadsDayBytes)}>
            ⬇️ {formatBytes(usage.current.downloadsToday)} / {formatBytes(usage.limits.downloadsDayBytes)} today
          </span>
          
          <span className={getUsageColor(usage.current.uploadsMonth, usage.limits.uploadsMonth)}>
            ⬆️ {usage.current.uploadsMonth} / {usage.limits.uploadsMonth} uploads/month
          </span>
        </div>
        
        <div className="flex items-center space-x-2">
          <span>© 2024 GPD</span>
          <span>•</span>
          <a
            href={process.env.NEXT_PUBLIC_PORTFOLIO_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-blue-600 transition-colors"
          >
            Portfolio ↗
          </a>
        </div>
      </div>
    </footer>
  );
};