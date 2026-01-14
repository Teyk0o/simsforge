import { NextRequest, NextResponse } from 'next/server';

/**
 * Middleware to protect routes that require authentication
 */
export function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const token = request.cookies.get('auth_token')?.value;

  // Auth routes - accessible without token, redirect to home if authenticated
  const authRoutes = ['/auth/login', '/auth/register'];
  if (authRoutes.some(route => pathname.startsWith(route))) {
    if (token) {
      return NextResponse.redirect(new URL('/', request.url));
    }
    return NextResponse.next();
  }

  // Protected routes - require authentication
  const protectedRoutes = ['/', '/settings', '/mods'];
  const isProtectedRoute = protectedRoutes.some(route => {
    if (route === '/') {
      return pathname === '/' || pathname.startsWith('/mods');
    }
    return pathname.startsWith(route);
  });

  if (isProtectedRoute) {
    if (!token) {
      const loginUrl = new URL('/auth/login', request.url);
      loginUrl.searchParams.set('callbackUrl', pathname);
      return NextResponse.redirect(loginUrl);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    // Protect these routes
    '/',
    '/mods/:path*',
    '/settings/:path*',
    '/auth/:path*',
    // Don't protect these
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
};
