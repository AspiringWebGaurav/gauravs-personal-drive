import { NextRequest, NextResponse } from 'next/server'
import { adminFirestore, adminStorage, verifyIdToken } from '@/lib/firebaseAdmin'
import { cookies } from 'next/headers'

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

    // Additional server-side validation could go here
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

    const { fileId, storagePath } = await request.json()

    if (!fileId) {
      return NextResponse.json({ error: 'File ID is required' }, { status: 400 })
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