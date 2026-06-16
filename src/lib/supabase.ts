import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
// Use the secret service role key to bypass RLS policies during testing
const supabaseSecretKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

if (!supabaseUrl || !supabaseSecretKey) {
  console.warn("Supabase credentials missing. Check your .env.local file.");
}

export const supabase = createClient(supabaseUrl, supabaseSecretKey);
