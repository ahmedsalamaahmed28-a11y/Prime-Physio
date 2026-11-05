import { NextRequest, NextResponse } from "next/server";
import { getAdminClient } from "@/lib/supabase";
import { requireRole } from "@/app/api/utils/auth";

export async function POST(req: NextRequest) {
  try {
    const user = await requireRole(req, ["admin"]);
    const body = await req.json();
    const normalizedEmail = typeof body?.email === "string" ? body.email.toLowerCase().trim() : "";
    const { name, planId, clinicId } = body || {};

    if (!normalizedEmail || !name || !planId || !clinicId) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }
    if (normalizedEmail !== user.email || clinicId !== user.clinicId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    if (planId !== "basic") {
      return NextResponse.json({ error: "Paid plans must be activated through confirmed Paymob payment" }, { status: 402 });
    }

    const admin = getAdminClient();
    const { data: clinic, error: clinicError } = await admin.from("clinics")
      .select("id,status").eq("id", user.clinicId).maybeSingle();
    if (clinicError) return NextResponse.json({ error: "Unable to verify clinic" }, { status: 500 });
    if (!clinic || clinic.status !== "active") return NextResponse.json({ error: "Clinic is not active" }, { status: 404 });

    const endDate = new Date();
    endDate.setMonth(endDate.getMonth() + 1);
    const { data: existing, error: existingError } = await admin.from("subscriptions")
      .select("id").eq("clinic_id", user.clinicId).eq("status", "active").maybeSingle();
    if (existingError) return NextResponse.json({ error: "Unable to verify subscription" }, { status: 500 });
    if (existing) return NextResponse.json({ error: "An active subscription already exists" }, { status: 409 });

    const { data: subscription, error } = await admin.from("subscriptions").insert({
      user_email: user.email, clinic_id: user.clinicId, plan_name: "basic", plan_price: 0,
      status: "active", start_date: new Date().toISOString(), end_date: endDate.toISOString(),
    }).select("id").single();
    if (error || !subscription) {
      console.error("[Subscribe] Free subscription creation failed:", error?.message);
      return NextResponse.json({ error: "Failed to create subscription" }, { status: 500 });
    }

    // Subscription state is authoritative in the subscriptions table; clinic_settings
    // has no subscription_status/subscription_plan columns.

    return NextResponse.json({ success: true, clinicId: user.clinicId, subscriptionId: subscription.id });
  } catch (err) {
    const message = err instanceof Error ? err.message : "";
    const status = message === "Unauthorized" ? 401 : /forbidden|insufficient|membership/i.test(message) ? 403 : 500;
    return NextResponse.json({ error: status === 401 ? "Unauthorized" : status === 403 ? "Forbidden" : "Internal server error" }, { status });
  }
}
