import { NextRequest, NextResponse } from "next/server";
import { getAdminClient } from "@/lib/supabase-admin";
import { sendVerificationCode } from "@/lib/email";
import { allowOtpSendFromIp, clearVerificationCode, issueVerificationCode, normalizeAuthEmail } from "@/lib/verificationCodes";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

const genericResponse = {
  success: true,
  message: "إذا كان البريد مرتبطًا بحساب، فستصلك رسالة تتضمن تعليمات إعادة تعيين كلمة المرور.",
};

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null);
    const cleanEmail = normalizeAuthEmail(body?.email);
    if (!cleanEmail) {
      return NextResponse.json({ error: "يرجى إدخال بريد إلكتروني صحيح" }, { status: 400 });
    }

    const admin = getAdminClient();
    const clientIp = req.headers.get("x-real-ip") || req.headers.get("x-forwarded-for")?.split(",").pop()?.trim() || "unknown";
    if (!(await allowOtpSendFromIp(admin, clientIp, "password_reset"))) {
      return NextResponse.json(genericResponse, { headers: { "Cache-Control": "no-store, private" } });
    }
    const { data: existingAuth, error: authError } = await admin
      .from("auth_accounts")
      .select("id, verified")
      .eq("email", cleanEmail)
      .maybeSingle();

    if (authError) {
      console.error("[ForgotPassword] Account lookup failed:", authError);
      return NextResponse.json(genericResponse, { headers: { "Cache-Control": "no-store, private" } });
    }

    const { data: staffUser, error: staffError } = await admin
      .from("staff")
      .select("id")
      .eq("email", cleanEmail)
      .maybeSingle();

    if (staffError) {
      console.error("[ForgotPassword] Staff lookup failed:", staffError);
      return NextResponse.json(genericResponse);
    }

    const eligible = (existingAuth?.verified === true) || (!existingAuth && !!staffUser);
    if (!eligible) return NextResponse.json(genericResponse);

    try {
      const code = await issueVerificationCode(admin, cleanEmail, "password_reset");
      const sent = await sendVerificationCode(cleanEmail, code);
      if (!sent) await clearVerificationCode(admin, cleanEmail, "password_reset");
    } catch (error) {
      if (!(error instanceof Error && error.message === "OTP_RATE_LIMIT")) {
        console.error("[ForgotPassword] Could not issue/send code:", error);
      }
      // Keep the response generic to prevent account enumeration.
    }

    return NextResponse.json(genericResponse);
  } catch (error) {
    console.error("[ForgotPassword] Error:", error);
    return NextResponse.json(genericResponse);
  }
}
