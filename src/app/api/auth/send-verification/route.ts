import { NextRequest, NextResponse } from "next/server";
import { getAdminClient } from "@/lib/supabase-admin";
import { sendVerificationCode } from "@/lib/email";
import { allowOtpSendFromIp, clearVerificationCode, issueVerificationCode, normalizeAuthEmail } from "@/lib/verificationCodes";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null);
    const cleanEmail = normalizeAuthEmail(body?.email);
    if (!cleanEmail) {
      return NextResponse.json({ error: "البريد الإلكتروني غير صحيح" }, { status: 400 });
    }

    const admin = getAdminClient();
    const clientIp = req.headers.get("x-real-ip") || req.headers.get("x-forwarded-for")?.split(",").pop()?.trim() || "unknown";
    if (!(await allowOtpSendFromIp(admin, clientIp, "signup"))) {
      return NextResponse.json({ success: true, message: "إذا كان البريد مؤهلًا للتسجيل فسيصلك رمز التحقق." }, { headers: { "Cache-Control": "no-store, private" } });
    }
    const { data: existing, error: lookupError } = await admin
      .from("auth_accounts")
      .select("id")
      .eq("email", cleanEmail)
      .maybeSingle();

    if (lookupError) {
      console.error("[SendVerification] Account lookup failed:", lookupError);
      return NextResponse.json({ error: "تعذر معالجة الطلب حاليًا" }, { status: 503 });
    }

    // Avoid revealing whether an email is already registered.
    if (existing) {
      return NextResponse.json({ success: true, message: "إذا كان البريد مؤهلًا للتسجيل فسيصلك رمز التحقق." }, { headers: { "Cache-Control": "no-store, private" } });
    }

    const code = await issueVerificationCode(admin, cleanEmail, "signup");
    const sent = await sendVerificationCode(cleanEmail, code);
    if (!sent) {
      try {
        await clearVerificationCode(admin, cleanEmail, "signup");
      } catch (cleanupError) {
        console.error("[SendVerification] Failed to clear unsent code:", cleanupError);
      }
      return NextResponse.json({ success: true, message: "إذا كان البريد مؤهلًا للتسجيل فسيصلك رمز التحقق." });
    }

    return NextResponse.json({ success: true, message: "إذا كان البريد مؤهلًا للتسجيل فسيصلك رمز التحقق." }, { headers: { "Cache-Control": "no-store, private" } });
  } catch (error) {
    if (error instanceof Error && error.message === "OTP_RATE_LIMIT") {
      return NextResponse.json({ success: true, message: "إذا كان البريد مؤهلًا للتسجيل فسيصلك رمز التحقق." });
    }
    console.error("[SendVerification] Error:", error);
    return NextResponse.json({ error: "تعذر معالجة الطلب حاليًا" }, { status: 500 });
  }
}
