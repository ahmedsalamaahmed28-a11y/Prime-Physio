import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { getAdminClient } from "@/lib/supabase-admin";
import { requireAuthOnly } from "../../utils/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const PRICES: Record<string, { monthly: number; yearly: number }> = {
  essential: { monthly: 750, yearly: 7500 },
  medium: { monthly: 1500, yearly: 15000 },
  advanced: { monthly: 3000, yearly: 30000 },
  maximum: { monthly: 7500, yearly: 75000 }
};
const MIME_EXT: Record<string, string> = {
  "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "application/pdf": "pdf"
};

export async function POST(req: NextRequest) {
  let uploadedPath = "";
  try {
    const user = await requireAuthOnly(req);
    const form = await req.formData();
    const clinicId = String(form.get("clinicId") || "").trim();
    const planCode = String(form.get("planCode") || "").trim().toLowerCase();
    const billingPeriod = String(form.get("billingPeriod") || "").trim().toLowerCase();
    const paymentMethod = String(form.get("paymentMethod") || "").trim().toLowerCase();
    const transferReference = String(form.get("transferReference") || "").trim();
    const receipt = form.get("receipt");

    if (!clinicId || !PRICES[planCode] || !["monthly", "yearly"].includes(billingPeriod) ||
        !["instapay", "vodafone_cash"].includes(paymentMethod) ||
        transferReference.length < 4 || transferReference.length > 120 ||
        !(receipt instanceof File)) {
      return NextResponse.json({ error: "أكمل بيانات التحويل وأرفق صورة الإيصال أو ملف PDF." }, { status: 400 });
    }
    const ext = MIME_EXT[receipt.type];
    if (!ext || receipt.size <= 0 || receipt.size > 10 * 1024 * 1024) {
      return NextResponse.json({ error: "الإيصال يجب أن يكون JPG أو PNG أو WEBP أو PDF وبحد أقصى 10 ميجابايت." }, { status: 400 });
    }

    const admin = getAdminClient();
    const email = user.email.trim().toLowerCase();
    const [{ data: clinic }, { data: owner }, { data: settings }] = await Promise.all([
      admin.from("clinics").select("id,status,is_active,admin_email").eq("id", clinicId).maybeSingle(),
      admin.from("clinic_owners").select("clinic_id").eq("clinic_id", clinicId).eq("owner_email", email).maybeSingle(),
      admin.from("platform_settings").select("subscription_payments_enabled").eq("id", 1).maybeSingle()
    ]);
    if (!clinic || clinic.is_active !== true || clinic.status !== "active" ||
        clinic.admin_email?.toLowerCase().trim() !== email || !owner) {
      return NextResponse.json({ error: "يجب تسجيل الدخول بحساب مالك المركز لإرسال طلب الدفع." }, { status: 403 });
    }
    if (settings?.subscription_payments_enabled !== true) {
      return NextResponse.json({ error: "استقبال طلبات الدفع متوقف مؤقتًا. يرجى المحاولة لاحقًا." }, { status: 503 });
    }

    const { data: pending } = await admin.from("subscription_payment_requests")
      .select("id").eq("clinic_id", clinicId).eq("status", "pending").limit(1).maybeSingle();
    if (pending) return NextResponse.json({ error: "لديك طلب دفع قيد المراجعة بالفعل لهذا المركز." }, { status: 409 });

    const amount = PRICES[planCode][billingPeriod as "monthly" | "yearly"];
    uploadedPath = `${clinicId}/${new Date().toISOString().slice(0, 10)}/${randomUUID()}.${ext}`;
    const bytes = Buffer.from(await receipt.arrayBuffer());
    const { error: uploadError } = await admin.storage.from("subscription-receipts").upload(uploadedPath, bytes, {
      contentType: receipt.type, upsert: false
    });
    if (uploadError) throw uploadError;

    const { data: request, error: insertError } = await admin.from("subscription_payment_requests").insert({
      clinic_id: clinicId, user_email: email, plan_code: planCode, billing_period: billingPeriod,
      amount, payment_method: paymentMethod, transfer_reference: transferReference,
      receipt_path: uploadedPath, status: "pending"
    }).select("id").single();
    if (insertError || !request) {
      await admin.storage.from("subscription-receipts").remove([uploadedPath]);
      uploadedPath = "";
      throw insertError || new Error("Unable to save payment request");
    }
    return NextResponse.json({ success: true, requestId: request.id, message: "تم استلام طلب الدفع وسيتم تفعيل الباقة بعد مراجعة التحويل." }, { status: 201 });
  } catch (error) {
    if (uploadedPath) {
      try { await getAdminClient().storage.from("subscription-receipts").remove([uploadedPath]); } catch {}
    }
    const message = error instanceof Error ? error.message : "";
    const status = /unauthorized/i.test(message) ? 401 : 500;
    console.error("[subscription-payments] submission failed", error);
    return NextResponse.json({ error: status === 401 ? "Unauthorized" : "تعذر إرسال طلب الدفع الآن." }, { status });
  }
}
