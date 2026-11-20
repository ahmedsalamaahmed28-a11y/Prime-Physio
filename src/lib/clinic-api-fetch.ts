let activeClinicAccessToken: string | null = null;
let installed = false;
let originalFetch: typeof window.fetch | null = null;

export function setClinicApiAccessToken(token: string | null) {
  activeClinicAccessToken = token;
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

    if (
      requestUrl.origin !== window.location.origin ||
      !requestUrl.pathname.startsWith("/api/") ||
      requestUrl.pathname.startsWith("/api/public/") ||
      (requestUrl.pathname.startsWith("/api/auth/") && requestUrl.pathname !== "/api/auth/enrich")
    ) {
      return nativeFetch(input, init);
    }

    const accessToken = activeClinicAccessToken;
    if (!accessToken) return nativeFetch(input, init);

    const headers = new Headers(
      init?.headers || (input instanceof Request ? input.headers : undefined),
    );
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
