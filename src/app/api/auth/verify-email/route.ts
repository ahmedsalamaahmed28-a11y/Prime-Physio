import { NextRequest, NextResponse } from "next/server";
import { getAdminClient } from "@/lib/supabase";
import { Pool } from "pg";
import bcrypt from "bcryptjs";

async function ensureVerifiedColumn() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
  const ref = supabaseUrl.replace("https://", "").replace(".supabase.co", "");
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
  if (!ref || !serviceKey) return;

  const pool = new Pool({
    host: `db.${ref}.supabase.co`,
    port: 6543,
    database: "postgres",
    user: "postgres",
    password: serviceKey,
    ssl: { rejectUnauthorized: false },
    max: 1,
    connectionTimeoutMillis: 10000,
  });

  const client = await pool.connect();
  try {
    await client.query("alter table public.auth_accounts add column if not exists verified boolean not null default false");
  } finally {
    client.release();
    await pool.end();
  }
}

export async function POST(req: NextRequest) {
  try {
    const { email, code, clinicName, phone, password, role, name, provider } = await req.json();

    if (!email || !code || !clinicName || phone === undefined || !password || !role) {
      return NextResponse.json({ error: "جميع الحقول مطلوبة" }, { status: 400 });
    }

    const admin = getAdminClient();
    const cleanEmail = email.toLowerCase().trim();

    // Verify the code from app_key_values
    const key = `verification_${cleanEmail.replace(/[^a-z0-9]/g, "_")}`;
    const { data: kv } = await admin
      .from("app_key_values")
      .select("value")
      .eq("key", key)
      .maybeSingle();

    if (!kv) {
      return NextResponse.json({ error: "لم يتم طلب رمز تحقق" }, { status: 400 });
    }

    const stored = kv.value as { code: string; expires_at: number; used: boolean };

    if (stored.used) {
      return NextResponse.json({ error: "رمز التحقق مستخدم بالفعل" }, { status: 400 });
    }

    if (stored.code !== code) {
      return NextResponse.json({ error: "رمز التحقق غير صحيح" }, { status: 400 });
    }

    if (Date.now() > stored.expires_at) {
      return NextResponse.json({ error: "انتهت صلاحية رمز التحقق" }, { status: 400 });
    }

    // Mark code as used
    await admin.from("app_key_values").upsert({
      key,
      value: { ...stored, used: true },
    });

    // Check race condition
    const { data: existing } = await admin
      .from("auth_accounts")
      .select("id")
      .eq("email", cleanEmail)
      .maybeSingle();

    if (existing) {
      return NextResponse.json({ error: "البريد الإلكتروني مسجل بالفعل" }, { status: 400 });
    }

    // Create auth_accounts entry
    const passwordHash = await bcrypt.hash(password, 10);

    const insertPayload = {
      email: cleanEmail,
      password_hash: passwordHash,
      verified: true,
      name: name || cleanEmail.split("@")[0],
      provider: provider || "email",
      role: role || "admin",
    };

    let recordId: string | null = null;

    const { data: authRecord, error: authError } = await admin
      .from("auth_accounts")
      .insert(insertPayload)
      .select("id")
      .single();

    if (authError?.message?.includes("verified")) {
      // Column doesn't exist yet — auto-migrate and retry
      await ensureVerifiedColumn();
      const { data: retryRecord, error: retryError } = await admin
        .from("auth_accounts")
        .insert(insertPayload)
        .select("id")
        .single();

      if (retryError || !retryRecord) {
        console.error("[VerifyEmail] Retry failed:", retryError);
        return NextResponse.json({ error: "فشل إنشاء الحساب", details: retryError?.message }, { status: 500 });
      }
      recordId = retryRecord.id;
    } else if (authError || !authRecord) {
      return NextResponse.json({ error: "فشل إنشاء الحساب", details: authError?.message }, { status: 500 });
    } else {
      recordId = authRecord.id;
    }

    return NextResponse.json({ success: true, id: recordId });
  } catch (err) {
    console.error("[VerifyEmail] Error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
