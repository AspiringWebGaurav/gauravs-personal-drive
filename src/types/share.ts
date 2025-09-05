export interface ShareDocument {
  id: string;
  fileId: string;
  token: string;
  createdAt: any; // Firestore Timestamp
  expiresAt?: any; // Firestore Timestamp
  downloadCount: number;
  passwordRequired?: boolean;
  passwordSalt?: string;
  passwordHash?: string;
  lastDownload?: any; // Firestore Timestamp
  og: {
    name: string;
    size: number;
    type: string;
  };
}

export interface ShareSettings {
  passwordRequired: boolean;
  expiresDays?: number;
  password?: string;
}

export interface CreateShareRequest {
  fileId: string;
  settings: ShareSettings;
}

export interface SharePageData {
  share: ShareDocument;
  file: {
    name: string;
    size: number;
    type: string;
  };
  portfolioUrl?: string;
}