import { NextRequest, NextResponse } from "next/server";
import { hashVerificationCode } from "@/lib/verificationCodes";
import { getAdminClient } from "@/lib/supabase-admin";
import { requireAuthOnly } from "../../utils/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function POST(req: NextRequest) {
  try {
    const session = await requireAuthOnly(req);
    const email = session.email.toLowerCase().trim();
    const body = await req.json().catch(() => null);

    const otpCode = typeof body?.otpCode === "string" ? body.otpCode.trim() : "";
    const planId = typeof body?.planId === "string" ? body.planId.trim().toLowerCase() : "";
    const shortName = typeof body?.shortName === "string" ? body.shortName.trim().slice(0, 120) : "";
    const fullName = typeof body?.fullName === "string" ? body.fullName.trim().slice(0, 200) : "";
    const slug = typeof body?.slug === "string" ? body.slug.trim().toLowerCase() : "";
    const logoUrl = typeof body?.logoUrl === "string" ? body.logoUrl.trim().slice(0, 1000) : null;
    const logoPath = typeof body?.logoPath === "string" ? body.logoPath.trim().slice(0, 500) : "";

    if (!["basic", "silver", "gold"].includes(planId)) {
      return NextResponse.json({ error: "يرجى اختيار باقة صالحة أولاً." }, { status: 400 });
    }
    if (!/^\d{6}$/.test(otpCode)) {
      return NextResponse.json({ error: "يرجى إدخال رمز التحقق المكوّن من 6 أرقام.", code: "OTP_INVALID" }, { status: 400, headers: { "Cache-Control": "no-store, private" } });
    }
    if (!shortName || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) || slug.length > 50) {
      return NextResponse.json({ error: "يرجى إدخال اسم المركز ورابط صالح من أحرف إنجليزية وأرقام وشرطات." }, { status: 400 });
    }

    const admin = getAdminClient();
    if (logoPath) {
      const ownerFolder = createHash("sha256").update(email).digest("hex");
      if (!logoPath.startsWith(`onboarding/${ownerFolder}/`) || !logoUrl) {
        return NextResponse.json({ error: "صورة المركز غير صالحة. أعد اختيار الصورة." }, { status: 400 });
      }
      const expectedLogoUrl = admin.storage.from("branch-logos").getPublicUrl(logoPath).data.publicUrl;
      if (logoUrl !== expectedLogoUrl) {
        return NextResponse.json({ error: "رابط صورة المركز غير صالح." }, { status: 400 });
      }
    } else if (logoUrl) {
      return NextResponse.json({ error: "تعذر التحقق من مصدر صورة المركز." }, { status: 400 });
    }
    const cleanupLogo = async () => {
      if (!logoPath) return;
      const { error: cleanupError } = await admin.storage.from("branch-logos").remove([logoPath]);
      if (cleanupError) console.error("[IndependentCenter] Failed to clean up unlinked logo:", cleanupError);
    };
    const phone = typeof body?.phone === "string" ? body.phone.trim().slice(0, 32) : "";
    const address = typeof body?.address === "string" ? body.address.trim().slice(0, 250) : "";
    if (!phone || !address) return NextResponse.json({ error: "يرجى إدخال رقم هاتف المركز وعنوانه." }, { status: 400 });

    const codeHash = hashVerificationCode(email, "center_creation", otpCode);
    const { data, error } = await admin.rpc("create_independent_center_verified", {
      p_email: email, p_plan_id: planId, p_short_name: shortName, p_full_name: fullName,
      p_slug: slug, p_code_hash: codeHash, p_logo_url: logoUrl, p_specializations: [],
    });

    if (error) {
      await cleanupLogo();
      console.error("[IndependentCenter] Provisioning RPC failed:", error);
      return NextResponse.json({ error: "تعذر إنشاء المركز حاليًا. حاول مرة أخرى." }, { status: 500 });
    }
    if (!data || data.error) {
      await cleanupLogo();
      const status = data?.error === "OTP_INVALID" ? 400 : data?.code === "SLUG_TAKEN" ? 409 : 400;
      return NextResponse.json({
        error: data?.error === "OTP_INVALID" ? "رمز التحقق غير صحيح أو منتهي الصلاحية أو تم استخدامه." : data?.error || "تعذر إنشاء المركز.",
        code: data?.error === "OTP_INVALID" ? "OTP_INVALID" : data?.code,
      }, { status, headers: { "Cache-Control": "no-store, private" } });
    }

    const { error: detailsError } = await admin.from("clinics").update({ phone, address }).eq("id", data.clinicId).eq("admin_email", email);
    if (detailsError) {
      console.error("[IndependentCenter] Contact details update failed:", detailsError);
      return NextResponse.json({ error: "تم إنشاء المركز لكن تعذر حفظ الهاتف والعنوان. تواصل مع الدعم قبل إعادة المحاولة.", clinicCreated: true, clinicId: data.clinicId }, { status: 500 });
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
