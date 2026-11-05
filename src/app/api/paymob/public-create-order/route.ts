import { NextRequest, NextResponse } from "next/server";
import { getAdminClient } from "@/lib/supabase-admin";
import { normalizeAuthEmail, allowPaymentOrderFromIp } from "@/lib/verificationCodes";

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
  return typeof value === "string" && value.trim()
    ? value.trim().slice(0, max)
    : fallback;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null);
    if (!body || typeof body !== "object" || Array.isArray(body)) {
      return NextResponse.json({ error: "بيانات الطلب غير صحيحة" }, { status: 400 });
    }

    const planId = typeof body.planId === "string" ? body.planId : "";
    const billingPeriod = body.billingPeriod === "yearly" ? "yearly" : body.billingPeriod === "monthly" ? "monthly" : "";
    const billingData = body.billingData && typeof body.billingData === "object" ? body.billingData : {};
    const email = normalizeAuthEmail(billingData.email);

    if (!PLAN_PRICES[planId] || !billingPeriod || !email) {
      return NextResponse.json({ error: "يرجى اختيار خطة صحيحة وإدخال بريد إلكتروني صالح" }, { status: 400 });
    }

    const apiKey = process.env.PAYMOB_API_KEY;
    const integrationId = process.env.PAYMOB_INTEGRATION_ID;
    const iframeId = process.env.PAYMOB_IFRAME_ID;
    if (!apiKey || !integrationId || !/^\d+$/.test(integrationId) || !iframeId || !/^\d+$/.test(iframeId)) {
      return NextResponse.json({ error: "بوابة الدفع غير مهيأة حاليًا" }, { status: 503 });
    }

    const admin = getAdminClient();
    const ip = req.headers.get("x-real-ip") ||
      req.headers.get("x-forwarded-for")?.split(",").pop()?.trim() || "unknown";
    if (!(await allowPaymentOrderFromIp(admin, ip))) {
      return NextResponse.json({ error: "تم تجاوز عدد محاولات إنشاء طلب الدفع. حاول لاحقًا." }, { status: 429 });
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
      console.error("[Paymob] Public checkout authentication failed:", authRes.status);
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
      console.error("[Paymob] Public checkout order creation failed:", orderRes.status);
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
        clinicId: null,
      },
      updated_at: new Date().toISOString(),
    }, { onConflict: "key" });

    if (mappingError) {
      console.error("[Paymob] Could not securely store public order mapping:", mappingError);
      return NextResponse.json({ error: "تعذر تجهيز عملية الدفع بأمان. لم يتم إصدار رابط الدفع." }, { status: 503 });
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
      console.error("[Paymob] Public checkout payment-key request failed:", keyRes.status);
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
    console.error("[Paymob] Public checkout error:", error);
    return NextResponse.json({ error: "تعذر إتمام طلب الدفع حاليًا" }, { status: 500 });
  }
}
