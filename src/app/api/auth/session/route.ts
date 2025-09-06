import { NextRequest, NextResponse } from 'next/server'
import { adminAuth } from '@/lib/firebaseAdmin'
import { cookies } from 'next/headers'
import { logger } from '@/lib/logger'

// Set session cookie
export async function POST(request: NextRequest) {
  logger.log('Session API: POST request received')
  const startTime = Date.now()
  
  try {
    const requestBody = await request.json()
    logger.log('Session API: Request body parsed in', Date.now() - startTime, 'ms')
    const { token } = requestBody

    if (!token) {
      logger.error('Session API: No token provided')
      return NextResponse.json(
        { error: 'Token is required', code: 'NO_TOKEN' },
        { status: 400 }
      )
    }

    console.log('🔍 Session API: Verifying ID token...')
    const verifyStartTime = Date.now()
    // Verify the ID token
    const decodedToken = await adminAuth.verifyIdToken(token)
    console.log('✅ Session API: Token verified for user:', decodedToken.uid, 'in', Date.now() - verifyStartTime, 'ms')

    // Create session cookie
    const expiresIn = 60 * 60 * 24 * 5 * 1000 // 5 days
    console.log('🍪 Session API: Creating session cookie...')
    const cookieStartTime = Date.now()
    const sessionCookie = await adminAuth.createSessionCookie(token, {
      expiresIn,
    })
    logger.log('Session API: Session cookie created in', Date.now() - cookieStartTime, 'ms')

    const cookieStore = await cookies()

    // Set the session cookie
    cookieStore.set('session', sessionCookie, {
      maxAge: expiresIn,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
    })

    logger.log('Session API: Session cookie set successfully')
    logger.log('Session API: Total request time:', Date.now() - startTime, 'ms')
    return NextResponse.json(
      { success: true, uid: decodedToken.uid },
      { status: 200 }
    )
  } catch (error: any) {
    logger.error('Session API: Error creating session:', error)
    logger.error('Session API: Error occurred after', Date.now() - startTime, 'ms')
    logger.error('Session API: Error stack:', error.stack)
    
    // Provide more specific error responses
    if (error.code === 'auth/id-token-expired') {
      return NextResponse.json(
        { error: 'Token expired', code: 'TOKEN_EXPIRED' },
        { status: 401 }
      )
    }
    
    if (error.code === 'auth/id-token-revoked') {
      return NextResponse.json(
        { error: 'Token revoked', code: 'TOKEN_REVOKED' },
        { status: 401 }
      )
    }
    
    if (error.code === 'auth/invalid-id-token') {
      return NextResponse.json(
        { error: 'Invalid token', code: 'INVALID_TOKEN' },
        { status: 401 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to create session', code: 'SESSION_ERROR', details: error.message },
      { status: 500 }
    )
  }
}

// Clear session cookie
export async function DELETE() {
  try {
    logger.log('Session API: Clearing session cookie...')
    const cookieStore = await cookies()
    
    // Clear the session cookie
    cookieStore.set('session', '', {
      maxAge: 0,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
    })

    logger.log('Session API: Session cookie cleared successfully')
    return NextResponse.json(
      { success: true },
      { status: 200 }
    )
  } catch (error) {
    logger.error('Session API: Error clearing session:', error)
    return NextResponse.json(
      { error: 'Failed to clear session', code: 'CLEAR_ERROR' },
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
    logger.error('Error verifying session:', error)
    return NextResponse.json(
      { authenticated: false },
      { status: 401 }
    )
  }
}