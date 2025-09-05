'use client';

import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/components/auth/AuthProvider';
import { UploadZone } from '@/components/dashboard/UploadZone';
import { FileGrid } from '@/components/dashboard/FileGrid';
import { VaultToggle } from '@/components/dashboard/VaultToggle';
import { UsageWarning } from '@/components/dashboard/UsageWarning';
import { LiveActivityFeed } from '@/components/dashboard/LiveActivityFeed';
import PerformanceMonitor, { usePerformanceTracking } from '@/components/debug/PerformanceMonitor';
import { FileSelectionProvider } from '@/contexts/FileSelectionContext';
import { getUserFiles } from '@/lib/firebase/firestore';
import { getUsageStatus } from '@/lib/usage/tracking';
import { createOptimizedFileListener, cleanupSyncManager } from '@/lib/firebase/sync-manager';
import { FileDocument } from '@/types/files';
import { UsageStatus } from '@/types/usage';

export default function Dashboard() {
  const { user } = useAuth();
  const [isSecretMode, setIsSecretMode] = useState(false);
  const [files, setFiles] = useState<FileDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [usage, setUsage] = useState<UsageStatus | null>(null);
  const [isVaultUnlocked, setIsVaultUnlocked] = useState(false);
  const unsubscribeRef = useRef<(() => void) | null>(null);
  const [showLiveActivity, setShowLiveActivity] = useState(false);

  // Enable performance tracking
  usePerformanceTracking();

  useEffect(() => {
    if (user) {
      setupRealtimeListener();
      loadUsage();
    }
    
    return () => {
      // Clean up listener on unmount or user change
      if (unsubscribeRef.current) {
        console.log('🧹 Cleaning up optimized Firestore listener');
        unsubscribeRef.current();
        unsubscribeRef.current = null;
      }
      // Clean up sync manager on unmount
      cleanupSyncManager();
    };
  }, [user, isSecretMode]);

  const setupRealtimeListener = () => {
    if (!user) return;
    
    console.log(`🔄 Setting up optimized real-time listener for user ${user.uid}, isSecret: ${isSecretMode}`);
    setLoading(true);
    
    // Clean up previous listener
    if (unsubscribeRef.current) {
      unsubscribeRef.current();
    }
    
    // Create optimized listener using sync manager
    const cleanup = createOptimizedFileListener(
      user.uid,
      isSecretMode,
      (files: FileDocument[]) => {
        console.log(`📱 Optimized sync update: ${files.length} files`);
        setFiles(files);
        setLoading(false);
      }
    );
    
    unsubscribeRef.current = cleanup;
  };

  const loadFiles = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      const { files: userFiles, error } = await getUserFiles(user.uid, isSecretMode);
      if (error) {
        console.error('Error loading files:', error);
        return;
      }
      // Cast to FileDocument[] to handle type compatibility
      setFiles((userFiles as FileDocument[]) || []);
    } catch (error) {
      console.error('Error loading files:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadUsage = async () => {
    if (!user) return;
    const usageData = await getUsageStatus(user.uid);
    setUsage(usageData);
  };

  const handleFileUploaded = async () => {
    console.log('🔄 Manual refresh triggered');
    
    // Refresh usage stats (real-time listener handles files)
    await loadUsage();
    
    // Force refresh files if real-time listener isn't working
    if (!unsubscribeRef.current) {
      console.log('📁 No real-time listener active, manually refreshing files');
      await loadFiles();
    }
  };

  const handleVaultToggle = (unlocked: boolean) => {
    setIsVaultUnlocked(unlocked);
    if (!unlocked) {
      setIsSecretMode(false);
    }
  };

  if (!user) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-gray-300 border-t-blue-600 rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <FileSelectionProvider>
      <div className="dashboard-container">
        {/* Performance Monitor - only in development */}
        {process.env.NODE_ENV === 'development' && (
          <PerformanceMonitor enabled={true} minimized={true} />
        )}
        
        {/* Usage Warning */}
        {usage && <UsageWarning usage={usage} />}
        
        {/* Header */}
        <div className="flex-shrink-0 px-6 py-4 border-b border-white/10 dark:border-gray-800/10">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                {isSecretMode ? '🔒 Secret Vault' : '📁 My Files'}
              </h1>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {isSecretMode
                  ? 'Encrypted files stored securely'
                  : 'Your personal cloud storage'}
              </p>
            </div>
            
            <VaultToggle
              isSecretMode={isSecretMode}
              isVaultUnlocked={isVaultUnlocked}
              onToggle={(mode) => setIsSecretMode(mode)}
              onVaultStatusChange={handleVaultToggle}
            />
          </div>
        </div>

        {/* Content */}
        <div className="dashboard-content">
          {/* Upload Zone - only show if vault is unlocked for secret mode */}
          {(!isSecretMode || isVaultUnlocked) && (
            <div className="flex-shrink-0 p-6 border-b border-white/10 dark:border-gray-800/10">
              <UploadZone
                isSecretMode={isSecretMode}
                onFileUploaded={handleFileUploaded}
                usage={usage}
              />
            </div>
          )}

          {/* Live Activity Feed */}
          {(!isSecretMode || isVaultUnlocked) && files.length > 0 && (
            <div className="p-6 border-b border-white/10 dark:border-gray-800/10">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Dashboard</h2>
                <button
                  onClick={() => setShowLiveActivity(!showLiveActivity)}
                  className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
                >
                  {showLiveActivity ? 'Hide' : 'Show'} Live Stats
                </button>
              </div>
              {showLiveActivity && (
                <div className="mb-6">
                  <LiveActivityFeed files={files} />
                </div>
              )}
            </div>
          )}

          {/* Files Grid */}
          <div className="p-6">
            {isSecretMode && !isVaultUnlocked ? (
              <div className="h-full flex items-center justify-center">
                <div className="text-center max-w-md">
                  <div className="w-16 h-16 bg-yellow-100 dark:bg-yellow-900/20 rounded-full flex items-center justify-center mx-auto mb-4">
                    <span className="text-2xl">🔒</span>
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                    Secret Vault Locked
                  </h3>
                  <p className="text-gray-600 dark:text-gray-400">
                    Enter your vault password to access encrypted files
                  </p>
                </div>
              </div>
            ) : (
              <FileGrid
                files={files}
                loading={loading}
                isSecretMode={isSecretMode}
                onFileDeleted={handleFileUploaded}
                onRefresh={loadFiles}
              />
            )}
          </div>
        </div>
      </div>
    </FileSelectionProvider>
  );
}