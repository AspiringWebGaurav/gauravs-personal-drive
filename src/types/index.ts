import { Timestamp } from 'firebase/firestore'

// User types
export interface User {
  uid: string
  email: string | null
  displayName: string | null
  photoURL: string | null
  emailVerified: boolean
  createdAt?: Timestamp
  lastLoginAt?: Timestamp
}

// File types
export interface FileMetadata {
  id: string
  userId: string
  filename: string
  size: number
  contentType: string
  storagePath: string
  folderId: string | null // null for root level
  createdAt: Timestamp
  updatedAt: Timestamp
  downloadURL?: string
}

// Folder types
export interface FolderMetadata {
  id: string
  userId: string
  name: string
  parentId: string | null // null for root level
  createdAt: Timestamp
  updatedAt: Timestamp
  itemCount?: number // computed field
}

// Usage tracking
export interface UsageData {
  usedBytes: number
  limitBytes: number
  fileCount: number
  folderCount: number
  lastUpdated: Timestamp
}

// Upload types
export interface UploadProgress {
  filename: string
  progress: number
  status: 'uploading' | 'completed' | 'error' | 'cancelled'
  error?: string
}

export interface UploadTask {
  file: File
  folderId: string | null
  progress: UploadProgress
}

// View types
export type ViewMode = 'grid' | 'table'

// Breadcrumb navigation
export interface BreadcrumbItem {
  id: string | null
  name: string
  path: string
}

// File actions
export interface FileAction {
  id: string
  label: string
  icon: string
  onClick: (file: FileMetadata) => void
  destructive?: boolean
}

// Folder actions
export interface FolderAction {
  id: string
  label: string
  icon: string
  onClick: (folder: FolderMetadata) => void
  destructive?: boolean
}

// API Response types
export interface ApiResponse<T = any> {
  success: boolean
  data?: T
  error?: string
  message?: string
}

// Form types
export interface CreateFolderForm {
  name: string
  parentId: string | null
}

export interface RenameItemForm {
  newName: string
}

// Theme types
export type Theme = 'light' | 'dark' | 'system'

// Navigation types
export interface NavItem {
  id: string
  label: string
  path: string
  icon?: string
  active?: boolean
}

// Firebase types
export interface FirebaseConfig {
  apiKey: string
  authDomain: string
  databaseURL: string
  projectId: string
  storageBucket: string
  messagingSenderId: string
  appId: string
  measurementId?: string
}

// Storage types
export interface StorageReference {
  bucket: string
  fullPath: string
  name: string
}

// Error types
export interface AppError {
  code: string
  message: string
  details?: any
}

// Component prop types
export interface BaseComponentProps {
  className?: string
  children?: React.ReactNode
}

// File list item (union of files and folders)
export type ListItem = FileMetadata | FolderMetadata

// Type guards
export const isFile = (item: ListItem): item is FileMetadata => {
  return 'contentType' in item
}

export const isFolder = (item: ListItem): item is FolderMetadata => {
  return 'name' in item && !('contentType' in item)
}

// Utility types
export type FileSize = {
  bytes: number
  formatted: string
}

export type SortField = 'name' | 'size' | 'createdAt' | 'updatedAt'
export type SortDirection = 'asc' | 'desc'

export interface SortConfig {
  field: SortField
  direction: SortDirection
}

// Filter types
export interface FilterConfig {
  search: string
  fileTypes: string[]
  dateRange?: {
    start: Date
    end: Date
  }
}

// Constants
export const FILE_SIZE_LIMITS = {
  MAX_FILE_SIZE: 100 * 1024 * 1024, // 100MB
  DEFAULT_QUOTA: 5 * 1024 * 1024 * 1024, // 5GB
} as const

export const SUPPORTED_FILE_TYPES = [
  'image/*',
  'video/*',
  'audio/*',
  'application/pdf',
  'text/*',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/zip',
  'application/x-rar-compressed',
] as const