import { NextRequest, NextResponse } from "next/server";
import { getAdminClient } from "@/lib/supabase-admin";
import { requireAuthOnly } from "../../utils/auth";
import { hashVerificationCode } from "@/lib/verificationCodes";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function POST(req: NextRequest) {
  try {
    const session = await requireAuthOnly(req);
    const email = session.email.toLowerCase().trim();
    const body = await req.json().catch(() => null);

    const planId = typeof body?.planId === "string" ? body.planId.trim().toLowerCase() : "";
    const shortName = typeof body?.shortName === "string" ? body.shortName.trim().slice(0, 120) : "";
    const fullName = typeof body?.fullName === "string" ? body.fullName.trim().slice(0, 200) : "";
    const slug = typeof body?.slug === "string" ? body.slug.trim().toLowerCase() : "";
    const code = typeof body?.code === "string" ? body.code.trim() : "";
    const logoUrl = typeof body?.logoUrl === "string" ? body.logoUrl.trim().slice(0, 1000) : null;

    if (!["basic", "silver", "gold"].includes(planId)) {
      return NextResponse.json({ error: "يرجى اختيار باقة صالحة أولاً." }, { status: 400 });
    }
    if (!shortName || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) || slug.length > 50) {
      return NextResponse.json({ error: "يرجى إدخال اسم المركز ورابط صالح من أحرف إنجليزية وأرقام وشرطات." }, { status: 400 });
    }
    if (!/^\d{6}$/.test(code)) {
      return NextResponse.json({ error: "أدخل رمز التحقق المكوّن من 6 أرقام." }, { status: 400 });
    }

    const admin = getAdminClient();
    const codeHash = hashVerificationCode(email, "center_creation", code);
    const { data, error } = await admin.rpc("create_independent_center_verified", {
      p_email: email,
      p_plan_id: planId,
      p_short_name: shortName,
      p_full_name: fullName,
      p_slug: slug,
      p_code_hash: codeHash,
      p_logo_url: logoUrl,
      p_specializations: [],
    });

    if (error) {
      console.error("[IndependentCenter] Provisioning RPC failed:", error);
      return NextResponse.json({ error: "تعذر إنشاء المركز حاليًا. حاول مرة أخرى." }, { status: 500 });
    }
    if (!data || data.error) {
      const status = data?.error === "OTP_INVALID" ? 400 : data?.code === "SLUG_TAKEN" ? 409 : 400;
      return NextResponse.json({
        error: data?.error === "OTP_INVALID"
          ? "رمز التحقق غير صحيح أو منتهي الصلاحية أو تم استخدامه."
          : data?.error || "تعذر إنشاء المركز.",
      }, { status });
    }

    return NextResponse.json(data, { headers: { "Cache-Control": "no-store, private" } });
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (/unauthorized/i.test(message)) {
      return NextResponse.json({ error: "يجب تسجيل الدخول أولاً." }, { status: 401 });
    }
    console.error("[IndependentCenter] Unhandled error:", error);
    return NextResponse.json({ error: "حدث خطأ داخلي أثناء إنشاء المركز." }, { status: 500 });
  }
}
