import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const AUTH_ROUTES = ["/manage", "/signup", "/setup", "/plans", "/center_setup", "/centers", "/about", "/support"];
const PUBLIC_PATHS = ["/_next/", "/api/auth/", "/favicon.ico", "/icon.png", "/logo.png", "/robots.txt", "/sitemap.xml", "/manifest.json"];

const SUPABASE_PROJECT_REF = "crrhrjhftwostjomzmfj";

const KNOWN_PROTECTED_PAGES = new Set(["home","admin","logout","subscribe","subscription","centers","patients","doctors","calendar","billing","reports","chat","staff","settings","permissions","security","profile","analytics","appointments","packages","clinic-settings","clinical-library","clinical-nutrition","users-permissions"]);

function isPublicPath(pathname: string): boolean {
  if (AUTH_ROUTES.some((r) => pathname === r || pathname.startsWith(r + "/"))) return true;
  if (PUBLIC_PATHS.some((p) => pathname.startsWith(p))) return true;
  if (pathname.startsWith("/api/") && !pathname.startsWith("/api/admin/")) return true;
  
  // Allow branded login pages (/[slug])
  const pathPart = pathname.replace("/", "");
  if (/^[a-z0-9-]+$/.test(pathPart) && !KNOWN_PROTECTED_PAGES.has(pathPart)) {
    return true;
  }
  
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

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (isPublicPath(pathname)) {
    return NextResponse.next();
  }

  if (!hasAuthCookie(request)) {
    const loginUrl = new URL("/manage", request.url);
    if (pathname !== "/") {
      loginUrl.searchParams.set("redirect", pathname);
    }
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!api/auth|_next/static|_next/image|favicon.ico|icon.png|logo.png$|manifest.json$).*)",
  ],
};
