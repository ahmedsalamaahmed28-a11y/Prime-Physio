import { NextRequest, NextResponse } from "next/server";
import { getAdminClient } from "@/lib/supabase";
import bcrypt from "bcryptjs";

export async function POST(req: NextRequest) {
  try {
    const { email, code, newPassword } = await req.json();

    if (!email || !code || !newPassword) {
      return NextResponse.json({ error: "جميع الحقول مطلوبة" }, { status: 400 });
    }

    if (newPassword.length < 6) {
      return NextResponse.json({ error: "كلمة المرور يجب أن تكون 6 أحرف على الأقل" }, { status: 400 });
    }

    const admin = getAdminClient();
    const cleanEmail = email.toLowerCase().trim();

    // Verify the code from app_key_values
    const key = `password_reset_${cleanEmail.replace(/[^a-z0-9]/g, "_")}`;
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

    // Update or create the password in auth_accounts
    const passwordHash = await bcrypt.hash(newPassword, 10);

    const { data: existing } = await admin
      .from("auth_accounts")
      .select("id")
      .eq("email", cleanEmail)
      .maybeSingle();

    let updateError;
    if (existing) {
      const result = await admin
        .from("auth_accounts")
        .update({ password_hash: passwordHash })
        .eq("email", cleanEmail);
      updateError = result.error;
    } else {
      // Google user creating a password for the first time
      const result = await admin
        .from("auth_accounts")
        .insert({
          email: cleanEmail,
          password_hash: passwordHash,
          created_at: new Date().toISOString(),
        });
      updateError = result.error;
    }

    if (updateError) {
      return NextResponse.json({ error: "فشل تحديث كلمة المرور" }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[ResetPassword] Error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
