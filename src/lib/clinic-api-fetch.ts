import { supabase } from "@/lib/supabase";

let installed = false;
let originalFetch: typeof window.fetch | null = null;

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
      requestUrl.pathname === "/api/auth/clinic-session" ||
      requestUrl.pathname === "/api/auth/supabase-session" ||
      requestUrl.pathname.startsWith("/api/auth/[...nextauth]")
    ) {
      return nativeFetch(input, init);
    }

    try {
      const { data } = await supabase.auth.getSession();
      const accessToken = data.session?.access_token;
      const appMetadata = data.session?.user?.app_metadata;
      if (!accessToken || appMetadata?.auth_source !== "clinic-scoped-shadow") {
        return nativeFetch(input, init);
      }

      const headers = new Headers(
        init?.headers || (input instanceof Request ? input.headers : undefined),
      );
      headers.set("Authorization", `Bearer ${accessToken}`);
      return nativeFetch(input, { ...init, headers });
    } catch (error) {
      // Do not turn an auth-storage failure into an unauthenticated API request.
      console.error("[Clinic API] Unable to read the tab-scoped session", error);
      throw error;
    }
  };

  return () => {
    if (originalFetch) window.fetch = originalFetch;
    originalFetch = null;
    installed = false;
  };
}
