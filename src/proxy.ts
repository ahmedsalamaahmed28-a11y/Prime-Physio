import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const publicRoutes = ["/login", "/signup", "/api/auth", "/api/paymob"];

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const isPublic = publicRoutes.some((route) => pathname.startsWith(route));
  if (isPublic) {
    return NextResponse.next();
  }

  if (pathname.startsWith("/_next/") || pathname.startsWith("/static/")) {
    return NextResponse.next();
  }

  if (/\.(svg|png|jpg|jpeg|gif|webp|ico|json|js)$/.test(pathname)) {
    return NextResponse.next();
  }

  const cookies = request.cookies;
  const hasSession =
    cookies.has("next-auth.session-token") ||
    cookies.has("__Secure-next-auth.session-token") ||
    cookies.has("sb-access-token") ||
    cookies.has("sb-refresh-token") ||
    Array.from(cookies.getAll()).some((c) => c.name.startsWith("sb-") && c.name.endsWith("-auth-token"));

  if (!hasSession) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|manifest.json|sw.js).*)",
  ],
};
