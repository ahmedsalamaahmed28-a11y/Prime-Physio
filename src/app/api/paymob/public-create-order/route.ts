import { NextRequest, NextResponse } from "next/server";
import { getAdminClient } from "@/lib/supabase";

const PAYMOB_BASE = "https://accept.paymob.com/api";

const PLAN_PRICES: Record<string, number> = {
  basic:  0,
  silver: 1000 * 100,
  gold:   1500 * 100,
};

const PLAN_NAMES: Record<string, string> = {
  basic:  "الخطة الأساسية - Prime Physio",
  silver: "الخطة الفضية - Prime Physio",
  gold:   "الخطة الذهبية - Prime Physio",
};

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const planId = body?.planId;
    const billingPeriod = body?.billingPeriod === "yearly" ? "yearly" : "monthly";
    const billingData = body?.billingData && typeof body.billingData === "object" ? body.billingData : null;
    const email = typeof billingData?.email === "string" ? billingData.email.toLowerCase().trim() : "";
    if (!billingData || !/^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/.test(email) || email.length > 254) {
      return NextResponse.json({ error: "يرجى إدخال بريد إلكتروني صحيح" }, { status: 400 });
    }

    // No clinicId yet; it will be attached when they sign up
    const resolvedClinicId: string | null = null;

    if (typeof planId !== "string" || !["silver", "gold"].includes(planId)) {
      return NextResponse.json({ error: "خطة غير صحيحة" }, { status: 400 });
    }
    let amountCents = PLAN_PRICES[planId];
    if (!amountCents) {
      return NextResponse.json({ error: "خطة غير صحيحة" }, { status: 400 });
    }

    if (billingPeriod === "yearly") {
      amountCents = Math.round(amountCents * 12 * 0.8);
    }

    const apiKey = process.env.PAYMOB_API_KEY;
    const integrationId = process.env.PAYMOB_INTEGRATION_ID;
    const iframeId = process.env.PAYMOB_IFRAME_ID;
    if (!apiKey || !integrationId || !iframeId || !/^\\d+$/.test(integrationId) || !/^\\d+$/.test(iframeId)) {
      console.error("[Paymob] Required payment configuration is missing or invalid");
      return NextResponse.json({ error: "خدمة الدفع غير مهيأة" }, { status: 503 });
    }

    // ── Step 1: Authentication ────────────────────────────────────────────
    const authRes = await fetch(`${PAYMOB_BASE}/auth/tokens`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ api_key: apiKey }),
    });

    if (!authRes.ok) {
      const err = await authRes.text();
      console.error("[Paymob] Auth failed:", err);
      return NextResponse.json({ error: "فشل التحقق مع Paymob" }, { status: 500 });
    }

    const { token: authToken } = await authRes.json();

    // ── Step 2: Register Order ────────────────────────────────────────────
    const orderRes = await fetch(`${PAYMOB_BASE}/ecommerce/orders`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        auth_token:     authToken,
        delivery_needed: false,
        amount_cents:   amountCents,
        currency:       "EGP",
        items: [
          {
            name:        PLAN_NAMES[planId],
            amount_cents: amountCents,
            description: `اشتراك ${billingPeriod === "yearly" ? "سنوي" : "شهري"} - ${PLAN_NAMES[planId]}`,
            quantity:    1,
          },
        ],
      }),
    });

    if (!orderRes.ok) {
      const err = await orderRes.text();
      console.error("[Paymob] Order failed:", err);
      return NextResponse.json({ error: "فشل إنشاء الطلب" }, { status: 500 });
    }

    const { id: orderId } = await orderRes.json();

    // Persist the server-side order mapping before creating a payment key.
    const admin = getAdminClient();
    const { error: mappingError } = await admin.from("app_key_values").upsert({
      key: `paymob_order_${orderId}`,
      value: {
        planId,
        planName: PLAN_NAMES[planId],
        price: amountCents / 100,
        email,
        billingPeriod,
        clinicId: resolvedClinicId,
      },
      updated_at: new Date().toISOString(),
    }, { onConflict: "key" });
    if (mappingError) {
      console.error("[Paymob] Failed to persist checkout mapping:", mappingError.message);
      return NextResponse.json({ error: "تعذر حفظ بيانات طلب الدفع بأمان. يرجى المحاولة مرة أخرى." }, { status: 503 });
    }

    // ── Step 3: Get Payment Key ───────────────────────────────────────────
    const billing = {
      apartment:     "N/A",
      email:         "client@primephysio.com",
      floor:         "N/A",
      first_name:    "Prime",
      street:        "N/A",
      building:      "N/A",
      phone_number:  "+201000000000",
      shipping_method: "PKG",
      postal_code:   "00000",
      city:          "Cairo",
      country:       "EG",
      last_name:     "Physio",
      state:         "Cairo",
      ...billingData,
      email,
    };

    const pkRes = await fetch(`${PAYMOB_BASE}/acceptance/payment_keys`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        auth_token:     authToken,
        amount_cents:   amountCents,
        expiration:     3600,
        order_id:       orderId,
        billing_data:   billing,
        currency:       "EGP",
        integration_id: Number(integrationId),
        lock_order_when_paid: true,
      }),
    });

    if (!pkRes.ok) {
      const err = await pkRes.text();
      console.error("[Paymob] Payment key failed:", err);
      return NextResponse.json({ error: "فشل الحصول على مفتاح الدفع" }, { status: 500 });
    }

    const { token: paymentKey } = await pkRes.json();

    // ── Return iframe URL ─────────────────────────────────────────────────
    const iframeUrl = `https://accept.paymob.com/api/acceptance/iframes/${iframeId}?payment_token=${paymentKey}`;

    return NextResponse.json({
      success:    true,
      iframeUrl,
      orderId,
      planId,
      amountCents,
    });

  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    const status = msg === "Unauthorized" || msg === "غير مصرح — صلاحية غير كافية" ? 401 : 500;
    console.error("[Paymob] Unexpected error:", msg);
    return NextResponse.json({ error: "خطأ غير متوقع في نظام الدفع" }, { status });
  }
}
