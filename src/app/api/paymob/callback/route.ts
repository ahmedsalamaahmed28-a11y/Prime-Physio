import { NextRequest, NextResponse } from "next/server";
import crypto, { timingSafeEqual } from "crypto";
import { getAdminClient } from "@/lib/supabase-admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

const PAYMOB_HMAC_FIELDS = [
  "amount_cents", "created_at", "currency", "error_occured",
  "has_parent_transaction", "id", "integration_id", "is_3d_secure",
  "is_auth", "is_capture", "is_refunded", "is_standalone_payment",
  "is_voided", "order", "owner", "pending",
  "source_data.pan", "source_data.sub_type", "source_data.type",
  "success",
] as const;

type FlatTransaction = Record<string, string>;

function verifyHmac(data: FlatTransaction, receivedHmac: string): boolean {
  const secret = process.env.PAYMOB_HMAC_SECRET;
  if (!secret || secret.length < 32 || !/^[a-f0-9]{128}$/i.test(receivedHmac)) {
    return false;
  }

  const message = PAYMOB_HMAC_FIELDS.map((key) => data[key] ?? "").join("");
  const calculated = crypto.createHmac("sha512", secret).update(message).digest();
  const received = Buffer.from(receivedHmac, "hex");
  return received.length === calculated.length && timingSafeEqual(received, calculated);
}

function transactionFields(obj: any): FlatTransaction {
  return {
    amount_cents: String(obj?.amount_cents ?? ""),
    created_at: String(obj?.created_at ?? ""),
    currency: String(obj?.currency ?? ""),
    error_occured: String(obj?.error_occured ?? ""),
    has_parent_transaction: String(obj?.has_parent_transaction ?? ""),
    id: String(obj?.id ?? ""),
    integration_id: String(obj?.integration_id ?? ""),
    is_3d_secure: String(obj?.is_3d_secure ?? ""),
    is_auth: String(obj?.is_auth ?? ""),
    is_capture: String(obj?.is_capture ?? ""),
    is_refunded: String(obj?.is_refunded ?? ""),
    is_standalone_payment: String(obj?.is_standalone_payment ?? ""),
    is_voided: String(obj?.is_voided ?? ""),
    order: String(obj?.order?.id ?? ""),
    owner: String(obj?.owner ?? ""),
    pending: String(obj?.pending ?? ""),
    "source_data.pan": String(obj?.source_data?.pan ?? ""),
    "source_data.sub_type": String(obj?.source_data?.sub_type ?? ""),
    "source_data.type": String(obj?.source_data?.type ?? ""),
    success: String(obj?.success ?? ""),
  };
}

function isSuccessfulPayment(obj: any): boolean {
  return obj?.success === true &&
    obj?.pending === false &&
    obj?.error_occured === false &&
    obj?.is_refunded !== true &&
    obj?.is_voided !== true &&
    String(obj?.currency || "").toUpperCase() === "EGP" &&
    String(obj?.integration_id ?? "") === String(process.env.PAYMOB_INTEGRATION_ID || "");
}

function safeRedirectPage(target: URL) {
  const serialized = JSON.stringify(target.toString()).replace(/</g, "\\u003c");
  return new NextResponse(
    `<!doctype html><html><body><script>window.top.location.href = ${serialized};</script></body></html>`,
    { headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store, private", "X-Content-Type-Options": "nosniff" } }
  );
}

function getBaseUrl() {
  const configured = process.env.NEXT_PUBLIC_BASE_URL;
  if (!configured) throw new Error("NEXT_PUBLIC_BASE_URL is required");
  const url = new URL(configured);
  if (url.protocol !== "https:" && url.hostname !== "localhost") {
    throw new Error("NEXT_PUBLIC_BASE_URL must use HTTPS");
  }
  return url;
}

async function checkClinicHasBranch(clinicId: string): Promise<boolean> {
  const admin = getAdminClient();
  const { count, error } = await admin
    .from("branches")
    .select("id", { count: "exact", head: true })
    .eq("clinic_id", clinicId);
  if (error) throw error;
  return (count ?? 0) > 0;
}

async function persistSubscription(obj: any): Promise<{ clinicId: string | null; duplicate: boolean }> {
  const orderId = String(obj?.order?.id ?? "");
  const transactionId = String(obj?.id ?? "");
  if (!/^\d+$/.test(orderId) || !/^\d+$/.test(transactionId)) {
    throw new Error("Invalid Paymob order or transaction ID");
  }

  const admin = getAdminClient();
  const { data: mapping, error: mappingError } = await admin
    .from("app_key_values")
    .select("value")
    .eq("key", `paymob_order_${orderId}`)
    .maybeSingle();

  if (mappingError) throw mappingError;
  if (!mapping?.value || typeof mapping.value !== "object") {
    throw new Error("Paymob order mapping not found");
  }

  const info = mapping.value as {
    planId?: string;
    price?: number;
    email?: string;
    billingPeriod?: string;
    clinicId?: string | null;
  };

  const planId = info.planId;
  const email = typeof info.email === "string" ? info.email.trim().toLowerCase() : "";
  const expectedAmount = Math.round(Number(info.price) * 100);
  const allowedPlans = new Set(["silver", "gold"]);
  if (
    !planId || !allowedPlans.has(planId) ||
    !Number.isFinite(expectedAmount) || expectedAmount <= 0 ||
    expectedAmount !== Number(obj.amount_cents) ||
    !/^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/.test(email) ||
    !["monthly", "yearly"].includes(String(info.billingPeriod))
  ) {
    throw new Error("Paymob transaction does not match the stored order");
  }

  const { data: existing, error: existingError } = await admin
    .from("subscriptions")
    .select("id, clinic_id, transaction_id")
    .eq("order_id", orderId)
    .maybeSingle();

  if (existingError) throw existingError;
  if (existing) {
    if (String(existing.transaction_id) !== transactionId) {
      throw new Error("Order was already associated with a different transaction");
    }
    return { clinicId: existing.clinic_id, duplicate: true };
  }

  const months = info.billingPeriod === "yearly" ? 12 : 1;
  const endDate = new Date();
  endDate.setMonth(endDate.getMonth() + months);

  const { error: insertError } = await admin.from("subscriptions").insert({
    user_email: email,
    clinic_id: info.clinicId || null,
    plan_name: planId,
    plan_price: Number(info.price),
    status: "active",
    order_id: orderId,
    transaction_id: transactionId,
    start_date: new Date().toISOString(),
    end_date: endDate.toISOString(),
  });

  if (insertError) {
    if (insertError.code === "23505") {
      const { data: raced } = await admin
        .from("subscriptions")
        .select("clinic_id, transaction_id")
        .eq("order_id", orderId)
        .maybeSingle();
      if (raced && String(raced.transaction_id) === transactionId) {
        return { clinicId: raced.clinic_id, duplicate: true };
      }
    }
    throw insertError;
  }

  const { error: cleanupError } = await admin
    .from("app_key_values")
    .delete()
    .eq("key", `paymob_order_${orderId}`);
  if (cleanupError) console.error("[Paymob] Could not remove processed order mapping:", cleanupError);

  return { clinicId: info.clinicId || null, duplicate: false };
}

// GET is only a browser redirect. A signed redirect is not used to activate a subscription;
// activation happens only from the authenticated Paymob server-to-server webhook below.
export async function GET(req: NextRequest) {
  const search = new URL(req.url).searchParams;
  const data: FlatTransaction = {};
  search.forEach((value, key) => { data[key] = value; });

  const base = getBaseUrl();
  const target = new URL("/subscription/failed", base);
  target.searchParams.set("reason", "invalid");

  const valid = verifyHmac(data, search.get("hmac") || "");
  const successful = search.get("success") === "true" &&
    search.get("pending") === "false" &&
    search.get("error_occured") === "false" &&
    search.get("is_refunded") !== "true" &&
    search.get("is_voided") !== "true" &&
    search.get("currency") === "EGP" &&
    search.get("integration_id") === String(process.env.PAYMOB_INTEGRATION_ID || "");

  if (valid && successful) {
    const successTarget = new URL("/signup", base);
    successTarget.searchParams.set("payment", "success");
    return safeRedirectPage(successTarget);
  }

  return safeRedirectPage(target);
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null);
    const obj = body?.obj;
    const hmac = typeof body?.hmac === "string" ? body.hmac : "";

    if (!obj || typeof obj !== "object" || !verifyHmac(transactionFields(obj), hmac)) {
      return NextResponse.json({ ok: false }, { status: 400, headers: { "Cache-Control": "no-store, private" } });
    }

    if (!isSuccessfulPayment(obj)) {
      return NextResponse.json({ ok: true, ignored: true }, { headers: { "Cache-Control": "no-store, private" } });
    }

    const persisted = await persistSubscription(obj);
    return NextResponse.json(
      { ok: true, duplicate: persisted.duplicate },
      { headers: { "Cache-Control": "no-store, private" } }
    );
  } catch (error) {
    console.error("[Paymob Webhook] Rejected or failed:", error);
    return NextResponse.json({ ok: false }, { status: 500, headers: { "Cache-Control": "no-store, private" } });
  }
}
