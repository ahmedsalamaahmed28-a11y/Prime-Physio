import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";

// ─── Paymob Transaction Callback (GET redirect + POST webhook) ─────────────
// Paymob redirects the user here after payment with query params
// and also sends a POST webhook with full transaction data

function verifyHmac(data: Record<string, string>, receivedHmac: string): boolean {
  const secret = process.env.PAYMOB_HMAC_SECRET;
  if (!secret) return true; // skip verification if not configured yet

  // Paymob HMAC concatenation order (alphabetical by key)
  const keys = [
    "amount_cents", "created_at", "currency", "error_occured",
    "has_parent_transaction", "id", "integration_id", "is_3d_secure",
    "is_auth", "is_capture", "is_refunded", "is_standalone_payment",
    "is_voided", "order", "owner", "pending",
    "source_data.pan", "source_data.sub_type", "source_data.type",
    "success",
  ];

  const message = keys.map((k) => data[k] ?? "").join("");
  const calculated = crypto
    .createHmac("sha512", secret)
    .update(message)
    .digest("hex");

  return calculated === receivedHmac;
}

// ── GET: User redirect after payment ────────────────────────────────────────
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const success    = searchParams.get("success");
  const orderId    = searchParams.get("order");
  const txId       = searchParams.get("id");
  const hmac       = searchParams.get("hmac") || "";

  // Build flat object for HMAC verification
  const data: Record<string, string> = {};
  searchParams.forEach((val, key) => { data[key] = val; });

  const isValid   = verifyHmac(data, hmac);
  const isPaid    = success === "true" && isValid;

  const base = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";

  if (isPaid) {
    return NextResponse.redirect(
      `${base}/subscription/success?order=${orderId}&tx=${txId}`
    );
  } else {
    return NextResponse.redirect(
      `${base}/subscription/failed?order=${orderId}&reason=${success === "false" ? "declined" : "invalid"}`
    );
  }
}

// ── POST: Paymob server-to-server webhook ────────────────────────────────────
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { obj, hmac } = body;

    if (!obj) return NextResponse.json({ ok: true });

    // Flatten obj for HMAC
    const flat: Record<string, string> = {
      amount_cents:            String(obj.amount_cents ?? ""),
      created_at:              String(obj.created_at ?? ""),
      currency:                String(obj.currency ?? ""),
      error_occured:           String(obj.error_occured ?? ""),
      has_parent_transaction:  String(obj.has_parent_transaction ?? ""),
      id:                      String(obj.id ?? ""),
      integration_id:          String(obj.integration_id ?? ""),
      is_3d_secure:            String(obj.is_3d_secure ?? ""),
      is_auth:                 String(obj.is_auth ?? ""),
      is_capture:              String(obj.is_capture ?? ""),
      is_refunded:             String(obj.is_refunded ?? ""),
      is_standalone_payment:   String(obj.is_standalone_payment ?? ""),
      is_voided:               String(obj.is_voided ?? ""),
      order:                   String(obj.order?.id ?? ""),
      owner:                   String(obj.owner ?? ""),
      pending:                 String(obj.pending ?? ""),
      "source_data.pan":       String(obj.source_data?.pan ?? ""),
      "source_data.sub_type":  String(obj.source_data?.sub_type ?? ""),
      "source_data.type":      String(obj.source_data?.type ?? ""),
      success:                 String(obj.success ?? ""),
    };

    const isValid = verifyHmac(flat, hmac);
    if (!isValid) {
      console.warn("[Paymob Webhook] HMAC mismatch — possible tampered request");
      return NextResponse.json({ ok: false }, { status: 400 });
    }

    if (obj.success === true) {
      // ✅ Payment successful — update subscription status in your DB here
      console.log(`[Paymob] ✅ Payment confirmed — Order: ${obj.order?.id}, TX: ${obj.id}`);
      // TODO (production): implement actual Supabase subscription table update
    } else {
      console.log(`[Paymob] ❌ Payment failed — Order: ${obj.order?.id}`);
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[Paymob Webhook] Error:", err);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
