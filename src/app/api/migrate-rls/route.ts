import { NextResponse } from "next/server";
import { readFileSync } from "fs";
import { join } from "path";
import { Pool } from "pg";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const secret = searchParams.get("secret");
  const expected = process.env.MIGRATION_SECRET || "migrate-rls-2026";

  if (secret !== expected) {
    return NextResponse.json({ error: "Invalid secret" }, { status: 401 });
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
  const ref = supabaseUrl.replace("https://", "").replace(".supabase.co", "");
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

  const pool = new Pool({
    host: `aws-0-us-east-1.pooler.supabase.com`,
    port: 6543,
    database: "postgres",
    user: `postgres.${ref}`,
    password: serviceKey,
    ssl: { rejectUnauthorized: false },
    max: 1,
    connectionTimeoutMillis: 15000,
  });

  const sqlPath = join(process.cwd(), "supabase-full-setup.sql");
  const sql = readFileSync(sqlPath, "utf-8");

  const client = await pool.connect();
  try {
    await client.query(sql);
    return NextResponse.json({ success: true, message: "RLS patch applied successfully" });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  } finally {
    client.release();
    await pool.end();
  }
}
