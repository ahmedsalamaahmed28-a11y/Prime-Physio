import { NextRequest, NextResponse } from "next/server";
import { requireAuthOnly } from "../../utils/auth";
import { getAdminClient } from "@/lib/supabase-admin";
import { getPaymobCheckoutUrl } from "@/lib/paymob";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

const PAID_PLANS = new Set(["essential", "medium", "advanced", "maximum"]);

function clean(value: unknown, max = 120) {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

function isEgyptianOrInternationalPhone(value: string) {
  return /^\+[1-9]\d{6,14}$/.test(value);
}

export async function POST(request: NextRequest) {
  try {
    if (process.env.PAYMOB_SUBSCRIPTIONS_ENABLED !== "true") {
      return NextResponse.json(
        { error: "الدفع الإلكتروني متوقف مؤقتًا حتى اكتمال اختبار بيئة Paymob التجريبية." },
        { status: 503, headers: { "Cache-Control": "no-store, private" } }
      );
    }

    const user = await requireAuthOnly(request);
    const clinicId = user.clinicId;
    const email = user.email.trim().toLowerCase();
    if (!clinicId) {
      return NextResponse.json({ error: "اختر المركز الذي تريد ترقية اشتراكه أولاً." }, { status: 400 });
    }

    const body = await request.json().catch(() => null);
    const planCode = clean(body?.planId, 30).toLowerCase();
    const billingPeriod = clean(body?.billingPeriod, 20).toLowerCase();
    if (!PAID_PLANS.has(planCode) || !["monthly", "yearly"].includes(billingPeriod)) {
      return NextResponse.json({ error: "الباقة أو فترة الاشتراك غير صالحة." }, { status: 400 });
    }

    const admin = getAdminClient();
    const [{ data: clinic, error: clinicError }, { data: owner, error: ownerError }, { data: plan, error: planError }] = await Promise.all([
      admin.from("clinics").select("id,admin_email,phone,status,is_active").eq("id", clinicId).maybeSingle(),
      admin.from("clinic_owners").select("clinic_id").eq("clinic_id", clinicId).eq("owner_email", email).maybeSingle(),
      admin.from("subscription_plans").select("name,name_ar,name_en,price_monthly,price_yearly,is_active").eq("name", planCode).eq("is_active", true).maybeSingle(),
    ]);

    if (clinicError || ownerError || planError) {
      console.error("[Subscription Checkout] Ownership or plan lookup failed.");
      return NextResponse.json({ error: "تعذر التحقق من المركز أو الباقة." }, { status: 503 });
    }
    if (!clinic || !owner || clinic.admin_email?.trim().toLowerCase() !== email || clinic.is_active === false || clinic.status !== "active") {
      return NextResponse.json({ error: "يجب أن تكون مالك المركز لتغيير باقته." }, { status: 403 });
    }
    if (!plan) return NextResponse.json({ error: "هذه الباقة غير متاحة حاليًا." }, { status: 404 });

    const nowIso = new Date().toISOString();
    const { error: expireOldError } = await admin
      .from("subscription_payment_orders")
      .update({ status: "expired" })
      .eq("clinic_id", clinicId)
      .eq("status", "pending")
      .lte("expires_at", nowIso);
    if (expireOldError) {
      console.error("[Subscription Checkout] Could not expire old payment attempts:", expireOldError.message);
      return NextResponse.json({ error: "تعذر التحقق من محاولات الدفع السابقة." }, { status: 503 });
    }

    const { data: openPayment, error: openPaymentError } = await admin
      .from("subscription_payment_orders")
      .select("id,expires_at")
      .eq("clinic_id", clinicId)
      .eq("status", "pending")
      .gt("expires_at", nowIso)
      .limit(1)
      .maybeSingle();
    if (openPaymentError) {
      console.error("[Subscription Checkout] Could not check open payment attempts:", openPaymentError.message);
      return NextResponse.json({ error: "تعذر التحقق من طلبات الدفع المفتوحة." }, { status: 503 });
    }
    if (openPayment) {
      return NextResponse.json(
        { error: "لديك عملية دفع مفتوحة بالفعل. أكملها أولاً أو انتظر انتهاء صلاحيتها قبل بدء عملية جديدة.", pendingReference: openPayment.id, expiresAt: openPayment.expires_at },
        { status: 409, headers: { "Cache-Control": "no-store, private" } }
      );
    }

    const amountEgp = Number(billingPeriod === "yearly" ? plan.price_yearly : plan.price_monthly);
    const amountCents = Math.round(amountEgp * 100);
    if (!Number.isSafeInteger(amountCents) || amountCents <= 0) {
      return NextResponse.json({ error: "سعر الباقة غير صالح." }, { status: 500 });
    }

    const billing = body?.billingData || {};
    const nameParts = clean(billing.full_name || user.email.split("@")[0]).split(/\s+/);
    const firstName = clean(billing.first_name || nameParts[0], 50);
    const lastName = clean(billing.last_name || nameParts.slice(1).join(" ") || "Customer", 50);
    const phone = clean(billing.phone_number || clinic.phone, 24);
    if (!firstName || !lastName || !isEgyptianOrInternationalPhone(phone)) {
      return NextResponse.json({ error: "أدخل رقم هاتف صحيحًا بالصيغة الدولية مثل +201001234567." }, { status: 400 });
    }

    const secretKey = process.env.PAYMOB_SECRET_KEY || "";
    const publicKey = process.env.PAYMOB_PUBLIC_KEY || "";
    const hmacSecret = process.env.PAYMOB_HMAC_SECRET || "";
    const integrationId = Number(process.env.PAYMOB_INTEGRATION_ID || "");
    const mode = (process.env.PAYMOB_MODE || "").toLowerCase();
    const secretMode = secretKey.startsWith("egy_sk_test_") || secretKey.startsWith("sk_test_") ? "test" : secretKey.startsWith("egy_sk_live_") || secretKey.startsWith("sk_live_") ? "live" : "";
    const publicMode = publicKey.startsWith("egy_pk_test_") || publicKey.startsWith("pk_test_") ? "test" : publicKey.startsWith("egy_pk_live_") || publicKey.startsWith("pk_live_") ? "live" : "";
    if (!secretKey || !publicKey || !hmacSecret || !Number.isSafeInteger(integrationId) || integrationId <= 0
      || !["test", "live"].includes(mode) || secretMode !== mode || publicMode !== mode) {
      return NextResponse.json(
        { error: "إعدادات Paymob غير مكتملة أو مفاتيح الاختبار والإنتاج غير متطابقة. لم يتم بدء أي عملية دفع." },
        { status: 503 }
      );
    }

    const siteUrl = request.nextUrl.origin.replace(/\/$/, "");
    const baseUrl = "https://accept.paymob.com";
    const { data: paymentOrder, error: orderError } = await admin
      .from("subscription_payment_orders")
      .insert({
        clinic_id: clinicId,
        user_email: email,
        plan_code: planCode,
        billing_period: billingPeriod,
        amount_cents: amountCents,
        currency: "EGP",
        status: "pending",
      })
      .select("id")
      .single();

    if (orderError || !paymentOrder) {
      console.error("[Subscription Checkout] Could not create local payment order:", orderError?.message);
      return NextResponse.json({ error: "تعذر إنشاء طلب الدفع. حاول مرة أخرى." }, { status: 500 });
    }

    const callbackUrl = new URL("/api/paymob/callback", siteUrl).toString();
    const returnUrl = new URL("/subscription/result", siteUrl);
    returnUrl.searchParams.set("reference", paymentOrder.id);

    let paymobResponse: Response;
    try {
      paymobResponse = await fetch(baseUrl + "/v1/intention/", {
        method: "POST",
        headers: {
          Authorization: "Token " + secretKey,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          amount: amountCents,
          currency: "EGP",
          payment_methods: [integrationId],
          items: [{
            name: String(plan.name_en || plan.name || planCode).slice(0, 50),
            amount: amountCents,
            description: ("Prime Physio " + planCode + " " + billingPeriod + " subscription").slice(0, 255),
            quantity: 1,
          }],
          billing_data: {
            first_name: firstName,
            last_name: lastName,
            email,
            phone_number: phone,
            apartment: "N/A",
            floor: "N/A",
            street: clean(billing.street || "N/A", 100),
            building: "N/A",
            postal_code: "00000",
            city: clean(billing.city || "Cairo", 50),
            country: "EGY",
            state: clean(billing.state || "Cairo", 50),
          },
          special_reference: paymentOrder.id,
          notification_url: callbackUrl,
          redirection_url: returnUrl.toString(),
          expiration: 1800,
        }),
        cache: "no-store",
      });
    } catch (error) {
      await admin.from("subscription_payment_orders").update({ status: "failed" }).eq("id", paymentOrder.id);
      console.error("[Subscription Checkout] Paymob connection failed:", error instanceof Error ? error.message : "network error");
      return NextResponse.json({ error: "تعذر الاتصال ببوابة الدفع. لم يتم خصم أي مبلغ." }, { status: 502 });
    }

    const paymobData = await paymobResponse.json().catch(() => ({}));
    const clientSecret = clean(paymobData?.client_secret, 500);
    const paymobOrderId = String(paymobData?.intention_order_id ?? paymobData?.order?.id ?? "");
    const intentionId = paymobData?.id ? String(paymobData.id) : null;
    if (!paymobResponse.ok || !clientSecret || !/^\d+$/.test(paymobOrderId)) {
      await admin.from("subscription_payment_orders").update({ status: "failed" }).eq("id", paymentOrder.id);
      console.error("[Subscription Checkout] Paymob rejected intention:", paymobResponse.status);
      return NextResponse.json({ error: "بوابة الدفع لم تقبل طلب الدفع. تحقق من إعدادات Paymob." }, { status: 502 });
    }

    const { error: updateError } = await admin
      .from("subscription_payment_orders")
      .update({ paymob_intention_id: intentionId, paymob_order_id: paymobOrderId })
      .eq("id", paymentOrder.id)
      .eq("status", "pending");
    if (updateError) {
      console.error("[Subscription Checkout] Failed to link Paymob order:", updateError.message);
      await admin.from("subscription_payment_orders").update({ status: "failed" }).eq("id", paymentOrder.id).eq("status", "pending");
      return NextResponse.json({ error: "تم إعداد الدفع لكن تعذر ربط الطلب. تواصل مع الدعم قبل إعادة المحاولة." }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      reference: paymentOrder.id,
      checkoutUrl: getPaymobCheckoutUrl(baseUrl, publicKey, clientSecret),
      amount: amountEgp,
      currency: "EGP",
      planCode,
      billingPeriod,
    }, { headers: { "Cache-Control": "no-store, private" } });
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    const status = /unauthorized/i.test(message) ? 401 : 403;
    return NextResponse.json(
      { error: status === 401 ? "يجب تسجيل الدخول أولاً." : "تعذر التحقق من صلاحيات المركز." },
      { status, headers: { "Cache-Control": "no-store, private" } }
    );
  }
}
