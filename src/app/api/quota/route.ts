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

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const projectId = searchParams.get('projectId') || 'default'

    const db = getDb()
    const key = monthKey()
    const snap = await db.collection('usage_snapshots').doc(key).get()
    
    const { 
      usedPhysicalBytes = 0, 
      deletedBytesAccrued = 0 
    } = snap.exists ? (snap.data() as any) : {}

    // Billable = physical storage currently allocated + deleted that "stick" until reset
    const usedBytes = usedPhysicalBytes + deletedBytesAccrued
    const limitBytes = Number(process.env.FREE_STORAGE_LIMIT_BYTES || 5 * 1024 * 1024 * 1024)

    return NextResponse.json({
      projectId,
      monthKey: key,
      usedBytes,
      limitBytes,
      usedPhysicalBytes,
      deletedBytesAccrued,
      resetAt: nextMonthReset(),
    })
  } catch (error) {
    console.error('Error getting quota information:', error)
    return NextResponse.json(
      { error: 'Failed to get quota information' }, 
      { status: 500 }
    )
  }
}