import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/firebaseAdmin'
import { formatInTimeZone } from 'date-fns-tz'

function monthKey(now = new Date()) {
  const tz = process.env.QUOTA_TZ || 'UTC'
  return formatInTimeZone(now, tz, 'yyyy-MM')
}

function nextMonthReset(now = new Date()) {
  const tz = process.env.QUOTA_TZ || 'UTC'
  const y = Number(formatInTimeZone(now, tz, 'yyyy'))
  const m = Number(formatInTimeZone(now, tz, 'M'))

  // Calculate first day of next month in the specified timezone
  const nextMonth = m === 12 ? 1 : m + 1
  const nextYear = m === 12 ? y + 1 : y

  // Create date in UTC for the first day of next month
  const firstNextMonth = new Date(Date.UTC(nextYear, nextMonth - 1, 1, 0, 0, 0))
  return firstNextMonth.toISOString()
}

// In-memory cache for quota calculations (60 second TTL)
// In-memory cache for quota calculations
const quotaCache = new Map<string, { data: any; expiry: number }>()
const CACHE_TTL_STANDARD = 60 * 1000 // 60 seconds for standard requests
const CACHE_TTL_REALTIME = 2 * 1000 // 2 seconds for realtime (prevents instant re-fetch but allows updates)

async function calculateRealTimeUsage(userId?: string | null) {
  const db = getDb()

  try {
    let filesQuery: any = db.collection('files')

    // If userId provided, filter by user (for per-user quotas in future)
    if (userId) {
      filesQuery = filesQuery.where('userId', '==', userId)
    }

    // Get all files to calculate current physical storage
    const filesSnapshot = await filesQuery.get()
    let usedPhysicalBytes = 0
    let validFiles = 0
    let invalidFiles = 0
    const fileDetails: any[] = []

    filesSnapshot.docs.forEach((doc: any) => {
      const data = doc.data()
      const fileInfo = {
        id: doc.id,
        filename: data.filename,
        size: data.size,
        sizeType: typeof data.size,
        isValid: false
      }

      if (data.size && typeof data.size === 'number' && data.size > 0) {
        usedPhysicalBytes += data.size
        validFiles++
        fileInfo.isValid = true
      } else {
        invalidFiles++
        console.warn('❌ Invalid file size data:', {
          docId: doc.id,
          filename: data.filename,
          size: data.size,
          sizeType: typeof data.size
        })
      }

      fileDetails.push(fileInfo)
    })

    console.log('🔥 Real-time calculation detailed:', {
      totalFiles: filesSnapshot.docs.length,
      validFiles,
      invalidFiles,
      usedPhysicalBytes,
      usedPhysicalMB: Math.round(usedPhysicalBytes / (1024 * 1024)),
      calculationTimestamp: new Date().toISOString()
    })

    // Enhanced validation: throw error if no valid data found but files exist
    if (filesSnapshot.docs.length > 0 && usedPhysicalBytes === 0) {
      console.error('🚨 Data integrity issue detected:', {
        totalFiles: filesSnapshot.docs.length,
        validFiles,
        invalidFiles,
        sampleInvalidFiles: fileDetails.filter(f => !f.isValid).slice(0, 3)
      })
      throw new Error(`Found ${filesSnapshot.docs.length} files but calculated 0 bytes - data integrity issue detected`)
    }

    return {
      usedPhysicalBytes,
      validFiles,
      invalidFiles,
      totalFiles: filesSnapshot.docs.length,
      fileDetails: process.env.NODE_ENV === 'development' ? fileDetails.slice(0, 5) : undefined
    }
  } catch (error) {
    console.error('❌ Real-time calculation failed:', {
      error: error instanceof Error ? error.message : String(error),
      userId,
      timestamp: new Date().toISOString()
    })
    throw error
  }
}

async function getUsageFromSnapshot(monthKey: string) {
  try {
    const db = getDb()
    const snap = await db.collection('usage_snapshots').doc(monthKey).get()

    return snap.exists ? (snap.data() as any) : {
      usedPhysicalBytes: 0,
      deletedBytesAccrued: 0
    }
  } catch (error) {
    console.error('Error getting usage snapshot:', error)
    return {
      usedPhysicalBytes: 0,
      deletedBytesAccrued: 0
    }
  }
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const projectId = searchParams.get('projectId') || 'default'
    const userId = searchParams.get('userId') // Optional user filter
    const useRealTime = searchParams.get('realtime') !== 'false' // Default to real-time

    // Check cache first
    const cacheKey = `${projectId}-${userId || 'global'}-${useRealTime}`
    const cached = quotaCache.get(cacheKey)
    if (cached && Date.now() < cached.expiry) {
      console.log('📊 Returning cached quota data')
      return NextResponse.json(cached.data)
    }

    const key = monthKey()
    let usedPhysicalBytes = 0
    let deletedBytesAccrued = 0
    let calculationMethod = 'snapshot'

    let realTimeDetails: any = undefined

    if (useRealTime) {
      try {
        // Primary: Calculate from actual files collection (REAL-TIME)
        const realTimeData = await calculateRealTimeUsage(userId)
        usedPhysicalBytes = realTimeData.usedPhysicalBytes
        calculationMethod = 'real-time'
        realTimeDetails = {
          validFiles: realTimeData.validFiles,
          invalidFiles: realTimeData.invalidFiles,
          totalFiles: realTimeData.totalFiles,
          fileDetails: realTimeData.fileDetails
        }

        // Get deleted bytes from snapshot for billing accuracy
        const snapshotData = await getUsageFromSnapshot(key)
        deletedBytesAccrued = snapshotData.deletedBytesAccrued || 0

        console.log('✅ Using real-time calculation successfully:', {
          usedPhysicalBytes,
          validFiles: realTimeData.validFiles,
          invalidFiles: realTimeData.invalidFiles
        })
      } catch (realTimeError) {
        console.error('⚠️ Real-time calculation failed, falling back to snapshot:', {
          error: realTimeError instanceof Error ? realTimeError.message : String(realTimeError),
          userId,
          projectId
        })

        // Fallback: Use snapshot data
        const snapshotData = await getUsageFromSnapshot(key)
        usedPhysicalBytes = snapshotData.usedPhysicalBytes || 0
        deletedBytesAccrued = snapshotData.deletedBytesAccrued || 0
        calculationMethod = 'snapshot-fallback'

        // Include error details in development mode
        realTimeDetails = process.env.NODE_ENV === 'development' ? {
          fallbackReason: realTimeError instanceof Error ? realTimeError.message : String(realTimeError),
          fallbackTimestamp: new Date().toISOString()
        } : undefined
      }
    } else {
      // Use snapshot only (for performance testing)
      const snapshotData = await getUsageFromSnapshot(key)
      usedPhysicalBytes = snapshotData.usedPhysicalBytes || 0
      deletedBytesAccrued = snapshotData.deletedBytesAccrued || 0
      calculationMethod = 'snapshot-only'
    }

    // Billable = physical storage currently allocated + deleted that "stick" until reset
    const usedBytes = usedPhysicalBytes + deletedBytesAccrued
    const limitBytes = Number(process.env.FREE_STORAGE_LIMIT_BYTES || 5 * 1024 * 1024 * 1024)

    // Calculate percentage for debugging
    const usagePercentage = limitBytes > 0 ? Math.round((usedBytes / limitBytes) * 100) : 0

    const responseData = {
      projectId,
      monthKey: key,
      usedBytes,
      limitBytes,
      usedPhysicalBytes,
      deletedBytesAccrued,
      resetAt: nextMonthReset(),
      calculationMethod,
      timestamp: new Date().toISOString(),
      // Add debug information
      usagePercentage,
      usageFormatted: {
        usedMB: Math.round(usedBytes / (1024 * 1024)),
        limitMB: Math.round(limitBytes / (1024 * 1024)),
        physicalMB: Math.round(usedPhysicalBytes / (1024 * 1024)),
        deletedMB: Math.round(deletedBytesAccrued / (1024 * 1024))
      },
      // Include detailed debug info in development
      ...(process.env.NODE_ENV === 'development' && realTimeDetails ? { debug: realTimeDetails } : {})
    }

    // Enhanced logging for debugging
    console.log('📊 Quota calculation complete:', {
      projectId,
      calculationMethod,
      usagePercentage,
      usedMB: Math.round(usedBytes / (1024 * 1024)),
      limitMB: Math.round(limitBytes / (1024 * 1024)),
      timestamp: responseData.timestamp
    })

    // Cache the response
    const currentTTL = useRealTime ? CACHE_TTL_REALTIME : CACHE_TTL_STANDARD
    quotaCache.set(cacheKey, {
      data: responseData,
      expiry: Date.now() + currentTTL
    })

    // Clean old cache entries periodically
    if (Math.random() < 0.1) { // 10% chance
      const now = Date.now()
      for (const [key, value] of quotaCache.entries()) {
        if (now >= value.expiry) {
          quotaCache.delete(key)
        }
      }
    }

    return NextResponse.json(responseData)
  } catch (error) {
    console.error('Error getting quota information:', error)
    return NextResponse.json(
      { error: 'Failed to get quota information', timestamp: new Date().toISOString() },
      { status: 500 }
    )
  }
}