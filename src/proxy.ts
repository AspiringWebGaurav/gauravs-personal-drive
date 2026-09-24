import { NextRequest, NextResponse } from 'next/server'
import { logger } from '@/lib/logger'

// Protected routes requiring authentication
const protectedRoutes = ['/dashboard', '/settings', '/admin']

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl
  const sessionToken = request.cookies.get('session')?.value

  const isProtectedRoute = protectedRoutes.some(route =>
    pathname === route || pathname.startsWith(`${route}/`)
  )

  // Redirect unauthenticated requests for protected routes to login
  if (isProtectedRoute && !sessionToken) {
    logger.log('Protected route without session, redirecting to login')
    const loginUrl = new URL('/login', request.url)
    loginUrl.searchParams.set('redirect', pathname)
    return NextResponse.redirect(loginUrl)
  }

  // Redirect authenticated users on login page to dashboard
  if (pathname === '/login' && sessionToken) {
    logger.log('Authenticated user on login page, redirecting to dashboard')
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  return NextResponse.next()
}

// Strictly narrow matcher to routes requiring interception
// Excludes public landing page '/', all static files, media, and API routes
export const config = {
  matcher: [
    '/dashboard',
    '/dashboard/:path*',
    '/settings',
    '/settings/:path*',
    '/admin',
    '/admin/:path*',
    '/login'
  ],
}

export default proxy
