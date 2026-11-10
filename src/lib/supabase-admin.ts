import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let adminClient: SupabaseClient | null = null;

export function getAdminClient(): SupabaseClient {
  if (typeof window !== "undefined") {
    throw new Error("The Supabase service-role client is server-only");
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  // Prefer Supabase's current server-only secret key; fall back to the legacy service-role JWT.
  // Prefer the explicitly provisioned legacy service-role JWT when both keys exist.
  // It carries the service_role database role required by privileged onboarding RPCs.
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY;
  if (!url || !serviceKey) {
    throw new Error("Supabase server credentials are not configured");
  }

  if (!adminClient) {
    adminClient = createClient(url, serviceKey, {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    });
  }
  return adminClient;
}
