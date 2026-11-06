import { NextRequest, NextResponse } from "next/server";
import { getAdminClient } from "@/lib/supabase-admin";
import bcrypt from "bcryptjs";
import { checkVerificationCode, consumeVerificationCode, normalizeAuthEmail } from "@/lib/verificationCodes";
import { validateNewPassword } from "@/lib/passwordSecurity";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null);
    const email = normalizeAuthEmail(body?.email);
    const code = typeof body?.code === "string" ? body.code.trim() : "";
    const newPassword = typeof body?.newPassword === "string" ? body.newPassword : "";

    if (!email || !/^\d{6}$/.test(code) || !newPassword) {
      return NextResponse.json({ error: "جميع الحقول مطلوبة بشكل صحيح" }, { status: 400 });
    }
    if (newPassword.length < 12 || newPassword.length > 128) {
      return NextResponse.json({ error: "كلمة المرور يجب أن تكون 12 حرفًا على الأقل وبحد أقصى 128 حرفًا" }, { status: 400 });
    }

    const admin = getAdminClient();
    const { data: existing, error: accountError } = await admin
      .from("auth_accounts")
      .select("id")
      .eq("email", email)
      .maybeSingle();

    if (accountError) throw accountError;

    if (!existing) {
      const { data: staffUser, error: staffError } = await admin
        .from("staff")
        .select("id, status")
        .eq("email", email)
        .maybeSingle();
      if (staffError) throw staffError;
      if (!staffUser || staffUser.status === "محذوف" || staffUser.status === "deleted") {
        return NextResponse.json({ error: "رمز التحقق غير صحيح أو منتهي الصلاحية" }, { status: 400 });
      }
    }

    const codeValid = await checkVerificationCode(admin, email, "password_reset", code);
    if (!codeValid) {
      return NextResponse.json({ error: "رمز التحقق غير صحيح أو منتهي الصلاحية" }, { status: 400 });
    }

    try {
      await validateNewPassword(newPassword);
    } catch (error) {
      const reason = error instanceof Error ? error.message : "";
      if (reason === "PASSWORD_TOO_WEAK") return NextResponse.json({ error: "كلمة المرور يجب أن تكون 12 حرفًا على الأقل وتحتوي على حرف كبير وصغير ورقم ورمز." }, { status: 400 });
      if (reason === "PASSWORD_COMPROMISED") return NextResponse.json({ error: "كلمة المرور ظهرت في تسريبات سابقة. اختر كلمة مرور مختلفة." }, { status: 400 });
      return NextResponse.json({ error: "تعذر فحص أمان كلمة المرور حاليًا. حاول مرة أخرى." }, { status: 503 });
    }

    // Atomic one-time consumption prevents concurrent reuse of the same OTP.
    const consumed = await consumeVerificationCode(admin, email, "password_reset", code);
    if (!consumed) {
      return NextResponse.json({ error: "رمز التحقق غير صحيح أو منتهي الصلاحية أو تم استخدامه" }, { status: 400 });
    }

    const passwordHash = await bcrypt.hash(newPassword, 12);
    if (existing) {
      const { error } = await admin
        .from("auth_accounts")
        .update({ password_hash: passwordHash, verified: true, updated_at: new Date().toISOString() })
        .eq("id", existing.id);
      if (error) throw error;
    } else {
      const { data: staffUser, error: staffError } = await admin
        .from("staff")
        .select("name, role, status")
        .eq("email", email)
        .maybeSingle();
      if (staffError || !staffUser || staffUser.status === "محذوف" || staffUser.status === "deleted") throw staffError || new Error("Staff account not found");

      const { error } = await admin.from("auth_accounts").insert({
        email,
        password_hash: passwordHash,
        verified: true,
        name: staffUser.name || email.split("@")[0],
        provider: "email",
        role: staffUser.role || "doctor",
      });
      if (error) throw error;
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[ResetPassword] Error:", error);
    return NextResponse.json({ error: "فشل تحديث كلمة المرور. إذا استمر الخطأ، اطلب رمزًا جديدًا." }, { status: 500 });
  }
}
