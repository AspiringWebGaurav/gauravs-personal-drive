import { NextRequest, NextResponse } from 'next/server'
import { logger } from '@/lib/logger'

// Routes that require authentication
const protectedRoutes = ['/dashboard']

// Routes that redirect authenticated users (like login page)
const authRoutes = ['/login', '/']

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Get the session token from cookies
  const sessionToken = request.cookies.get('session')?.value
  logger.log(`Middleware: ${pathname}, Session: ${sessionToken ? 'Yes' : 'No'}`)


  // Check if the current path is a protected route
  const isProtectedRoute = protectedRoutes.some(route =>
    pathname.startsWith(route)
  )

  // Check if the current path is an auth route
  const isAuthRoute = authRoutes.includes(pathname)

  // If trying to access a protected route without authentication
  if (isProtectedRoute && !sessionToken) {
    logger.log('Protected route without session, redirecting to login')
    const loginUrl = new URL('/login', request.url)
    // Add redirect parameter to go back after login
    loginUrl.searchParams.set('redirect', pathname)
    return NextResponse.redirect(loginUrl)
  }

  // If authenticated user tries to access login page, redirect to dashboard
  if (isAuthRoute && sessionToken && pathname === '/login') {
    logger.log('Authenticated user on login page, redirecting to dashboard')
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  // If authenticated user is on homepage, redirect to dashboard
  if (pathname === '/' && sessionToken) {
    logger.log('Authenticated user on homepage, redirecting to dashboard')
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  // If unauthenticated user is on homepage, redirect to login
  if (pathname === '/' && !sessionToken) {
    logger.log('Unauthenticated user on homepage, redirecting to login')
    return NextResponse.redirect(new URL('/login', request.url))
  }

  logger.log('Allowing request to continue')
  // Allow the request to continue
  return NextResponse.next()
}

// Configure which routes should be processed by this middleware
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder files
     */
    '/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}

export default proxy