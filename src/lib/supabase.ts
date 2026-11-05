import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || "";

// Client-side supabase client — uses anon key, respects RLS
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Server-side admin client — uses service role key, bypasses RLS
// Only use in API routes, never expose to the browser
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
