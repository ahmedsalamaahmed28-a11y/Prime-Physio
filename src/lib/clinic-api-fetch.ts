let activeClinicAccessToken: string | null = null;
let installed = false;
let originalFetch: typeof window.fetch | null = null;

export function setClinicApiAccessToken(token: string | null) {
  activeClinicAccessToken = token;
}

/**
 * These routes intentionally support a verified NextAuth session before a
 * clinic is selected, or are separately protected platform-admin endpoints.
 * Every other private same-origin API request requires this tab's clinic token.
 */
function allowsSharedSessionBootstrap(pathname: string): boolean {
  if (pathname.startsWith("/api/admin/")) return true;

  return new Set([
    "/api/auth/enrich",
    "/api/overview",
    "/api/has-clinic",
    "/api/centers/create",
    "/api/centers/upload-logo",
    "/api/center-management/centers",
    "/api/center-management/export",
  ]).has(pathname);
}

/**
 * Attach the active tab's verified clinic access token to same-origin private
 * API requests. Public endpoints and the authentication exchange itself remain
 * cookie/public-key only. External origins are never modified.
 */
export function installClinicApiFetch(): () => void {
  if (typeof window === "undefined" || installed) return () => {};
  installed = true;
  originalFetch = window.fetch.bind(window);
  const nativeFetch = originalFetch;

  window.fetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    let requestUrl: URL;
    try {
      const rawUrl = input instanceof Request ? input.url : String(input);
      requestUrl = new URL(rawUrl, window.location.origin);
    } catch {
      return nativeFetch(input, init);
    }

    const pathname = requestUrl.pathname;
    if (
      requestUrl.origin !== window.location.origin ||
      !pathname.startsWith("/api/") ||
      pathname.startsWith("/api/public/") ||
      pathname === "/api/public-chat" ||
      pathname === "/api/signup" ||
      pathname === "/api/slug-check" ||
      pathname === "/api/n8n" ||
      pathname.startsWith("/api/n8n/") ||
      pathname.startsWith("/api/centers/send-otp") ||
      pathname === "/api/sw" ||
      pathname === "/api/test" ||
      pathname === "/api/branches/all" ||
      pathname === "/api/branches/by-slug" ||
      (pathname.startsWith("/api/auth/") && pathname !== "/api/auth/enrich") ||
      pathname.startsWith("/api/admin/")
    ) {
      return nativeFetch(input, init);
    }

    const accessToken = activeClinicAccessToken;
    if (!accessToken) {
      if (allowsSharedSessionBootstrap(pathname)) return nativeFetch(input, init);
      return new Response(
        JSON.stringify({ error: "A verified clinic session is required for this request." }),
        {
          status: 401,
          headers: {
            "Content-Type": "application/json; charset=utf-8",
            "Cache-Control": "no-store, private",
          },
        },
      );
    }

    const headers = new Headers(
      init?.headers || (input instanceof Request ? input.headers : undefined),
    );
    // Never allow a caller-supplied Authorization header to replace this tab's
    // verified clinic identity.
    headers.set("Authorization", `Bearer ${accessToken}`);
    return nativeFetch(input, { ...init, headers });
  };

  return () => {
    if (originalFetch) window.fetch = originalFetch;
    originalFetch = null;
    installed = false;
    activeClinicAccessToken = null;
  };
}
