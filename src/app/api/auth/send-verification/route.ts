import { NextRequest, NextResponse } from "next/server";
import { getAdminClient } from "@/lib/supabase-admin";
import { sendVerificationCode } from "@/lib/email";
import { clearVerificationCode, issueVerificationCode, normalizeAuthEmail } from "@/lib/verificationCodes";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null);
    const cleanEmail = normalizeAuthEmail(body?.email);
    if (!cleanEmail) {
      return NextResponse.json({ error: "البريد الإلكتروني غير صحيح" }, { status: 400 });
    }

    const admin = getAdminClient();
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
      return NextResponse.json({ success: true, message: "إذا كان البريد مؤهلًا للتسجيل فسيصلك رمز التحقق." });
    }

    const code = await issueVerificationCode(admin, cleanEmail, "signup");
    const sent = await sendVerificationCode(cleanEmail, code);
    if (!sent) {
      await clearVerificationCode(admin, cleanEmail, "signup");
      return NextResponse.json({ error: "تعذر إرسال رسالة التحقق. حاول لاحقًا." }, { status: 503 });
    }

    return NextResponse.json({ success: true, sent: true });
  } catch (error) {
    if (error instanceof Error && error.message === "OTP_RATE_LIMIT") {
      return NextResponse.json({ error: "يرجى الانتظار دقيقة قبل طلب رمز جديد." }, { status: 429 });
    }
    console.error("[SendVerification] Error:", error);
    return NextResponse.json({ error: "تعذر معالجة الطلب حاليًا" }, { status: 500 });
  }
}
