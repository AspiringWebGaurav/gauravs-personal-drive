import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/firebaseAdmin'
import { formatInTimeZone } from 'date-fns-tz'

function monthKey(now = new Date()) {
  const tz = process.env.QUOTA_TZ || 'UTC'
  return formatInTimeZone(now, tz, 'yyyy-MM')
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}))
    const { projectId = 'default', userId = 'anonymous', action, bytes = 0 } = body

    if (!['upload', 'delete'].includes(action)) {
      return NextResponse.json({ error: 'invalid action' }, { status: 400 })
    }

    const db = getDb()
    const at = new Date()
    const key = monthKey(at)

    // 1) Record the immutable event
    await db.collection('usage_events').add({ 
      projectId, 
      userId, 
      action, 
      bytes: Math.max(0, bytes), 
      at, 
      monthKey: key 
    })

    // 2) Update monthly snapshot so deletions still "stick" until reset
    const snapRef = db.collection('usage_snapshots').doc(key)
    await db.runTransaction(async (tx) => {
      const snap = await tx.get(snapRef)
      let data = snap.exists 
        ? snap.data()! 
        : { 
            usedPhysicalBytes: 0, 
            deletedBytesAccrued: 0, 
            updatedAt: at 
          }

      if (action === 'upload') {
        data.usedPhysicalBytes += Math.max(0, bytes)
      }
      if (action === 'delete') {
        data.usedPhysicalBytes = Math.max(0, data.usedPhysicalBytes - Math.max(0, bytes))
        data.deletedBytesAccrued += Math.max(0, bytes)
      }
      data.updatedAt = at
      
      tx.set(snapRef, data, { merge: true })
    })

    return NextResponse.json({ ok: true, monthKey: key })
  } catch (error) {
    console.error('Error logging quota activity:', error)
    return NextResponse.json(
      { error: 'Failed to log activity' }, 
      { status: 500 }
    )
  }
}