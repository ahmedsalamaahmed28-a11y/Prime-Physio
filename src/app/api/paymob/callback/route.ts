import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { getAdminClient } from "@/lib/supabase";

async function checkClinicHasBranch(clinicId: string | null): Promise<boolean> {
  if (!clinicId) return false;
  try {
    const admin = getAdminClient();
    const { count } = await admin
      .from("branches")
      .select("id", { count: "exact", head: true })
      .eq("clinic_id", clinicId);
    return (count ?? 0) > 0;
  } catch {
    return false;
  }
}

async function persistSubscription(orderId: string, transactionId: string, email: string) {
  try {
    const admin = getAdminClient();
    const { data: mapping } = await admin
      .from("app_key_values")
      .select("value")
      .eq("key", `paymob_order_${orderId}`)
      .maybeSingle();

    const info = mapping?.value || { planId: "basic", planName: "Prime Physio", price: 0, email: email || "", clinicId: null };
    const cleanEmail = (info.email || email || "unknown@primephysio.com").toLowerCase().trim();

    // Use clinicId from mapping (set at create-order time)
    let clinicId = info.clinicId || null;

    // Fallback: find clinic_id from staff if not in mapping
    if (!clinicId) {
      try {
        const { data: staff } = await admin
          .from("staff")
          .select("clinic_id")
          .eq("email", cleanEmail)
          .maybeSingle();
        clinicId = staff?.clinic_id || null;
      } catch {}
    }

    const endDate = new Date();
    endDate.setMonth(endDate.getMonth() + 1);

    const { error } = await admin.from("subscriptions").insert({
      user_email: cleanEmail,
      clinic_id: clinicId,
      plan_name: info.planId || "basic",
      plan_price: info.price || 0,
      status: "active",
      order_id: String(orderId),
      transaction_id: String(transactionId),
      start_date: new Date().toISOString(),
      end_date: endDate.toISOString(),
    });

    if (error) {
      console.error("[Paymob] Failed to save subscription:", error);
    } else {
      console.log(`[Paymob] ✅ Subscription saved: ${info.planId} for ${cleanEmail}`);
      // Clean up mapping
      await admin.from("app_key_values").delete().eq("key", `paymob_order_${orderId}`);
    }

    return clinicId;
  } catch (err) {
    console.error("[Paymob] Subscription persist error:", err);
    return null;
  }
}

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
    const clinicId = await persistSubscription(orderId || "", txId || "", "");
    if (!clinicId) {
      // It was a public checkout and the user doesn't have a clinic yet
      const redirectPath = `${base}/signup?payment=success`;
      return new NextResponse(
        `<html><body><script>window.top.location.href = "${redirectPath}";</script></body></html>`,
        { headers: { "Content-Type": "text/html" } }
      );
    }

    // If clinic has no branch yet → send to center setup; otherwise → home
    const hasBranch = await checkClinicHasBranch(clinicId);
    const redirectPath = hasBranch ? "/home" : "/setup?step=clinic";
    return new NextResponse(
      `<html><body><script>window.top.location.href = "${base}${redirectPath}";</script></body></html>`,
      { headers: { "Content-Type": "text/html" } }
    );
  } else {
    const redirectPath = `${base}/subscription/failed?order=${orderId}&reason=${success === "false" ? "declined" : "invalid"}`;
    return new NextResponse(
      `<html><body><script>window.top.location.href = "${redirectPath}";</script></body></html>`,
      { headers: { "Content-Type": "text/html" } }
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
      console.log(`[Paymob] ✅ Payment confirmed — Order: ${obj.order?.id}, TX: ${obj.id}`);
      await persistSubscription(String(obj.order?.id || ""), String(obj.id || ""), obj.owner || "");
    } else {
      console.log(`[Paymob] ❌ Payment failed — Order: ${obj.order?.id}`);
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[Paymob Webhook] Error:", err);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
