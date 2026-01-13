import { NextRequest, NextResponse } from 'next/server';

/**
 * Middleware to protect routes that require authentication
 */
export function middleware(request: NextRequest) {
  // Routes that require authentication
  const protectedRoutes = ['/dashboard', '/settings'];
  const authRoutes = ['/auth/login', '/auth/register'];

  const pathname = request.nextUrl.pathname;
  const token = request.cookies.get('auth_token')?.value;

  // Redirect to login if accessing protected route without token
  if (protectedRoutes.some(route => pathname.startsWith(route))) {
    if (!token) {
      const loginUrl = new URL('/auth/login', request.url);
      loginUrl.searchParams.set('callbackUrl', pathname);
      return NextResponse.redirect(loginUrl);
    }
  }

  // Redirect to dashboard if accessing auth routes while authenticated
  if (authRoutes.some(route => pathname.startsWith(route))) {
    if (token) {
      return NextResponse.redirect(new URL('/dashboard', request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    // Protect these routes
    '/dashboard/:path*',
    '/settings/:path*',
    // Don't protect these
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
};
