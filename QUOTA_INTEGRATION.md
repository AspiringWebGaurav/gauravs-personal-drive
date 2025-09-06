# Usage Quota System Integration Guide

This guide shows how to integrate the complete monthly reset quota system with your existing upload/delete flows.

## System Overview

The quota system implements:
- **Monthly billing cycle** with timezone support
- **Deletion tracking** - deletions count toward quota until monthly reset
- **Live monitoring** with SWR polling every 10 seconds
- **Upload blocking** when quota is exceeded
- **Warning dialogs** at 90% and 100% usage

## Quick Start

### 1. Environment Setup

Add to your `.env.local`:

```env
# Quota System Configuration
QUOTA_TZ=Asia/Kolkata
FREE_STORAGE_LIMIT_BYTES=5368709120
```

### 2. Add UsageBar to Dashboard

Replace your existing UsageBar import:

```tsx
// OLD: import { UsageBar } from '@/components/dashboard/UsageBar'
// NEW:
import { UsageBar } from '@/components/dashboard/UsageBar'

// Usage in component:
<UsageBar projectId="default" pollMs={10000} />
```

### 3. Guard Uploads with Quota Check

```tsx
import { guardUpload, logQuotaActivity } from '@/lib/quotaGuard'

// Single file upload
const handleFileUpload = async (file: File) => {
  // Check quota before upload
  const guard = await guardUpload(file)
  if (!guard.allowed) {
    alert(guard.message)
    return
  }
  
  // Proceed with upload
  try {
    const uploadResult = await uploadToFirebase(file)
    
    // Log activity for quota tracking
    await logQuotaActivity('upload', file.size, userId)
    
    console.log('Upload successful:', uploadResult)
  } catch (error) {
    console.error('Upload failed:', error)
  }
}

// Multiple files upload
const handleMultipleUploads = async (files: File[]) => {
  const guard = await guardMultipleUploads(files)
  if (!guard.allowed) {
    alert(guard.message)
    return
  }
  
  // Upload each file and log activities
  for (const file of files) {
    await uploadToFirebase(file)
    await logQuotaActivity('upload', file.size, userId)
  }
}
```

### 4. Track Deletions

```tsx
import { logQuotaActivity } from '@/lib/quotaGuard'

const handleFileDelete = async (fileId: string, fileSize: number) => {
  try {
    // Delete from storage/firestore
    await fetch('/api/files', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fileId, fileSize, userId })
    })
    
    // Note: Server-side API already logs deletion activity
    console.log('File deleted successfully')
  } catch (error) {
    console.error('Delete failed:', error)
  }
}
```

## API Endpoints

### GET `/api/quota?projectId=default`

Returns current quota information:

```json
{
  "projectId": "default",
  "monthKey": "2024-01",
  "usedBytes": 1073741824,
  "limitBytes": 5368709120,
  "usedPhysicalBytes": 524288000,
  "deletedBytesAccrued": 549453824,
  "resetAt": "2024-02-01T00:00:00.000Z"
}
```

### POST `/api/quota/activity`

Logs upload/delete activity:

```json
{
  "projectId": "default",
  "userId": "user123",
  "action": "upload", // or "delete"
  "bytes": 1048576
}
```

## Client-Side Integration Examples

### Example: Enhanced Upload Component

```tsx
'use client'
import { useState } from 'react'
import { guardUpload } from '@/lib/quotaGuard'

export function EnhancedUploadArea() {
  const [uploading, setUploading] = useState(false)
  
  const handleDrop = async (files: File[]) => {
    setUploading(true)
    
    for (const file of files) {
      const guard = await guardUpload(file)
      if (!guard.allowed) {
        alert(`Upload blocked: ${guard.message}`)
        continue
      }
      
      try {
        // Your existing upload logic
        await uploadFileToFirebase(file)
      } catch (error) {
        console.error('Upload failed:', error)
      }
    }
    
    setUploading(false)
  }
  
  return (
    <div 
      onDrop={(e) => {
        e.preventDefault()
        const files = Array.from(e.dataTransfer.files)
        handleDrop(files)
      }}
      className="border-2 border-dashed border-gray-300 p-8"
    >
      {uploading ? 'Uploading...' : 'Drop files here or click to upload'}
    </div>
  )
}
```

### Example: Usage with React Dropzone

```tsx
import { useDropzone } from 'react-dropzone'
import { guardMultipleUploads } from '@/lib/quotaGuard'

export function UploadDropzone() {
  const onDrop = async (acceptedFiles: File[]) => {
    const guard = await guardMultipleUploads(acceptedFiles)
    if (!guard.allowed) {
      alert(guard.message)
      return
    }
    
    // Proceed with uploads
    for (const file of acceptedFiles) {
      await uploadFile(file)
    }
  }

  const { getRootProps, getInputProps } = useDropzone({ onDrop })

  return (
    <div {...getRootProps()}>
      <input {...getInputProps()} />
      <p>Drag files here, or click to select</p>
    </div>
  )
}
```

## Server-Side Integration

The `/api/files` route has been enhanced to:

1. **Check quota before uploads** - Returns 413 status if quota exceeded
2. **Log all activities** - Automatically tracks uploads and deletions
3. **Validate file sizes** - Ensures accurate quota calculations

## Firestore Collections

### `usage_events` Collection

Immutable log of all activities:

```json
{
  "projectId": "default",
  "userId": "user123",
  "action": "upload",
  "bytes": 1048576,
  "at": "2024-01-15T10:30:00Z",
  "monthKey": "2024-01"
}
```

### `usage_snapshots` Collection

Monthly aggregated data:

```json
{
  "usedPhysicalBytes": 2147483648,
  "deletedBytesAccrued": 1073741824,
  "updatedAt": "2024-01-15T10:30:00Z"
}
```

## Monthly Reset Logic

- Calculates based on `QUOTA_TZ` environment variable
- Resets on the 1st day of each month at 00:00 in the specified timezone
- Previous month's `deletedBytesAccrued` is cleared
- Physical storage usage carries over (actual files still exist)

## Testing the System

1. **Upload a file** - Check quota increases in UsageBar
2. **Delete a file** - Notice quota doesn't decrease (deletion tracking)
3. **Approach 90% limit** - See yellow warning appear
4. **Exceed 100% limit** - See red warning and upload blocking
5. **Wait for monthly reset** - Quota resets automatically

## Customization Options

### Different Project IDs
```tsx
<UsageBar projectId="user-specific-project" />
```

### Custom Polling Interval
```tsx
<UsageBar pollMs={5000} /> // Poll every 5 seconds
```

### Custom Quota Limits
Set `FREE_STORAGE_LIMIT_BYTES` in environment variables.

## Troubleshooting

### Quota not updating
- Check SWR polling is working
- Verify `/api/quota` endpoint returns data
- Check browser network tab for API calls

### Upload not blocked when quota exceeded
- Verify `guardUpload()` is called before upload
- Check `/api/files` POST integration
- Ensure quota activity logging is working

### Monthly reset not working
- Verify `QUOTA_TZ` environment variable
- Check timezone calculations in `/api/quota`
- Ensure Firestore collections exist

## Production Considerations

1. **Environment Variables** - Set proper timezone and limits
2. **Database Indexes** - Create indexes for `monthKey` and `userId`
3. **Error Handling** - Implement proper error boundaries
4. **User Feedback** - Show clear messages about quota limits
5. **Monitoring** - Track quota API performance