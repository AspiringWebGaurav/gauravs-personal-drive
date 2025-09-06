import { NextRequest, NextResponse } from 'next/server'
import { adminAuth } from '@/lib/firebaseAdmin'
import { cookies } from 'next/headers'

// Set session cookie
export async function POST(request: NextRequest) {
  try {
    const { token } = await request.json()

    if (!token) {
      return NextResponse.json(
        { error: 'Token is required' },
        { status: 400 }
      )
    }

    // Verify the ID token
    const decodedToken = await adminAuth.verifyIdToken(token)

    // Create session cookie
    const expiresIn = 60 * 60 * 24 * 5 * 1000 // 5 days
    const sessionCookie = await adminAuth.createSessionCookie(token, {
      expiresIn,
    })

    const cookieStore = await cookies()

    // Set the session cookie
    cookieStore.set('session', sessionCookie, {
      maxAge: expiresIn,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
    })

    return NextResponse.json(
      { success: true, uid: decodedToken.uid },
      { status: 200 }
    )
  } catch (error) {
    console.error('Error creating session:', error)
    return NextResponse.json(
      { error: 'Failed to create session' },
      { status: 500 }
    )
  }
}

// Clear session cookie
export async function DELETE() {
  try {
    const cookieStore = await cookies()
    
    // Clear the session cookie
    cookieStore.set('session', '', {
      maxAge: 0,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
    })

    return NextResponse.json(
      { success: true },
      { status: 200 }
    )
  } catch (error) {
    console.error('Error clearing session:', error)
    return NextResponse.json(
      { error: 'Failed to clear session' },
      { status: 500 }
    )
  }
}

// Verify session
export async function GET() {
  try {
    const cookieStore = await cookies()
    const session = cookieStore.get('session')

    if (!session?.value) {
      return NextResponse.json(
        { authenticated: false },
        { status: 401 }
      )
    }

    // Verify the session cookie
    const decodedClaims = await adminAuth.verifySessionCookie(
      session.value,
      true // checkRevoked
    )

    return NextResponse.json(
      { 
        authenticated: true, 
        uid: decodedClaims.uid,
        email: decodedClaims.email 
      },
      { status: 200 }
    )
  } catch (error) {
    console.error('Error verifying session:', error)
    return NextResponse.json(
      { authenticated: false },
      { status: 401 }
    )
  }
}