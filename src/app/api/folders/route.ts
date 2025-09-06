import { NextRequest, NextResponse } from 'next/server'
import { adminFirestore } from '@/lib/firebaseAdmin'
import { cookies } from 'next/headers'

// Get user folders
export async function GET(request: NextRequest) {
  try {
    const cookieStore = await cookies()
    const session = cookieStore.get('session')

    if (!session?.value) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const parentId = searchParams.get('parentId')
    
    // In a real implementation, you'd verify the session and get the user ID
    // For now, we'll assume the user is authenticated
    
    return NextResponse.json({ message: 'Folders retrieved successfully' })
  } catch (error) {
    console.error('Error getting folders:', error)
    return NextResponse.json(
      { error: 'Failed to get folders' },
      { status: 500 }
    )
  }
}

// Create folder
export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies()
    const session = cookieStore.get('session')

    if (!session?.value) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { name, parentId, userId } = await request.json()

    if (!name || !userId) {
      return NextResponse.json(
        { error: 'Folder name and user ID are required' },
        { status: 400 }
      )
    }

    // Create folder in Firestore
    const folderRef = await adminFirestore.collection('folders').add({
      userId,
      name,
      parentId: parentId || null,
      createdAt: new Date(),
      updatedAt: new Date()
    })

    return NextResponse.json({ 
      success: true, 
      folderId: folderRef.id 
    })
  } catch (error) {
    console.error('Error creating folder:', error)
    return NextResponse.json(
      { error: 'Failed to create folder' },
      { status: 500 }
    )
  }
}

// Delete folder
export async function DELETE(request: NextRequest) {
  try {
    const cookieStore = await cookies()
    const session = cookieStore.get('session')

    if (!session?.value) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { folderId } = await request.json()

    if (!folderId) {
      return NextResponse.json({ error: 'Folder ID is required' }, { status: 400 })
    }

    // Delete folder from Firestore
    await adminFirestore.collection('folders').doc(folderId).delete()

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting folder:', error)
    return NextResponse.json(
      { error: 'Failed to delete folder' },
      { status: 500 }
    )
  }
}

// Update folder (rename)
export async function PATCH(request: NextRequest) {
  try {
    const cookieStore = await cookies()
    const session = cookieStore.get('session')

    if (!session?.value) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { folderId, newName } = await request.json()

    if (!folderId || !newName) {
      return NextResponse.json(
        { error: 'Folder ID and new name are required' },
        { status: 400 }
      )
    }

    // Update folder name in Firestore
    await adminFirestore.collection('folders').doc(folderId).update({
      name: newName,
      updatedAt: new Date()
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error renaming folder:', error)
    return NextResponse.json(
      { error: 'Failed to rename folder' },
      { status: 500 }
    )
  }
}