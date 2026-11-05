import { NextRequest, NextResponse } from "next/server";
import { getAdminClient } from "@/lib/supabase-admin";
import { checkVerificationCode, normalizeAuthEmail } from "@/lib/verificationCodes";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null);
    const email = normalizeAuthEmail(body?.email);
    const code = typeof body?.code === "string" ? body.code.trim() : "";

    if (!email || !/^\d{6}$/.test(code)) {
      return NextResponse.json({ error: "يرجى إدخال البريد الإلكتروني ورمز التحقق المكوّن من 6 أرقام" }, { status: 400 });
    }

    const valid = await checkVerificationCode(getAdminClient(), email, "password_reset", code);
    if (!valid) {
      return NextResponse.json({ error: "رمز التحقق غير صحيح أو منتهي الصلاحية" }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[VerifyResetCode] Error:", error);
    return NextResponse.json({ error: "تعذر التحقق من الرمز حاليًا" }, { status: 500 });
  }
}
