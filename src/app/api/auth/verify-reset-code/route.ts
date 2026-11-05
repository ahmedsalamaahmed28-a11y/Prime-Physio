import { NextRequest, NextResponse } from "next/server";
import { createHmac } from "crypto";
import { getAdminClient } from "@/lib/supabase";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const email = typeof body?.email === "string" ? body.email.toLowerCase().trim() : "";
    const code = typeof body?.code === "string" ? body.code.trim() : "";
    if (!email || !/^\d{6}$/.test(code)) {
      return NextResponse.json({ error: "يرجى إدخال البريد الإلكتروني ورمز التحقق الصحيح" }, { status: 400 });
    }
    const pepper = process.env.AUTH_OTP_SECRET || process.env.NEXTAUTH_SECRET;
    if (!pepper || pepper.length < 32) return NextResponse.json({ error: "خدمة التحقق غير مهيأة" }, { status: 503 });
    const codeHash = createHmac("sha256", pepper).update(`password_reset:${email}:${code}`).digest("hex");
    const { data: valid, error } = await getAdminClient().rpc("check_auth_verification_code", {
      p_email: email, p_purpose: "password_reset", p_code_hash: codeHash,
    });
    if (error) {
      console.error("[VerifyResetCode] Verification failed:", error.message);
      return NextResponse.json({ error: "تعذر التحقق من الرمز" }, { status: 500 });
    }
    if (valid !== true) return NextResponse.json({ error: "رمز التحقق غير صحيح أو منتهي الصلاحية" }, { status: 400 });
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[VerifyResetCode] Error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
