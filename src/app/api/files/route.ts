import { NextRequest, NextResponse } from 'next/server'
import { adminFirestore, adminStorage, verifyIdToken } from '@/lib/firebaseAdmin'
import { cookies } from 'next/headers'

// Helper function to log quota activity directly to Firestore (no recursive HTTP fetch)
async function logQuotaActivity(userId: string, action: 'upload' | 'delete', bytes: number) {
  try {
    const at = new Date()
    const key = `${at.getUTCFullYear()}-${String(at.getUTCMonth() + 1).padStart(2, '0')}`

    await adminFirestore.collection('usage_events').add({
      projectId: 'default',
      userId,
      action,
      bytes: Math.max(0, bytes),
      at,
      monthKey: key
    })

    const snapRef = adminFirestore.collection('usage_snapshots').doc(key)
    await adminFirestore.runTransaction(async (tx) => {
      const snap = await tx.get(snapRef)
      let data: any = snap.exists
        ? snap.data()
        : { usedPhysicalBytes: 0, deletedBytesAccrued: 0, updatedAt: at }

      if (action === 'upload') {
        data.usedPhysicalBytes = (data.usedPhysicalBytes || 0) + Math.max(0, bytes)
      }
      if (action === 'delete') {
        data.usedPhysicalBytes = Math.max(0, (data.usedPhysicalBytes || 0) - Math.max(0, bytes))
        data.deletedBytesAccrued = (data.deletedBytesAccrued || 0) + Math.max(0, bytes)
      }
      data.updatedAt = at
      tx.set(snapRef, data, { merge: true })
    })
  } catch (error) {
    console.warn('Failed to log quota activity directly:', error)
  }
}

// Helper function to check quota before upload
async function checkQuotaBeforeUpload(userId: string, fileSize: number) {
  try {
    const limitBytes = Number(process.env.FREE_STORAGE_LIMIT_BYTES || 5 * 1024 * 1024 * 1024)
    const at = new Date()
    const key = `${at.getUTCFullYear()}-${String(at.getUTCMonth() + 1).padStart(2, '0')}`
    const snap = await adminFirestore.collection('usage_snapshots').doc(key).get()
    const data = snap.exists ? snap.data() : { usedPhysicalBytes: 0, deletedBytesAccrued: 0 }
    const usedBytes = (data?.usedPhysicalBytes || 0) + (data?.deletedBytesAccrued || 0)

    if (usedBytes + fileSize > limitBytes) {
      return {
        allowed: false,
        message: `Upload would exceed quota limit. Current: ${Math.round(usedBytes / (1024 * 1024))}MB, Limit: ${Math.round(limitBytes / (1024 * 1024))}MB, File: ${Math.round(fileSize / (1024 * 1024))}MB`
      }
    }

    return { allowed: true }
  } catch (error) {
    console.warn('Failed to check quota, allowing upload:', error)
    return { allowed: true }
  }
}

// Handle file upload validation and server-side processing
export async function POST(request: NextRequest) {
  console.log('🔥 API DEBUG: POST /api/files called')

  try {
    const cookieStore = await cookies()
    const session = cookieStore.get('session')
    const authHeader = request.headers.get('authorization')

    console.log('🔑 API DEBUG: Auth check:', {
      hasSession: !!session?.value,
      hasAuthHeader: !!authHeader
    })

    // Try to get user ID from session cookie or authorization header
    let userId = null

    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split('Bearer ')[1]
      const verification = await verifyIdToken(token)
      if (verification.success) {
        userId = verification.uid
        console.log('✅ API DEBUG: Token verified for user:', userId)
      } else {
        console.error('❌ API DEBUG: Token verification failed:', verification.error)
        return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
      }
    } else if (session?.value) {
      // Fallback to session if available
      console.log('📝 API DEBUG: Using session authentication')
      // You would decode the session here in a real implementation
      return NextResponse.json({ message: 'Upload validation successful' })
    } else {
      console.error('❌ API DEBUG: No authentication provided')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    console.log('📦 API DEBUG: Request body:', body)

    const { fileName, fileSize, contentType, storagePath, downloadURL, folderId } = body

    // Validate required fields
    if (!fileName || !fileSize || !storagePath || !downloadURL) {
      console.error('❌ API DEBUG: Missing required fields')
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Log upload activity (no blocking — unlimited uploads)
    if (userId) {
      await logQuotaActivity(userId, 'upload', fileSize)
    }

    console.log('✅ API DEBUG: Upload validation passed')

    return NextResponse.json({
      success: true,
      message: 'Upload validated successfully',
      userId: userId
    })
  } catch (error) {
    console.error('❌ API DEBUG: POST /api/files error:', error)
    return NextResponse.json(
      { error: 'Server error during upload validation' },
      { status: 500 }
    )
  }
}

// Get user files
export async function GET(request: NextRequest) {
  try {
    const cookieStore = await cookies()
    const session = cookieStore.get('session')

    if (!session?.value) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const folderId = searchParams.get('folderId')

    // In a real implementation, you'd verify the session and get the user ID
    // For now, we'll assume the user is authenticated

    return NextResponse.json({ message: 'Files retrieved successfully' })
  } catch (error) {
    console.error('Error getting files:', error)
    return NextResponse.json(
      { error: 'Failed to get files' },
      { status: 500 }
    )
  }
}

// Delete file
export async function DELETE(request: NextRequest) {
  try {
    const cookieStore = await cookies()
    const session = cookieStore.get('session')

    if (!session?.value) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { fileId, storagePath, fileSize, userId } = await request.json()

    if (!fileId) {
      return NextResponse.json({ error: 'File ID is required' }, { status: 400 })
    }

    // Get file info from Firestore if fileSize not provided
    let deletionSize = fileSize
    if (!deletionSize && fileId) {
      try {
        const fileDoc = await adminFirestore.collection('files').doc(fileId).get()
        if (fileDoc.exists) {
          deletionSize = fileDoc.data()?.size || 0
        }
      } catch (error) {
        console.warn('Could not get file size for quota tracking:', error)
      }
    }

    // Delete from Firestore
    await adminFirestore.collection('files').doc(fileId).delete()

    // Delete from Storage if path provided
    if (storagePath) {
      try {
        await adminStorage.bucket().file(storagePath).delete()
      } catch (storageError) {
        console.warn('File may not exist in storage:', storageError)
      }
    }

    // Log deletion activity for quota tracking (deletions still count until monthly reset)
    if (deletionSize && userId) {
      await logQuotaActivity(userId, 'delete', deletionSize)
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting file:', error)
    return NextResponse.json(
      { error: 'Failed to delete file' },
      { status: 500 }
    )
  }
}

// Update file (rename)
export async function PATCH(request: NextRequest) {
  try {
    const cookieStore = await cookies()
    const session = cookieStore.get('session')

    if (!session?.value) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { fileId, newName } = await request.json()

    if (!fileId || !newName) {
      return NextResponse.json(
        { error: 'File ID and new name are required' },
        { status: 400 }
      )
    }

    // Update filename in Firestore
    await adminFirestore.collection('files').doc(fileId).update({
      filename: newName,
      updatedAt: new Date()
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error renaming file:', error)
    return NextResponse.json(
      { error: 'Failed to rename file' },
      { status: 500 }
    )
  }
}