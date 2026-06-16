import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const AUTH_ROUTES = ["/login", "/signup"];
const PUBLIC_PATHS = ["/_next/", "/api/auth/", "/favicon.ico", "/icon.png", "/robots.txt", "/sitemap.xml"];

const SUPABASE_PROJECT_REF = "pnqwkdqldfmcqozqrdeo";

function isPublicPath(pathname: string): boolean {
  if (AUTH_ROUTES.some((r) => pathname === r)) return true;
  if (PUBLIC_PATHS.some((p) => pathname.startsWith(p))) return true;
  if (pathname.startsWith("/api/") && !pathname.startsWith("/api/admin/")) return true;
  return false;
}

function hasAuthCookie(request: NextRequest): boolean {
  const nextAuthCookie = request.cookies.get("__Secure-next-auth.session-token")
    || request.cookies.get("next-auth.session-token");
  if (nextAuthCookie?.value) return true;

  const supabaseCookie = request.cookies.get(`sb-${SUPABASE_PROJECT_REF}-auth-token`);
  if (supabaseCookie?.value) return true;

  return false;
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (isPublicPath(pathname)) {
    return NextResponse.next();
  }

  if (!hasAuthCookie(request)) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!api/auth|_next/static|_next/image|favicon.ico|icon.png).*)",
  ],
};
