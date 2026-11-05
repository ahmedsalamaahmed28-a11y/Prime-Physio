import { NextRequest, NextResponse } from "next/server";
import { createHmac } from "crypto";
import { getAdminClient } from "@/lib/supabase";
import bcrypt from "bcryptjs";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const email = typeof body?.email === "string" ? body.email.toLowerCase().trim() : "";
    const code = typeof body?.code === "string" ? body.code.trim() : "";
    const clinicName = typeof body?.clinicName === "string" ? body.clinicName.trim() : "";
    const phone = typeof body?.phone === "string" ? body.phone.trim() : "";
    const password = typeof body?.password === "string" ? body.password : "";
    const name = typeof body?.name === "string" ? body.name.trim() : "";

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) {
      return NextResponse.json({ error: "البريد الإلكتروني غير صحيح" }, { status: 400 });
    }
    if (!/^\d{6}$/.test(code) || !clinicName || clinicName.length > 160 || !phone || phone.length > 32) {
      return NextResponse.json({ error: "يرجى مراجعة بيانات التسجيل ورمز التحقق" }, { status: 400 });
    }
    if (password.length < 10 || password.length > 128) {
      return NextResponse.json({ error: "كلمة المرور يجب أن تكون بين 10 و128 حرفًا" }, { status: 400 });
    }

    const pepper = process.env.AUTH_OTP_SECRET || process.env.NEXTAUTH_SECRET;
    if (!pepper || pepper.length < 32) {
      return NextResponse.json({ error: "خدمة التحقق غير مهيأة" }, { status: 503 });
    }

    const admin = getAdminClient();
    const { data: existing, error: existingError } = await admin.from("auth_accounts")
      .select("id").eq("email", email).maybeSingle();
    if (existingError) return NextResponse.json({ error: "تعذر التحقق من الحساب" }, { status: 500 });
    if (existing) return NextResponse.json({ error: "البريد الإلكتروني مسجل بالفعل" }, { status: 409 });

    const codeHash = createHmac("sha256", pepper).update(`signup:${email}:${code}`).digest("hex");
    const { data: consumed, error: consumeError } = await admin.rpc("consume_auth_verification_code", {
      p_email: email,
      p_purpose: "signup",
      p_code_hash: codeHash,
    });
    if (consumeError) {
      console.error("[VerifyEmail] Secure code consumption failed:", consumeError.message);
      return NextResponse.json({ error: "تعذر التحقق من الرمز" }, { status: 500 });
    }
    if (consumed !== true) {
      return NextResponse.json({ error: "رمز التحقق غير صحيح أو منتهي الصلاحية أو مستخدم" }, { status: 400 });
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const { data: authRecord, error: authError } = await admin.from("auth_accounts").insert({
      email,
      password_hash: passwordHash,
      verified: true,
      name: name || clinicName,
      provider: "email",
      // Public registration can only create a clinic administrator, never a platform administrator.
      role: "admin",
    }).select("id").single();

    if (authError || !authRecord) {
      console.error("[VerifyEmail] Account creation failed:", authError?.message);
      return NextResponse.json({ error: "فشل إنشاء الحساب" }, { status: 500 });
    }

    const { error: staffError } = await admin.from("staff").insert({
      email,
      name: name || clinicName,
      role: "admin",
      status: "نشط",
      clinic_id: null,
      phone,
    });
    if (staffError) {
      await admin.from("auth_accounts").delete().eq("id", authRecord.id);
      console.error("[VerifyEmail] Staff creation failed:", staffError.message);
      return NextResponse.json({ error: "فشل إنشاء بيانات الموظف" }, { status: 500 });
    }

    return NextResponse.json({ success: true, id: authRecord.id });
  } catch (err) {
    console.error("[VerifyEmail] Error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
