import { UsageLimits, UsageStatus, UsageDocument } from '@/types/usage';
import { getUserUsage, updateUsage } from '@/lib/firebase/firestore';

// Get usage limits from environment variables
export const getUsageLimits = (): UsageLimits => ({
  storageBytes: parseInt(process.env.NEXT_PUBLIC_LIMIT_STORAGE_BYTES || '5368709120'),
  downloadsDayBytes: parseInt(process.env.NEXT_PUBLIC_LIMIT_DOWNLOADS_DAY_BYTES || '1073741824'),
  uploadsMonth: parseInt(process.env.NEXT_PUBLIC_LIMIT_UPLOADS_MONTH_COUNT || '5000'),
  downloadsMonth: parseInt(process.env.NEXT_PUBLIC_LIMIT_DOWNLOADS_MONTH_COUNT || '50000'),
  readsDay: parseInt(process.env.NEXT_PUBLIC_LIMIT_FIRESTORE_READS_DAY || '50000'),
  writesDay: parseInt(process.env.NEXT_PUBLIC_LIMIT_FIRESTORE_WRITES_DAY || '50000'),
  hostingBandwidthDay: parseInt(process.env.NEXT_PUBLIC_LIMIT_HOSTING_BW_DAY_BYTES || '377487360')
});

// Check if usage needs daily/monthly reset
const needsReset = (lastReset: any, isDaily: boolean): boolean => {
  if (!lastReset) return true;
  
  const now = new Date();
  const resetDate = lastReset.toDate ? lastReset.toDate() : new Date(lastReset);
  
  if (isDaily) {
    return now.getDate() !== resetDate.getDate() || 
           now.getMonth() !== resetDate.getMonth() ||
           now.getFullYear() !== resetDate.getFullYear();
  } else {
    return now.getMonth() !== resetDate.getMonth() ||
           now.getFullYear() !== resetDate.getFullYear();
  }
};

// Reset usage counters if needed
const resetUsageCounters = async (uid: string, usage: UsageDocument) => {
  const updates: any = {};
  const now = new Date();

  // Reset daily counters
  if (needsReset(usage.lastDayReset, true)) {
    updates.downloadsToday = 0;
    updates.readsToday = 0;
    updates.writesToday = 0;
    updates.hostingBandwidthToday = 0;
    updates.lastDayReset = now;
  }

  // Reset monthly counters
  if (needsReset(usage.lastMonthReset, false)) {
    updates.uploadsMonth = 0;
    updates.downloadsMonth = 0;
    updates.lastMonthReset = now;
  }

  if (Object.keys(updates).length > 0) {
    await updateUsage(uid, updates);
    return { ...usage, ...updates };
  }

  return usage;
};

// Get current usage status with warnings and blocks
export const getUsageStatus = async (uid: string): Promise<UsageStatus | null> => {
  try {
    const { data: usage, error } = await getUserUsage(uid);
    if (error || !usage) return null;

    // Reset counters if needed
    const currentUsage = await resetUsageCounters(uid, usage as UsageDocument);
    const limits = getUsageLimits();

    // Calculate warning thresholds (80% of limit)
    const warnings = {
      storage: currentUsage.storageBytesUsed >= limits.storageBytes * 0.8,
      dailyDownloads: currentUsage.downloadsToday >= limits.downloadsDayBytes * 0.8,
      monthlyUploads: currentUsage.uploadsMonth >= limits.uploadsMonth * 0.8,
      monthlyDownloads: currentUsage.downloadsMonth >= limits.downloadsMonth * 0.8,
      dailyReads: currentUsage.readsToday >= limits.readsDay * 0.8,
      dailyWrites: currentUsage.writesToday >= limits.writesDay * 0.8,
      hostingBandwidth: currentUsage.hostingBandwidthToday >= limits.hostingBandwidthDay * 0.8
    };

    // Calculate block thresholds (100% of limit)
    const blocked = {
      storage: currentUsage.storageBytesUsed >= limits.storageBytes,
      dailyDownloads: currentUsage.downloadsToday >= limits.downloadsDayBytes,
      monthlyUploads: currentUsage.uploadsMonth >= limits.uploadsMonth,
      monthlyDownloads: currentUsage.downloadsMonth >= limits.downloadsMonth,
      dailyReads: currentUsage.readsToday >= limits.readsDay,
      dailyWrites: currentUsage.writesToday >= limits.writesDay,
      hostingBandwidth: currentUsage.hostingBandwidthToday >= limits.hostingBandwidthDay
    };

    return {
      current: currentUsage,
      limits,
      warnings,
      blocked
    };
  } catch (error) {
    console.error('Error getting usage status:', error);
    return null;
  }
};

// Check if upload is allowed
export const canUpload = async (uid: string, fileSize: number): Promise<{ allowed: boolean; reason?: string }> => {
  const status = await getUsageStatus(uid);
  if (!status) return { allowed: false, reason: 'Unable to check usage limits' };

  if (status.current.storageBytesUsed + fileSize > status.limits.storageBytes) {
    return { 
      allowed: false, 
      reason: `Upload would exceed storage limit (${formatBytes(status.limits.storageBytes)})` 
    };
  }

  if (status.blocked.monthlyUploads) {
    return { 
      allowed: false, 
      reason: `Monthly upload limit reached (${status.limits.uploadsMonth})` 
    };
  }

  return { allowed: true };
};

// Check if download is allowed
export const canDownload = async (uid: string, fileSize: number): Promise<{ allowed: boolean; reason?: string }> => {
  const status = await getUsageStatus(uid);
  if (!status) return { allowed: false, reason: 'Unable to check usage limits' };

  if (status.current.downloadsToday + fileSize > status.limits.downloadsDayBytes) {
    return { 
      allowed: false, 
      reason: `Daily download limit would be exceeded (${formatBytes(status.limits.downloadsDayBytes)})` 
    };
  }

  if (status.blocked.monthlyDownloads) {
    return { 
      allowed: false, 
      reason: `Monthly download limit reached (${status.limits.downloadsMonth})` 
    };
  }

  return { allowed: true };
};

// Update usage after successful operations
export const trackUpload = async (uid: string, fileSize: number) => {
  await updateUsage(uid, {
    storageBytesUsed: fileSize, // This will be incremented
    uploadsMonth: 1,
    writesToday: 1
  });
};

export const trackDownload = async (uid: string, fileSize: number) => {
  await updateUsage(uid, {
    downloadsToday: fileSize,
    downloadsMonth: 1,
    readsToday: 1,
    hostingBandwidthToday: fileSize
  });
};

// Format bytes to human readable
export const formatBytes = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

// Get percentage of limit used
export const getUsagePercentage = (current: number, limit: number): number => {
  return Math.min((current / limit) * 100, 100);
};