import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { getAdminClient } from "@/lib/supabase";

type PaymobTransaction = {
  id?: number | string;
  order?: { id?: number | string };
  amount_cents?: number | string;
  currency?: string;
  integration_id?: number | string;
  success?: boolean;
  pending?: boolean;
  error_occured?: boolean;
  is_auth?: boolean;
  is_capture?: boolean;
  is_captured?: boolean;
  is_refunded?: boolean;
  is_voided?: boolean;
  is_standalone_payment?: boolean;
  owner?: number | string;
  created_at?: string;
  source_data?: { pan?: string; sub_type?: string; type?: string };
  [key: string]: unknown;
};

const HMAC_KEYS = [
  "amount_cents", "created_at", "currency", "error_occured",
  "has_parent_transaction", "id", "integration_id", "is_3d_secure",
  "is_auth", "is_capture", "is_refunded", "is_standalone_payment",
  "is_voided", "order", "owner", "pending",
  "source_data.pan", "source_data.sub_type", "source_data.type", "success",
];

function verifyHmac(data: Record<string, string>, receivedHmac: string): boolean {
  const secret = process.env.PAYMOB_HMAC_SECRET;
  if (!secret || !receivedHmac || !/^[a-f0-9]{128}$/i.test(receivedHmac)) return false;
  const message = HMAC_KEYS.map((key) => data[key] ?? "").join("");
  const calculated = crypto.createHmac("sha512", secret).update(message).digest();
  const received = Buffer.from(receivedHmac, "hex");
  return calculated.length === received.length && crypto.timingSafeEqual(calculated, received);
}

function flattenTransaction(obj: PaymobTransaction): Record<string, string> {
  return {
    amount_cents: String(obj.amount_cents ?? ""),
    created_at: String(obj.created_at ?? ""),
    currency: String(obj.currency ?? ""),
    error_occured: String(obj.error_occured ?? ""),
    has_parent_transaction: String(obj.has_parent_transaction ?? ""),
    id: String(obj.id ?? ""),
    integration_id: String(obj.integration_id ?? ""),
    is_3d_secure: String(obj.is_3d_secure ?? ""),
    is_auth: String(obj.is_auth ?? ""),
    is_capture: String(obj.is_capture ?? ""),
    is_refunded: String(obj.is_refunded ?? ""),
    is_standalone_payment: String(obj.is_standalone_payment ?? ""),
    is_voided: String(obj.is_voided ?? ""),
    order: String(obj.order?.id ?? ""),
    owner: String(obj.owner ?? ""),
    pending: String(obj.pending ?? ""),
    "source_data.pan": String(obj.source_data?.pan ?? ""),
    "source_data.sub_type": String(obj.source_data?.sub_type ?? ""),
    "source_data.type": String(obj.source_data?.type ?? ""),
    success: String(obj.success ?? ""),
  };
}

function isSuccessfulPayment(obj: PaymobTransaction): boolean {
  const capturedOrStandalone = obj.is_capture === true || obj.is_captured === true || obj.is_standalone_payment === true;
  return obj.success === true &&
    obj.pending !== true &&
    obj.error_occured !== true &&
    obj.is_refunded !== true &&
    obj.is_voided !== true &&
    obj.is_auth !== true &&
    capturedOrStandalone;
}

async function getCheckoutMapping(orderId: string) {
  if (!/^\d{1,24}$/.test(orderId)) return null;
  const admin = getAdminClient();
  const { data, error } = await admin.from("app_key_values")
    .select("value").eq("key", `paymob_order_${orderId}`).maybeSingle();
  if (error) {
    console.error("[Paymob] Checkout mapping lookup failed:", error.message);
    return null;
  }
  return data?.value && typeof data.value === "object" ? data.value as Record<string, unknown> : null;
}

async function persistSubscription(obj: PaymobTransaction): Promise<string | null> {
  const orderId = String(obj.order?.id ?? "");
  const transactionId = String(obj.id ?? "");
  if (!/^\d{1,24}$/.test(orderId) || !/^\d{1,24}$/.test(transactionId)) return null;

  const mapping = await getCheckoutMapping(orderId);
  if (!mapping) {
    // A duplicate webhook can arrive after the successful transaction was already persisted.
    const admin = getAdminClient();
    const { data: existing } = await admin.from("subscriptions")
      .select("clinic_id,order_id,transaction_id").eq("order_id", orderId).maybeSingle();
    if (existing && String(existing.transaction_id) === transactionId) return existing.clinic_id || null;
    console.warn("[Paymob] No valid checkout mapping for order:", orderId);
    return null;
  }

  const planId = typeof mapping.planId === "string" ? mapping.planId : "";
  const price = Number(mapping.price);
  const billingPeriod = mapping.billingPeriod === "yearly" ? "yearly" : "monthly";
  const cleanEmail = typeof mapping.email === "string" ? mapping.email.toLowerCase().trim() : "";
  const expectedIntegration = process.env.PAYMOB_INTEGRATION_ID;
  const expectedCents = Math.round(price * 100);
  const actualCents = Number(obj.amount_cents);

  if (!["silver", "gold"].includes(planId) ||
      !Number.isFinite(price) || price <= 0 ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail) ||
      !expectedIntegration ||
      String(obj.integration_id ?? "") !== String(expectedIntegration) ||
      obj.currency !== "EGP" ||
      !Number.isSafeInteger(actualCents) || actualCents !== expectedCents ||
      !isSuccessfulPayment(obj)) {
    console.error("[Paymob] Payment does not match the stored checkout order:", orderId);
    return null;
  }

  const admin = getAdminClient();
  const { data: existingOrder, error: existingOrderError } = await admin.from("subscriptions")
    .select("clinic_id,transaction_id").eq("order_id", orderId).maybeSingle();
  if (existingOrderError) return null;
  if (existingOrder) {
    if (String(existingOrder.transaction_id) === transactionId) return existingOrder.clinic_id || null;
    console.error("[Paymob] Order already consumed by another transaction:", orderId);
    return null;
  }
  const { data: existingTransaction, error: existingTransactionError } = await admin.from("subscriptions")
    .select("id").eq("transaction_id", transactionId).maybeSingle();
  if (existingTransactionError || existingTransaction) return null;

  let clinicId = typeof mapping.clinicId === "string" ? mapping.clinicId : null;
  if (!clinicId) {
    const { data: staff, error: staffError } = await admin.from("staff")
      .select("clinic_id").eq("email", cleanEmail).limit(1).maybeSingle();
    if (staffError) return null;
    clinicId = staff?.clinic_id || null;
  }

  const startDate = new Date();
  const endDate = new Date(startDate);
  endDate.setMonth(endDate.getMonth() + (billingPeriod === "yearly" ? 12 : 1));

  const { data: inserted, error: insertError } = await admin.from("subscriptions").insert({
    user_email: cleanEmail,
    clinic_id: clinicId,
    plan_name: planId,
    plan_price: price,
    status: "active",
    order_id: orderId,
    transaction_id: transactionId,
    start_date: startDate.toISOString(),
    end_date: endDate.toISOString(),
  }).select("id").single();

  if (insertError || !inserted) {
    console.error("[Paymob] Subscription insert failed:", insertError?.message);
    return null;
  }

  // The subscriptions table is the source of truth for plan and expiry.
  // Do not write non-existent subscription fields into clinic_settings.

  await admin.from("app_key_values").delete().eq("key", `paymob_order_${orderId}`);
  return clinicId;
}

async function checkClinicHasBranch(clinicId: string | null): Promise<boolean> {
  if (!clinicId) return false;
  const { count, error } = await getAdminClient().from("branches")
    .select("id", { count: "exact", head: true }).eq("clinic_id", clinicId);
  return !error && (count ?? 0) > 0;
}

// GET is a browser redirect only. Subscription activation happens exclusively in the signed POST webhook.
export async function GET(req: NextRequest) {
  const params = req.nextUrl.searchParams;
  const data: Record<string, string> = {};
  params.forEach((value, key) => { data[key] = value; });
  const orderId = params.get("order") || "";
  const valid = verifyHmac(data, params.get("hmac") || "");
  const success = valid && params.get("success") === "true";
  const base = process.env.NEXT_PUBLIC_BASE_URL || req.nextUrl.origin;

  if (!success) {
    const failed = new URL("/subscription/failed", base);
    failed.searchParams.set("reason", valid ? "declined" : "invalid");
    if (/^\d{1,24}$/.test(orderId)) failed.searchParams.set("order", orderId);
    return NextResponse.redirect(failed);
  }

  const mapping = await getCheckoutMapping(orderId);
  const clinicId = typeof mapping?.clinicId === "string" ? mapping.clinicId : null;
  const path = clinicId ? (await checkClinicHasBranch(clinicId) ? "/home" : "/setup?step=clinic") : "/signup?payment=pending";
  return NextResponse.redirect(new URL(path, base));
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const obj = body?.obj as PaymobTransaction | undefined;
    const hmac = req.nextUrl.searchParams.get("hmac") || (typeof body?.hmac === "string" ? body.hmac : "");
    if (!obj || typeof obj !== "object") return NextResponse.json({ ok: false }, { status: 400 });

    const valid = verifyHmac(flattenTransaction(obj), hmac);
    if (!valid) {
      console.warn("[Paymob Webhook] HMAC mismatch");
      return NextResponse.json({ ok: false }, { status: 400 });
    }
    if (!isSuccessfulPayment(obj)) return NextResponse.json({ ok: true, ignored: true });

    const clinicId = await persistSubscription(obj);
    if (!clinicId) {
      // A public checkout may not have a clinic until signup; the payment is recorded with clinic_id null.
      const orderId = String(obj.order?.id ?? "");
      const admin = getAdminClient();
      const { data: saved } = await admin.from("subscriptions")
        .select("id").eq("order_id", orderId).eq("transaction_id", String(obj.id ?? "")).maybeSingle();
      if (!saved) return NextResponse.json({ ok: false, error: "Payment could not be linked to a subscription" }, { status: 409 });
    }
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[Paymob Webhook] Processing error:", err);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
