// Quota guard utility for client-side quota validation before uploads

interface QuotaInfo {
  usedBytes: number
  limitBytes: number
  usedPhysicalBytes: number
  deletedBytesAccrued: number
  resetAt: string
}

/**
 * Check if upload is allowed based on current quota
 */
export async function guardUpload(file: File, projectId = 'default'): Promise<{ allowed: boolean; message?: string }> {
  try {
    const response = await fetch(`/api/quota?projectId=${projectId}`)
    if (!response.ok) {
      console.warn('Failed to fetch quota info, allowing upload')
      return { allowed: true }
    }
    
    const quota: QuotaInfo = await response.json()
    
    if (quota.usedBytes + file.size > quota.limitBytes) {
      const resetDate = new Date(quota.resetAt).toLocaleDateString()
      return {
        allowed: false,
        message: `Free plan quota exceeded. Upload blocked until reset on ${resetDate}. Current usage: ${formatBytes(quota.usedBytes)} / ${formatBytes(quota.limitBytes)}, File size: ${formatBytes(file.size)}`
      }
    }
    
    return { allowed: true }
  } catch (error) {
    console.warn('Error checking quota, allowing upload:', error)
    return { allowed: true }
  }
}

/**
 * Check if multiple files can be uploaded
 */
export async function guardMultipleUploads(files: File[], projectId = 'default'): Promise<{ allowed: boolean; message?: string }> {
  const totalSize = files.reduce((sum, file) => sum + file.size, 0)
  
  try {
    const response = await fetch(`/api/quota?projectId=${projectId}`)
    if (!response.ok) {
      console.warn('Failed to fetch quota info, allowing upload')
      return { allowed: true }
    }
    
    const quota: QuotaInfo = await response.json()
    
    if (quota.usedBytes + totalSize > quota.limitBytes) {
      const resetDate = new Date(quota.resetAt).toLocaleDateString()
      return {
        allowed: false,
        message: `Free plan quota exceeded. Upload blocked until reset on ${resetDate}. Current: ${formatBytes(quota.usedBytes)}, Limit: ${formatBytes(quota.limitBytes)}, Upload: ${formatBytes(totalSize)}`
      }
    }
    
    return { allowed: true }
  } catch (error) {
    console.warn('Error checking quota, allowing upload:', error)
    return { allowed: true }
  }
}

/**
 * Log quota activity (upload/delete)
 */
export async function logQuotaActivity(action: 'upload' | 'delete', bytes: number, userId = 'anonymous', projectId = 'default') {
  try {
    await fetch('/api/quota/activity', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ projectId, userId, action, bytes })
    })
  } catch (error) {
    console.warn('Failed to log quota activity:', error)
  }
}

/**
 * Format bytes for display
 */
function formatBytes(bytes: number): string {
  if (!bytes) return '0 Bytes'
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`
}

/**
 * Get current quota information
 */
export async function getCurrentQuota(projectId = 'default'): Promise<QuotaInfo | null> {
  try {
    const response = await fetch(`/api/quota?projectId=${projectId}`)
    if (!response.ok) return null
    return await response.json()
  } catch (error) {
    console.warn('Error fetching quota info:', error)
    return null
  }
}