import { NextRequest, NextResponse } from "next/server";
import { getAdminClient } from "@/lib/supabase-admin";
import { verifyPaymobTransactionHmac } from "@/lib/paymob";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function POST(request: NextRequest) {
  const secret = process.env.PAYMOB_HMAC_SECRET || "";
  if (!secret) return NextResponse.json({ error: "Webhook is not configured" }, { status: 503 });

  const payload = await request.json().catch(() => null);
  const receivedHmac = request.nextUrl.searchParams.get("hmac") || (typeof payload?.hmac === "string" ? payload.hmac : "");
  if (!payload || !verifyPaymobTransactionHmac(payload, receivedHmac, secret)) {
    return NextResponse.json({ error: "Invalid callback signature" }, { status: 401 });
  }

  const transaction = payload.obj;
  const transactionId = String(transaction?.id ?? "");
  const paymobOrderId = String(transaction?.order?.id ?? "");
  const localReference = String(transaction?.merchant_order_id ?? payload?.merchant_order_id ?? "");
  if (!/^\d+$/.test(transactionId) || !/^\d+$/.test(paymobOrderId)) {
    return NextResponse.json({ error: "Missing transaction identifiers" }, { status: 400 });
  }

  const admin = getAdminClient();
  let query = admin.from("subscription_payment_orders")
    .select("id,amount_cents,currency,status,paymob_order_id,paymob_transaction_id")
    .eq("paymob_order_id", paymobOrderId);

  let { data: order, error: orderError } = await query.maybeSingle();
  if (!order && !orderError && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(localReference)) {
    const fallback = await admin.from("subscription_payment_orders")
      .select("id,amount_cents,currency,status,paymob_order_id,paymob_transaction_id")
      .eq("id", localReference).maybeSingle();
    order = fallback.data;
    orderError = fallback.error;
  }
  if (orderError) {
    console.error("[Paymob Callback] Payment order lookup failed:", orderError.message);
    return NextResponse.json({ error: "Could not resolve payment order" }, { status: 500 });
  }
  if (!order) {
    console.error("[Paymob Callback] Verified callback has no matching local order:", paymobOrderId);
    return NextResponse.json({ error: "Payment order not found" }, { status: 500 });
  }

  if (order.status === "paid" && order.paymob_transaction_id === transactionId) {
    return NextResponse.json({ received: true, duplicate: true });
  }

  const amountCents = Number(transaction?.amount_cents);
  const currency = String(transaction?.currency ?? "").toUpperCase();
  if (amountCents !== Number(order.amount_cents) || currency !== order.currency) {
    console.error("[Paymob Callback] Amount/currency mismatch for order:", order.id);
    return NextResponse.json({ error: "Payment amount mismatch" }, { status: 400 });
  }

  const isSuccessful = transaction?.success === true
    && transaction?.pending === false
    && transaction?.is_refunded !== true
    && transaction?.is_voided !== true;
  if (!isSuccessful) {
    if (order.status === "pending") {
      await admin.from("subscription_payment_orders").update({ status: "failed" }).eq("id", order.id).eq("status", "pending");
    }
    return NextResponse.json({ received: true, paid: false });
  }

  const { data, error } = await admin.rpc("activate_subscription_from_payment", {
    p_order_id: order.id,
    p_transaction_id: transactionId,
    p_amount_cents: amountCents,
    p_currency: currency,
  });
  if (error) {
    console.error("[Paymob Callback] Subscription activation failed:", error.message);
    return NextResponse.json({ error: "Subscription activation failed" }, { status: 500 });
  }

  return NextResponse.json({ received: true, paid: true, duplicate: Boolean(data?.duplicate) });
}
