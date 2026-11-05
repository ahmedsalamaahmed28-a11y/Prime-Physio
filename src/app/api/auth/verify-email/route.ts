import { NextRequest, NextResponse } from "next/server";
import { createHmac } from "crypto";
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

    const pepper = process.env.AUTH_OTP_SECRET || process.env.NEXTAUTH_SECRET;
    if (!pepper || pepper.length < 32) {
      return NextResponse.json({ error: "خدمة التحقق غير مهيأة" }, { status: 503 });
    }
    if (!/^\\d{6}$/.test(String(code))) {
      return NextResponse.json({ error: "رمز التحقق غير صحيح" }, { status: 400 });
    }
    const codeHash = createHmac("sha256", pepper).update(`signup:${cleanEmail}:${code}`).digest("hex");
    const { data: consumed, error: consumeError } = await admin.rpc("consume_auth_verification_code", {
      p_email: cleanEmail, p_purpose: "signup", p_code_hash: codeHash,
    });
    if (consumeError) {
      console.error("[VerifyEmail] Secure code consumption failed:", consumeError.message);
      return NextResponse.json({ error: "تعذر التحقق من الرمز" }, { status: 500 });
    }
    if (consumed !== true) {
      return NextResponse.json({ error: "رمز التحقق غير صحيح أو منتهي الصلاحية أو مستخدم" }, { status: 400 });
    }

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
    const passwordHash = await bcrypt.hash(password, 12);

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
