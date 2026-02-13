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
export async function guardUpload(_file: File, _projectId = 'default'): Promise<{ allowed: boolean; message?: string }> {
  // No limits — all uploads allowed
  return { allowed: true }
}

/**
 * Check if multiple files can be uploaded
 */
export async function guardMultipleUploads(_files: File[], _projectId = 'default'): Promise<{ allowed: boolean; message?: string }> {
  // No limits — all uploads allowed
  return { allowed: true }
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