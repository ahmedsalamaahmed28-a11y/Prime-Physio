import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const AUTH_ROUTES = ["/manage", "/signup", "/setup", "/plans", "/center_setup", "/centers", "/about", "/support"];
const PUBLIC_PATHS = ["/privacy", "/terms", "/_next/", "/api/auth/", "/favicon.ico", "/icon.png", "/logo.png", "/landing-hero.png", "/robots.txt", "/sitemap.xml", "/manifest.json"];

const SUPABASE_PROJECT_REF = "crrhrjhftwostjomzmfj";

const KNOWN_PROTECTED_PAGES = new Set(["home","admin","logout","subscribe","subscription","centers","patients","doctors","calendar","billing","reports","chat","staff","settings","permissions","security","profile","analytics","appointments","packages","clinic-settings","clinical-library","clinical-nutrition","users-permissions"]);

function isPublicPath(pathname: string): boolean {
  if (pathname === "/") return true;
  // Clinic profile pages are public entry points; only allow a single validated slug segment.
  if (/^\/clinic\/[a-z0-9]+(?:-[a-z0-9]+)*$/.test(pathname)) return true;
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

function createNonce(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return btoa(String.fromCharCode(...bytes));
}

function buildCsp(nonce: string): string {
  return [
    "default-src 'self' https: data: blob:",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic' https:`,
    "connect-src 'self' https: wss:",
    "img-src 'self' data: blob: https:",
    // Inline style attributes are blocked; only external stylesheets and nonce-bearing style elements are allowed.
    `style-src 'self' 'nonce-${nonce}' https:`,
    `style-src-elem 'self' 'nonce-${nonce}' https:`,
    "style-src-attr 'none'",
    "font-src 'self' data: https:",
    "object-src 'none'",
    "base-uri 'self'",
    "frame-ancestors 'self'",
    "form-action 'self' https:",
    "upgrade-insecure-requests",
  ].join("; ");
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const nonce = createNonce();
  const cspHeader = buildCsp(nonce);

  // Next.js extracts this request CSP during rendering and adds the nonce
  // to framework/bootstrap scripts generated for this HTML response.
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-nonce", nonce);
  requestHeaders.set("Content-Security-Policy", cspHeader);

  const continueRequest = () => {
    const response = NextResponse.next({
      request: { headers: requestHeaders },
    });
    response.headers.set("Content-Security-Policy", cspHeader);
    return response;
  };

  if (isPublicPath(pathname)) {
    return continueRequest();
  }

  if (!hasAuthCookie(request)) {
    const loginUrl = new URL("/manage", request.url);
    if (pathname !== "/") {
      loginUrl.searchParams.set("redirect", pathname);
    }
    const response = NextResponse.redirect(loginUrl);
    response.headers.set("Content-Security-Policy", cspHeader);
    return response;
  }

  return continueRequest();
}

export const config = {
  matcher: [
    "/((?!api/auth|_next/static|_next/image|favicon.ico|icon.png|logo.png$|landing-hero.png$|manifest.json$).*)",
  ],
};
