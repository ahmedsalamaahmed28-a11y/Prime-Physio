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

    // Do not report a successful send when the IP limiter cannot run.
    if (!process.env.NEXTAUTH_SECRET || process.env.NEXTAUTH_SECRET.length < 32) {
      console.error("[SendVerification] NEXTAUTH_SECRET is missing or too short.");
      return NextResponse.json(
        { error: "خدمة إرسال رموز التحقق غير متاحة حاليًا. يرجى المحاولة لاحقًا." },
        { status: 503, headers: { "Cache-Control": "no-store, private" } }
      );
    }

    const admin = getAdminClient();
    const clientIp = req.headers.get("x-real-ip") || req.headers.get("x-forwarded-for")?.split(",").pop()?.trim() || "unknown";
    if (!(await allowOtpSendFromIp(admin, clientIp, "signup"))) {
      return NextResponse.json(
        { error: "تم تجاوز عدد محاولات إرسال رمز التحقق. انتظر قليلًا ثم حاول مرة أخرى." },
        { status: 429, headers: { "Cache-Control": "no-store, private" } }
      );
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

    // Do not advance the signup flow when no message was sent.
    // Keep the response generic so it does not reveal whether the email is registered.
    if (existing) {
      return NextResponse.json(
        { success: false, sent: false, error: "تعذر إرسال رمز التفعيل لهذا البريد. إذا كان لديك حساب بالفعل، انتقل إلى تسجيل الدخول." },
        { status: 409, headers: { "Cache-Control": "no-store, private" } }
      );
    }

    const code = await issueVerificationCode(admin, cleanEmail, "signup");
    const sent = await sendVerificationCode(cleanEmail, code);
    if (!sent) {
      try {
        await clearVerificationCode(admin, cleanEmail, "signup");
      } catch (cleanupError) {
        console.error("[SendVerification] Failed to clear unsent code:", cleanupError);
      }
      return NextResponse.json(
        { error: "تعذر إرسال رمز التفعيل إلى بريدك حاليًا. لم يتم إرسال الرسالة؛ يرجى المحاولة لاحقًا." },
        { status: 502, headers: { "Cache-Control": "no-store, private" } }
      );
    }

    return NextResponse.json(
      { success: true, sent: true, message: "قبل خادم البريد إرسال رسالة التفعيل. تحقق من الوارد والرسائل غير المرغوب فيها." },
      { headers: { "Cache-Control": "no-store, private" } }
    );
  } catch (error) {
    if (error instanceof Error && error.message === "OTP_RATE_LIMIT") {
      return NextResponse.json(
        { error: "تم تجاوز عدد محاولات إرسال رمز التحقق لهذا البريد. انتظر قليلًا ثم أعد المحاولة." },
        { status: 429, headers: { "Cache-Control": "no-store, private" } }
      );
    }
    console.error("[SendVerification] Error:", error);
    return NextResponse.json({ error: "تعذر معالجة الطلب حاليًا" }, { status: 500 });
  }
}
