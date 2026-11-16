import { NextRequest, NextResponse } from "next/server";
import { requireAuthOnly } from "../../utils/auth";
import { getAdminClient } from "@/lib/supabase-admin";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(request: NextRequest) {
  try {
    const user = await requireAuthOnly(request);
    const reference = request.nextUrl.searchParams.get("reference") || "";
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(reference)) {
      return NextResponse.json({ error: "Invalid payment reference" }, { status: 400 });
    }

    const admin = getAdminClient();
    const { data: order, error } = await admin
      .from("subscription_payment_orders")
      .select("id,clinic_id,user_email,plan_code,billing_period,amount_cents,currency,status,created_at,paid_at")
      .eq("id", reference)
      .maybeSingle();
    if (error) return NextResponse.json({ error: "Could not load payment status" }, { status: 503 });
    if (!order || order.user_email.toLowerCase() !== user.email.toLowerCase()) {
      return NextResponse.json({ error: "Payment reference not found" }, { status: 404 });
    }

    const { data: owner, error: ownerError } = await admin
      .from("clinic_owners").select("clinic_id")
      .eq("clinic_id", order.clinic_id)
      .eq("owner_email", user.email.toLowerCase())
      .maybeSingle();
    if (ownerError || !owner) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    return NextResponse.json({
      reference: order.id,
      planCode: order.plan_code,
      billingPeriod: order.billing_period,
      amount: Number(order.amount_cents) / 100,
      currency: order.currency,
      status: order.status,
      paidAt: order.paid_at,
    }, { headers: { "Cache-Control": "no-store, private" } });
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    const status = /unauthorized/i.test(message) ? 401 : 403;
    return NextResponse.json({ error: status === 401 ? "Unauthorized" : "Forbidden" }, { status });
  }
}
