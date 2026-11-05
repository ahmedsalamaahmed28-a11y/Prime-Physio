import { NextRequest, NextResponse } from "next/server";
import { createHmac } from "crypto";
import { getAdminClient } from "@/lib/supabase";
import bcrypt from "bcryptjs";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const email = typeof body?.email === "string" ? body.email.toLowerCase().trim() : "";
    const code = typeof body?.code === "string" ? body.code.trim() : "";
    const newPassword = typeof body?.newPassword === "string" ? body.newPassword : "";
    if (!email || !/^\d{6}$/.test(code) || !newPassword) {
      return NextResponse.json({ error: "جميع الحقول مطلوبة" }, { status: 400 });
    }
    if (newPassword.length < 10 || newPassword.length > 128) {
      return NextResponse.json({ error: "كلمة المرور يجب أن تكون بين 10 و128 حرفًا" }, { status: 400 });
    }
    const pepper = process.env.AUTH_OTP_SECRET || process.env.NEXTAUTH_SECRET;
    if (!pepper || pepper.length < 32) return NextResponse.json({ error: "خدمة التحقق غير مهيأة" }, { status: 503 });

    const codeHash = createHmac("sha256", pepper).update(`password_reset:${email}:${code}`).digest("hex");
    const admin = getAdminClient();
    const { data: consumed, error: consumeError } = await admin.rpc("consume_auth_verification_code", {
      p_email: email, p_purpose: "password_reset", p_code_hash: codeHash,
    });
    if (consumeError) {
      console.error("[ResetPassword] Secure code consumption failed:", consumeError.message);
      return NextResponse.json({ error: "تعذر التحقق من الرمز" }, { status: 500 });
    }
    if (consumed !== true) return NextResponse.json({ error: "رمز التحقق غير صحيح أو منتهي الصلاحية أو مستخدم" }, { status: 400 });

    const passwordHash = await bcrypt.hash(newPassword, 12);
    const { data: existing, error: lookupError } = await admin.from("auth_accounts").select("id").eq("email", email).maybeSingle();
    if (lookupError) return NextResponse.json({ error: "تعذر تحديث كلمة المرور" }, { status: 500 });

    if (existing) {
      const { error } = await admin.from("auth_accounts").update({ password_hash: passwordHash }).eq("email", email);
      if (error) return NextResponse.json({ error: "فشل تحديث كلمة المرور" }, { status: 500 });
    } else {
      const { data: staff, error: staffError } = await admin.from("staff").select("id").eq("email", email).maybeSingle();
      if (staffError || !staff) return NextResponse.json({ error: "الحساب غير موجود" }, { status: 404 });
      const { error } = await admin.from("auth_accounts").insert({ email, password_hash: passwordHash, verified: true, provider: "email" });
      if (error) return NextResponse.json({ error: "فشل إنشاء بيانات كلمة المرور" }, { status: 500 });
    }
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[ResetPassword] Error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
