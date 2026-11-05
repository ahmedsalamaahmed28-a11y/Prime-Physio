import { NextRequest, NextResponse } from "next/server";
import { getAdminClient } from "@/lib/supabase-admin";
import { requireRole } from "../../utils/auth";
import { normalizeAuthEmail } from "@/lib/verificationCodes";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

const PAYMOB_BASE = "https://accept.paymob.com/api";
const PLAN_PRICES: Record<string, number> = { silver: 1000 * 100, gold: 1500 * 100 };
const PLAN_NAMES: Record<string, string> = {
  silver: "الخطة الفضية - Prime Physio",
  gold: "الخطة الذهبية - Prime Physio",
};

function safeText(value: unknown, max = 120, fallback = "N/A") {
  return typeof value === "string" && value.trim() ? value.trim().slice(0, max) : fallback;
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireRole(req, ["admin"]);
    const email = normalizeAuthEmail(user.email);
    const clinicId = user.clinicId;
    if (!email || !clinicId) {
      return NextResponse.json({ error: "يجب ربط حساب المدير بعيادة قبل شراء الاشتراك" }, { status: 403 });
    }

    const body = await req.json().catch(() => null);
    const planId = typeof body?.planId === "string" ? body.planId : "";
    const billingPeriod = body?.billingPeriod === "yearly" ? "yearly" : body?.billingPeriod === "monthly" ? "monthly" : "";
    const billingData = body?.billingData && typeof body.billingData === "object" ? body.billingData : {};
    if (!PLAN_PRICES[planId] || !billingPeriod) {
      return NextResponse.json({ error: "خطة أو مدة اشتراك غير صحيحة" }, { status: 400 });
    }

    const apiKey = process.env.PAYMOB_API_KEY;
    const integrationId = process.env.PAYMOB_INTEGRATION_ID;
    const iframeId = process.env.PAYMOB_IFRAME_ID;
    if (!apiKey || !integrationId || !/^\d+$/.test(integrationId) || !iframeId || !/^\d+$/.test(iframeId)) {
      return NextResponse.json({ error: "بوابة الدفع غير مهيأة حاليًا" }, { status: 503 });
    }

    const admin = getAdminClient();
    const { data: clinic, error: clinicError } = await admin
      .from("clinics")
      .select("id, admin_email, status")
      .eq("id", clinicId)
      .maybeSingle();

    if (clinicError || !clinic || clinic.status !== "active" || clinic.admin_email?.toLowerCase().trim() !== email) {
      return NextResponse.json({ error: "يجب أن يكون الطلب من مدير العيادة المسجل" }, { status: 403 });
    }

    let amountCents = PLAN_PRICES[planId];
    if (billingPeriod === "yearly") amountCents = Math.round(amountCents * 12 * 0.8);

    const authRes = await fetch(`${PAYMOB_BASE}/auth/tokens`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ api_key: apiKey }),
      cache: "no-store",
    });
    if (!authRes.ok) {
      console.error("[Paymob] Auth failed:", authRes.status);
      return NextResponse.json({ error: "تعذر الاتصال ببوابة الدفع" }, { status: 502 });
    }
    const { token: authToken } = await authRes.json();
    if (typeof authToken !== "string" || !authToken) {
      return NextResponse.json({ error: "استجابة غير صالحة من بوابة الدفع" }, { status: 502 });
    }

    const orderRes = await fetch(`${PAYMOB_BASE}/ecommerce/orders`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        auth_token: authToken,
        delivery_needed: false,
        amount_cents: amountCents,
        currency: "EGP",
        items: [{
          name: PLAN_NAMES[planId],
          amount_cents: amountCents,
          description: `اشتراك ${billingPeriod === "yearly" ? "سنوي" : "شهري"} - ${PLAN_NAMES[planId]}`,
          quantity: 1,
        }],
      }),
      cache: "no-store",
    });
    if (!orderRes.ok) {
      console.error("[Paymob] Order creation failed:", orderRes.status);
      return NextResponse.json({ error: "تعذر إنشاء طلب الدفع" }, { status: 502 });
    }

    const order = await orderRes.json();
    const orderId = String(order?.id ?? "");
    if (!/^\d+$/.test(orderId)) {
      return NextResponse.json({ error: "استجابة غير صالحة من بوابة الدفع" }, { status: 502 });
    }

    const { error: mappingError } = await admin.from("app_key_values").upsert({
      key: `paymob_order_${orderId}`,
      value: {
        planId,
        planName: PLAN_NAMES[planId],
        price: amountCents / 100,
        email,
        billingPeriod,
        clinicId,
      },
      updated_at: new Date().toISOString(),
    }, { onConflict: "key" });

    if (mappingError) {
      console.error("[Paymob] Failed to securely store order mapping:", mappingError);
      return NextResponse.json({ error: "تعذر تجهيز عملية الدفع بأمان" }, { status: 503 });
    }

    const billing = {
      apartment: safeText(billingData.apartment),
      email,
      floor: safeText(billingData.floor),
      first_name: safeText(billingData.first_name, 50, "Prime"),
      street: safeText(billingData.street),
      building: safeText(billingData.building),
      phone_number: safeText(billingData.phone_number, 24),
      shipping_method: "PKG",
      postal_code: safeText(billingData.postal_code, 20, "00000"),
      city: safeText(billingData.city, 80, "Cairo"),
      country: "EG",
      last_name: safeText(billingData.last_name, 50, "Physio"),
      state: safeText(billingData.state, 80, "Cairo"),
    };

    const keyRes = await fetch(`${PAYMOB_BASE}/acceptance/payment_keys`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        auth_token: authToken,
        amount_cents: amountCents,
        expiration: 3600,
        order_id: orderId,
        billing_data: billing,
        currency: "EGP",
        integration_id: Number(integrationId),
        lock_order_when_paid: true,
      }),
      cache: "no-store",
    });
    if (!keyRes.ok) {
      await admin.from("app_key_values").delete().eq("key", `paymob_order_${orderId}`);
      console.error("[Paymob] Payment key failed:", keyRes.status);
      return NextResponse.json({ error: "تعذر إصدار رابط الدفع" }, { status: 502 });
    }

    const { token: paymentKey } = await keyRes.json();
    if (typeof paymentKey !== "string" || !paymentKey) {
      await admin.from("app_key_values").delete().eq("key", `paymob_order_${orderId}`);
      return NextResponse.json({ error: "استجابة غير صالحة من بوابة الدفع" }, { status: 502 });
    }

    const iframeUrl = `https://accept.paymob.com/api/acceptance/iframes/${iframeId}?payment_token=${encodeURIComponent(paymentKey)}`;
    return NextResponse.json({ success: true, iframeUrl, orderId, planId, amountCents }, {
      headers: { "Cache-Control": "no-store, private" },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    const status = /unauthorized/i.test(message) ? 401 : 403;
    console.error("[Paymob] Authenticated checkout error:", error);
    return NextResponse.json({ error: status === 401 ? "Unauthorized" : "Forbidden" }, { status });
  }
}
