import { NextRequest, NextResponse } from 'next/server'
import { adminFirestore, adminStorage } from '@/lib/firebaseAdmin'
import { cookies } from 'next/headers'

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