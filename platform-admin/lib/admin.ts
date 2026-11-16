import { createClient, SupabaseClient, User } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const anon = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const secret = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY!;

export function adminDb(): SupabaseClient {
  if (!url || !secret) throw new Error("Server database credentials are not configured");
  return createClient(url, secret, { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } });
}

export async function requirePlatformAdmin(req: NextRequest): Promise<{ user: User; db: SupabaseClient } | NextResponse> {
  const token = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!token || !url || !anon) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const authClient = createClient(url, anon, { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } });
  const { data, error } = await authClient.auth.getUser(token);
  if (error || !data.user?.email || !data.user.email_confirmed_at) return NextResponse.json({ error: "A verified login is required" }, { status: 401 });
  const db = adminDb();
  const { data: admin, error: adminError } = await db.from("platform_admins").select("email").ilike("email", data.user.email).maybeSingle();
  if (adminError || !admin) return NextResponse.json({ error: "This account is not authorized for platform administration" }, { status: 403 });
  return { user: data.user, db };
}

export function isDenied(value: unknown): value is NextResponse {
  return value instanceof NextResponse;
}