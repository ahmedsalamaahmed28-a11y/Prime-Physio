import { NextRequest, NextResponse } from "next/server";
import { getAdminClient } from "@/lib/supabase-admin";
import { requireRole } from "../../utils/auth";
import { hashVerificationCode, allowOtpSendFromIp } from "@/lib/verificationCodes";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function POST(req: NextRequest) {
  try {
    // Identity and role are resolved server-side. Never use the email or role sent by the browser.
    const session = await requireRole(req, ["admin"]);
    const body = await req.json().catch(() => null);

    const code = typeof body?.code === "string" ? body.code.trim() : "";
    const name = typeof body?.name === "string" ? body.name.trim().slice(0, 160) : "";
    const centers = Array.isArray(body?.centers) ? body.centers : null;

    if (!/^\d{6}$/.test(code) || !name || !centers || centers.length < 1 || centers.length > 5) {
      return NextResponse.json(
        { error: "يرجى إدخال اسم العيادة ومركز واحد إلى خمسة مراكز صحيحة" },
        { status: 400, headers: { "Cache-Control": "no-store, private" } }
      );
    }

    const admin = getAdminClient();
    const clientIp = req.headers.get("x-real-ip") || req.headers.get("x-forwarded-for")?.split(",").pop()?.trim() || "unknown";
    if (!(await allowOtpSendFromIp(admin, clientIp, "center_creation"))) {
      return NextResponse.json({ error: "تجاوزت عدد محاولات التحقق. حاول مرة أخرى بعد 15 دقيقة." }, { status: 429, headers: { "Cache-Control": "no-store, private" } });
    }
    const email = session.email.toLowerCase().trim();
    const codeHash = hashVerificationCode(email, "center_creation", code);
    const { data, error } = await admin.rpc("setup_clinic_transaction_verified", {
      p_email: email,
      p_name: name,
      p_centers: centers,
      p_code_hash: codeHash,
    });

    if (error) {
      console.error("[Setup Submit] Secure onboarding RPC failed:", error);
      return NextResponse.json(
        { error: "تعذر إكمال إعداد العيادة حاليًا" },
        { status: 500, headers: { "Cache-Control": "no-store, private" } }
      );
    }

    if (!data || data.error) {
      const invalidOtp = data?.error === "OTP_INVALID";
      return NextResponse.json(
        { error: invalidOtp ? "رمز التحقق غير صحيح أو منتهي الصلاحية أو تم استخدامه." : (data?.error || "فشل إعداد العيادة") },
        { status: 400, headers: { "Cache-Control": "no-store, private" } }
      );
    }

    return NextResponse.json(data, {
      headers: { "Cache-Control": "no-store, private" },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (/unauthorized|غير مصرح|صلاحية غير كافية|not found/i.test(message)) {
      return NextResponse.json(
        { error: "غير مصرح لك بإنشاء أو تعديل المراكز" },
        { status: 403, headers: { "Cache-Control": "no-store, private" } }
      );
    }

    console.error("[Setup Submit] Unhandled error:", error);
    return NextResponse.json(
      { error: "حدث خطأ داخلي أثناء إعداد العيادة" },
      { status: 500, headers: { "Cache-Control": "no-store, private" } }
    );
  }
}
