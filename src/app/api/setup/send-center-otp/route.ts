import { NextRequest, NextResponse } from "next/server";
import { getAdminClient } from "@/lib/supabase-admin";
import { sendVerificationCode } from "@/lib/email";
import {
  allowOtpSendFromIp,
  clearVerificationCode,
  issueVerificationCode,
} from "@/lib/verificationCodes";
import { requireRole } from "../../utils/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function POST(req: NextRequest) {
  try {
    // Only an authenticated, active clinic admin can request this OTP.
    // The destination email always comes from the verified server-side session.
    const session = await requireRole(req, ["admin"]);
    const email = session.email.toLowerCase().trim();
    const admin = getAdminClient();
    const clientIp =
      req.headers.get("x-real-ip") ||
      req.headers.get("x-forwarded-for")?.split(",").pop()?.trim() ||
      "unknown";

    if (!(await allowOtpSendFromIp(admin, clientIp, "center_creation"))) {
      return NextResponse.json(
        { error: "تجاوزت عدد محاولات إرسال الرمز. حاول مرة أخرى بعد 15 دقيقة." },
        { status: 429, headers: { "Cache-Control": "no-store, private" } }
      );
    }

    let code: string;
    try {
      code = await issueVerificationCode(admin, email, "center_creation");
    } catch (error) {
      if (error instanceof Error && error.message === "OTP_RATE_LIMIT") {
        return NextResponse.json(
          { error: "يمكنك طلب رمز جديد بعد مرور دقيقة واحدة." },
          { status: 429, headers: { "Cache-Control": "no-store, private" } }
        );
      }
      throw error;
    }

    const sent = await sendVerificationCode(email, code, "center_creation");
    if (!sent) {
      try {
        await clearVerificationCode(admin, email, "center_creation");
      } catch (cleanupError) {
        console.error("[Center OTP] Failed to clear unsent code:", cleanupError);
      }
      return NextResponse.json(
        { error: "تعذر إرسال البريد الإلكتروني الآن. تحقق من إعدادات البريد وحاول مرة أخرى." },
        { status: 503, headers: { "Cache-Control": "no-store, private" } }
      );
    }

    return NextResponse.json(
      { success: true, message: "تم إرسال رمز التحقق إلى بريد حسابك." },
      { headers: { "Cache-Control": "no-store, private" } }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (/unauthorized|غير مصرح|صلاحية غير كافية|not found/i.test(message)) {
      return NextResponse.json(
        { error: "يجب تسجيل الدخول بحساب مدير نشط لإرسال رمز إنشاء المركز." },
        { status: 403, headers: { "Cache-Control": "no-store, private" } }
      );
    }
    console.error("[Center OTP] Send failed:", error);
    return NextResponse.json(
      { error: "تعذر إرسال رمز التحقق حاليًا." },
      { status: 500, headers: { "Cache-Control": "no-store, private" } }
    );
  }
}
