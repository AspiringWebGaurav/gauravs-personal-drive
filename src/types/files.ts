export interface FileDocument {
  id: string;
  ownerUid: string;
  path: string;
  name: string;
  size: number;
  type: string;
  isSecret: boolean;
  createdAt: any; // Firestore Timestamp
  sha256?: string;
}

export interface UploadProgress {
  progress: number;
  file: File;
  status: 'uploading' | 'completed' | 'error';
  error?: string;
}

export interface FileGridItem {
  id: string;
  name: string;
  size: number;
  type: string;
  createdAt: string;
  isSecret: boolean;
}