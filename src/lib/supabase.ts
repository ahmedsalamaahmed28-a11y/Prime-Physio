import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || "";

// sessionStorage is isolated per browser tab. The same key can therefore be
// reused without allowing one tab's Supabase identity to overwrite another's.
const tabScopedAuthStorage =
  typeof window !== "undefined" ? window.sessionStorage : undefined;

// Client-side Supabase client — uses the public key and relies on RLS.
// Auth tokens are persisted per tab, not in origin-wide localStorage.
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: tabScopedAuthStorage,
    storageKey: "prime-physio:clinic-auth-session",
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: false,
  },
});

// Server-side admin client — uses the service role, bypasses RLS.
// Only use in API routes, never expose to the browser.
export const getAdminClient = () => {
  if (typeof window !== "undefined") {
    throw new Error("The Supabase service-role client is server-only");
  }
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceKey) {
    throw new Error("Supabase server credentials are not configured");
  }
  return createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
};
