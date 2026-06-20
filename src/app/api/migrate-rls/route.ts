import { NextResponse } from "next/server";
import { readFileSync } from "fs";
import { join } from "path";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const secret = searchParams.get("secret");
  const expected = process.env.MIGRATION_SECRET || "migrate-rls-2026";

  if (secret !== expected) {
    return NextResponse.json({ error: "Invalid secret" }, { status: 401 });
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

  const sqlPath = join(process.cwd(), "supabase-full-setup.sql");
  const sql = readFileSync(sqlPath, "utf-8");

  // Split SQL into individual statements
  const statements = sql
    .split(";")
    .map((s) => s.trim())
    .filter((s) => s.length > 0);

  let successCount = 0;
  let errorCount = 0;
  const errors: { index: number; message: string }[] = [];

  for (let i = 0; i < statements.length; i++) {
    try {
      const res = await fetch(`${supabaseUrl}/sql/v1/sql`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey: serviceKey,
          Authorization: `Bearer ${serviceKey}`,
        },
        body: JSON.stringify({ query: statements[i] + ";" }),
      });

      if (!res.ok) {
        const text = await res.text();
        errors.push({ index: i, message: text.slice(0, 200) });
        errorCount++;
      } else {
        successCount++;
      }
    } catch (err: any) {
      errors.push({ index: i, message: err.message });
      errorCount++;
    }
  }

  return NextResponse.json({
    success: errorCount === 0,
    total: statements.length,
    successCount,
    errorCount,
    errors: errors.slice(0, 10),
  });
}
