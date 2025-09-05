'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardHeader, CardContent } from '@/components/ui/card';
import { AnimatedCounter } from '@/components/ui/animated-counter';
import { 
  Upload, 
  Download, 
  Trash2, 
  Share2, 
  Edit, 
  Clock, 
  Activity,
  FileText,
  Users,
  Database
} from 'lucide-react';
import { formatBytes } from '@/lib/usage/tracking';
import { useAuth } from '@/components/auth/AuthProvider';

interface ActivityItem {
  id: string;
  type: 'upload' | 'download' | 'delete' | 'share' | 'rename';
  fileName: string;
  fileSize?: number;
  timestamp: Date;
  status: 'completed' | 'in_progress' | 'failed';
}

interface LiveStats {
  totalFiles: number;
  totalSize: number;
  todayUploads: number;
  todayDownloads: number;
  activeShares: number;
}

export const LiveActivityFeed = ({ files }: { files: any[] }) => {
  const { user } = useAuth();
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [stats, setStats] = useState<LiveStats>({
    totalFiles: 0,
    totalSize: 0,
    todayUploads: 0,
    todayDownloads: 0,
    activeShares: 0
  });

  // Calculate live stats from files
  useEffect(() => {
    if (!files) return;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const newStats = {
      totalFiles: files.length,
      totalSize: files.reduce((sum, file) => sum + (file.size || 0), 0),
      todayUploads: files.filter(file => {
        const fileDate = file.createdAt?.toDate ? file.createdAt.toDate() : new Date(file.createdAt);
        return fileDate >= today;
      }).length,
      todayDownloads: 0, // This would come from usage tracking
      activeShares: 0 // This would come from shares collection
    };

    setStats(newStats);
  }, [files]);

  // Simulate activity updates (in real app, this would listen to Firestore changes)
  useEffect(() => {
    const simulateActivity = () => {
      if (!user) return;

      // Add a new activity item occasionally
      if (Math.random() > 0.7) {
        const activityTypes: ActivityItem['type'][] = ['upload', 'download', 'share', 'rename'];
        const randomType = activityTypes[Math.floor(Math.random() * activityTypes.length)];
        
        const newActivity: ActivityItem = {
          id: Date.now().toString(),
          type: randomType,
          fileName: `file-${Date.now()}.jpg`,
          fileSize: Math.floor(Math.random() * 1000000) + 100000,
          timestamp: new Date(),
          status: Math.random() > 0.1 ? 'completed' : 'failed'
        };

        setActivities(prev => [newActivity, ...prev].slice(0, 5));
      }
    };

    const interval = setInterval(simulateActivity, 10000); // Every 10 seconds
    return () => clearInterval(interval);
  }, [user]);

  const getActivityIcon = (type: ActivityItem['type']) => {
    switch (type) {
      case 'upload': return <Upload className="w-4 h-4 text-blue-500" />;
      case 'download': return <Download className="w-4 h-4 text-green-500" />;
      case 'delete': return <Trash2 className="w-4 h-4 text-red-500" />;
      case 'share': return <Share2 className="w-4 h-4 text-purple-500" />;
      case 'rename': return <Edit className="w-4 h-4 text-yellow-500" />;
    }
  };

  const getActivityText = (activity: ActivityItem) => {
    switch (activity.type) {
      case 'upload': return 'Uploaded';
      case 'download': return 'Downloaded';
      case 'delete': return 'Deleted';
      case 'share': return 'Shared';
      case 'rename': return 'Renamed';
    }
  };

  const getTimeAgo = (timestamp: Date) => {
    const now = new Date();
    const diff = now.getTime() - timestamp.getTime();
    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);

    if (seconds < 60) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return timestamp.toLocaleDateString();
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Live Stats */}
      <div className="lg:col-span-2 grid grid-cols-2 sm:grid-cols-4 gap-4">
        {/* Total Files */}
        <Card variant="glass" className="p-4">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-blue-100 dark:bg-blue-900/20 rounded-lg">
              <FileText className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Files</p>
              <AnimatedCounter 
                value={stats.totalFiles} 
                className="text-xl font-semibold text-gray-900 dark:text-white"
              />
            </div>
          </div>
        </Card>

        {/* Total Size */}
        <Card variant="glass" className="p-4">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-green-100 dark:bg-green-900/20 rounded-lg">
              <Database className="w-5 h-5 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Size</p>
              <div className="text-xl font-semibold text-gray-900 dark:text-white">
                {formatBytes(stats.totalSize)}
              </div>
            </div>
          </div>
        </Card>

        {/* Today's Uploads */}
        <Card variant="glass" className="p-4">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-purple-100 dark:bg-purple-900/20 rounded-lg">
              <Upload className="w-5 h-5 text-purple-600 dark:text-purple-400" />
            </div>
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Today</p>
              <AnimatedCounter 
                value={stats.todayUploads} 
                className="text-xl font-semibold text-gray-900 dark:text-white"
              />
            </div>
          </div>
        </Card>

        {/* Active Shares */}
        <Card variant="glass" className="p-4">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-yellow-100 dark:bg-yellow-900/20 rounded-lg">
              <Users className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />
            </div>
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Shares</p>
              <AnimatedCounter 
                value={stats.activeShares} 
                className="text-xl font-semibold text-gray-900 dark:text-white"
              />
            </div>
          </div>
        </Card>
      </div>

      {/* Activity Feed */}
      <Card variant="glass" className="p-0">
        <CardHeader className="pb-3">
          <div className="flex items-center space-x-2">
            <Activity className="w-5 h-5 text-blue-500" />
            <h3 className="font-semibold text-gray-900 dark:text-white">Recent Activity</h3>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="space-y-3 max-h-64 overflow-y-auto">
            <AnimatePresence mode="popLayout">
              {activities.length === 0 ? (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="text-center py-8 text-gray-500 dark:text-gray-400"
                >
                  <Clock className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No recent activity</p>
                </motion.div>
              ) : (
                activities.map((activity) => (
                  <motion.div
                    key={activity.id}
                    initial={{ opacity: 0, x: 20, scale: 0.8 }}
                    animate={{ opacity: 1, x: 0, scale: 1 }}
                    exit={{ opacity: 0, x: -20, scale: 0.8 }}
                    transition={{ duration: 0.3, ease: 'easeOut' }}
                    className={`flex items-center space-x-3 p-3 rounded-lg border ${
                      activity.status === 'completed' 
                        ? 'bg-green-50 dark:bg-green-900/10 border-green-200 dark:border-green-800' 
                        : activity.status === 'failed'
                        ? 'bg-red-50 dark:bg-red-900/10 border-red-200 dark:border-red-800'
                        : 'bg-blue-50 dark:bg-blue-900/10 border-blue-200 dark:border-blue-800'
                    }`}
                  >
                    {getActivityIcon(activity.type)}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 dark:text-white">
                        {getActivityText(activity)} {activity.fileName}
                      </p>
                      <div className="flex items-center space-x-2 text-xs text-gray-500 dark:text-gray-400">
                        {activity.fileSize && (
                          <>
                            <span>{formatBytes(activity.fileSize)}</span>
                            <span>•</span>
                          </>
                        )}
                        <span>{getTimeAgo(activity.timestamp)}</span>
                      </div>
                    </div>
                    <div className={`w-2 h-2 rounded-full ${
                      activity.status === 'completed' ? 'bg-green-500' :
                      activity.status === 'failed' ? 'bg-red-500' : 'bg-blue-500'
                    }`} />
                  </motion.div>
                ))
              )}
            </AnimatePresence>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};