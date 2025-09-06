import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/firebaseAdmin'
import { formatInTimeZone } from 'date-fns-tz'

function monthKey(now = new Date()) {
  const tz = process.env.QUOTA_TZ || 'UTC'
  return formatInTimeZone(now, tz, 'yyyy-MM')
}

async function calculateActualUsageFromFiles() {
  const db = getDb()
  
  try {
    console.log('🔄 Starting background sync calculation...')
    
    // Get all files to calculate current physical storage
    const filesSnapshot = await db.collection('files').get()
    let usedPhysicalBytes = 0
    let fileCount = 0
    
    filesSnapshot.docs.forEach(doc => {
      const data = doc.data()
      if (data.size && typeof data.size === 'number') {
        usedPhysicalBytes += data.size
        fileCount++
      }
    })
    
    console.log('📊 Background sync results:', {
      totalFiles: filesSnapshot.docs.length,
      validFiles: fileCount,
      usedPhysicalBytes,
      usedPhysicalMB: Math.round(usedPhysicalBytes / (1024 * 1024))
    })
    
    return { usedPhysicalBytes, fileCount }
  } catch (error) {
    console.error('Error calculating actual usage from files:', error)
    throw error
  }
}

export async function POST(req: NextRequest) {
  try {
    // Verify authorization (you may want to add API key or admin token check)
    const authHeader = req.headers.get('authorization')
    const apiKey = process.env.QUOTA_SYNC_API_KEY
    
    if (apiKey && authHeader !== `Bearer ${apiKey}`) {
      console.warn('Unauthorized sync attempt')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const db = getDb()
    const key = monthKey()
    const now = new Date()
    
    // Calculate actual usage from files collection
    const { usedPhysicalBytes, fileCount } = await calculateActualUsageFromFiles()
    
    // Get current snapshot to preserve deletedBytesAccrued
    const snapRef = db.collection('usage_snapshots').doc(key)
    const snap = await snapRef.get()
    
    const currentData = snap.exists ? snap.data() : {}
    const deletedBytesAccrued = currentData?.deletedBytesAccrued || 0
    
    // Update the snapshot with real data
    const updatedData = {
      usedPhysicalBytes,
      deletedBytesAccrued, // Keep existing deleted bytes
      fileCount,
      updatedAt: now,
      lastSyncAt: now,
      syncMethod: 'background-job'
    }
    
    await snapRef.set(updatedData, { merge: true })
    
    console.log('✅ Background sync completed:', updatedData)
    
    // Also log this sync activity
    await db.collection('sync_logs').add({
      monthKey: key,
      syncedAt: now,
      usedPhysicalBytes,
      fileCount,
      deletedBytesAccrued,
      status: 'success'
    })
    
    return NextResponse.json({
      success: true,
      monthKey: key,
      usedPhysicalBytes,
      deletedBytesAccrued,
      fileCount,
      totalBillable: usedPhysicalBytes + deletedBytesAccrued,
      syncedAt: now.toISOString()
    })
  } catch (error) {
    console.error('Error in background sync:', error)
    
    // Log the error
    try {
      const db = getDb()
      await db.collection('sync_logs').add({
        monthKey: monthKey(),
        syncedAt: new Date(),
        error: error instanceof Error ? error.message : String(error),
        status: 'error'
      })
    } catch (logError) {
      console.error('Failed to log sync error:', logError)
    }
    
    return NextResponse.json(
      { error: 'Sync failed', details: error instanceof Error ? error.message : String(error) }, 
      { status: 500 }
    )
  }
}

// GET endpoint to check sync status
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const currentMonth = searchParams.get('month') || monthKey()
    
    const db = getDb()
    
    // Get current snapshot
    const snap = await db.collection('usage_snapshots').doc(currentMonth).get()
    const snapshotData = snap.exists ? snap.data() : null
    
    // Get recent sync logs
    const logsSnapshot = await db.collection('sync_logs')
      .where('monthKey', '==', currentMonth)
      .orderBy('syncedAt', 'desc')
      .limit(5)
      .get()
    
    const logs = logsSnapshot.docs.map((doc: any) => ({
      id: doc.id,
      ...doc.data()
    }))
    
    return NextResponse.json({
      monthKey: currentMonth,
      snapshot: snapshotData,
      recentSyncs: logs,
      lastSync: logs.length > 0 ? (logs[0] as any).syncedAt : null
    })
  } catch (error) {
    console.error('Error getting sync status:', error)
    return NextResponse.json(
      { error: 'Failed to get sync status' },
      { status: 500 }
    )
  }
}