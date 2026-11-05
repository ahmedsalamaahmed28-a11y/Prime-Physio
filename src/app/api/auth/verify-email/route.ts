import { NextRequest, NextResponse } from "next/server";
import { getAdminClient } from "@/lib/supabase";
import bcrypt from "bcryptjs";

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
      name: typeof name === "string" && name.trim() ? name.trim().slice(0, 120) : cleanEmail.split("@")[0],
      provider: provider === "google" ? "google" : "email",
      // Public sign-up must never be able to assign privileged platform roles.
      role: "admin",
    };

    let recordId: string | null = null;

    const { data: authRecord, error: authError } = await admin
      .from("auth_accounts")
      .insert(insertPayload)
      .select("id")
      .single();

    if (authError || !authRecord) {
      console.error("[VerifyEmail] Account creation failed:", authError?.message);
      return NextResponse.json({ error: "فشل إنشاء الحساب" }, { status: 500 });
    }
    recordId = authRecord.id;

    // Also create staff record (clinic_id = null — onboarding will link it)
    const { error: staffError } = await admin.from("staff").upsert({
      email: cleanEmail,
      name: insertPayload.name,
      role: "admin",
      status: "نشط",
      clinic_id: null,
    }, { onConflict: "email" });

    if (staffError) {
      console.error("[VerifyEmail] Staff insert error:", staffError.message);
      // Rollback auth_account to prevent orphaned records
      await admin.from("auth_accounts").delete().eq("id", recordId);
      return NextResponse.json({ error: "فشل إنشاء الحساب", details: staffError.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, id: recordId });
  } catch (err) {
    console.error("[VerifyEmail] Error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
