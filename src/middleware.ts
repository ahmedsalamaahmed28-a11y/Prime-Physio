import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Add paths that require authentication here
const protectedPaths = [
  '/home',
  '/patients',
  '/billing',
  '/staff',
  '/hr',
  '/analytics',
  '/clinical-nutrition',
  '/clinical-library',
  '/profile',
  '/permissions',
  '/clinic-settings',
  '/doctors',
  '/calendar',
  '/reports',
  '/appointments',
  '/security',
  '/users-permissions'
];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Check if the current path requires authentication
  const isProtected = protectedPaths.some((path) => pathname === path || pathname.startsWith(`${path}/`));

  if (isProtected) {
    // Check for NextAuth or Supabase session cookies
    const cookies = request.cookies.getAll();
    const hasNextAuth = cookies.some(c => c.name === 'next-auth.session-token' || c.name === '__Secure-next-auth.session-token');
    const hasSupabase = cookies.some(c => c.name.startsWith('sb-') && c.name.includes('-auth-token'));

    if (!hasNextAuth && !hasSupabase) {
      // Redirect to login (manage page in this app) if not authenticated
      const loginUrl = new URL('/manage', request.url);
      loginUrl.searchParams.set('callbackUrl', encodeURIComponent(pathname));
      return NextResponse.redirect(loginUrl);
    }
  }

  return NextResponse.next();
}

export const config = {
  // Match all request paths except for the ones starting with:
  // - api (API routes)
  // - _next/static (static files)
  // - _next/image (image optimization files)
  // - favicon.ico (favicon file)
  // - public folder files
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico|logo.png|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
