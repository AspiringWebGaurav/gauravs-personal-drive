export interface UsageDocument {
  ownerUid: string;
  storageBytesUsed: number;
  downloadsToday: number;
  uploadsMonth: number;
  downloadsMonth: number;
  readsToday: number;
  writesToday: number;
  hostingBandwidthToday: number;
  lastUpdated: any; // Firestore Timestamp
  lastDayReset: any; // Firestore Timestamp
  lastMonthReset: any; // Firestore Timestamp
}

export interface UsageLimits {
  storageBytes: number;
  downloadsDayBytes: number;
  uploadsMonth: number;
  downloadsMonth: number;
  readsDay: number;
  writesDay: number;
  hostingBandwidthDay: number;
}

export interface UsageStatus {
  current: UsageDocument;
  limits: UsageLimits;
  warnings: {
    storage: boolean;
    dailyDownloads: boolean;
    monthlyUploads: boolean;
    monthlyDownloads: boolean;
    dailyReads: boolean;
    dailyWrites: boolean;
    hostingBandwidth: boolean;
  };
  blocked: {
    storage: boolean;
    dailyDownloads: boolean;
    monthlyUploads: boolean;
    monthlyDownloads: boolean;
    dailyReads: boolean;
    dailyWrites: boolean;
    hostingBandwidth: boolean;
  };
}

export interface UserSettings {
  secretVault?: {
    salt: string;
    hash: string;
    createdAt: any; // Firestore Timestamp
    encryptByDefault: boolean;
  };
  shareDefaults?: {
    passwordRequired: boolean;
    expiresDays?: number;
  };
  portfolioUrl?: string;
}