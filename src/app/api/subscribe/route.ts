import { NextRequest, NextResponse } from "next/server";
import { getAdminClient } from "@/lib/supabase-admin";
import { requireRole } from "../utils/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function POST(req: NextRequest) {
  try {
    const user = await requireRole(req, ["admin"]);
    const body = await req.json().catch(() => null);
    const requestedClinicId = typeof body?.clinicId === "string" ? body.clinicId : "";

    if (!user.clinicId || (requestedClinicId && requestedClinicId !== user.clinicId)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // This endpoint is only for the free plan. Paid plans are activated exclusively
    // by the verified Paymob callback after checking its HMAC signature.
    if (body?.planId !== "basic") {
      return NextResponse.json(
        { error: "Paid subscriptions must be activated through verified payment" },
        { status: 403 }
      );
    }

    const email = user.email.toLowerCase().trim();
    const clinicId = user.clinicId;
    const admin = getAdminClient();

    const { data: clinic, error: clinicError } = await admin
      .from("clinics")
      .select("id, status, admin_email")
      .eq("id", clinicId)
      .maybeSingle();

    if (clinicError || !clinic || clinic.status !== "active" || clinic.admin_email?.toLowerCase().trim() !== email) {
      return NextResponse.json({ error: "Clinic ownership could not be verified" }, { status: 403 });
    }

    const { data: existingSubscription, error: existingError } = await admin
      .from("subscriptions")
      .select("id, plan_name, status")
      .eq("clinic_id", clinicId)
      .eq("status", "active")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (existingError) {
      console.error("[Subscribe] Existing subscription lookup failed:", existingError);
      return NextResponse.json({ error: "Unable to verify subscription" }, { status: 500 });
    }

    if (existingSubscription) {
      if (existingSubscription.plan_name === "basic") {
        return NextResponse.json({
          success: true,
          clinicId,
          subscriptionId: existingSubscription.id,
          alreadyActive: true,
        });
      }
      return NextResponse.json(
        { error: "An active subscription already exists" },
        { status: 409 }
      );
    }

    const endDate = new Date();
    endDate.setMonth(endDate.getMonth() + 1);

    const { data: subscription, error: subscriptionError } = await admin
      .from("subscriptions")
      .insert({
        user_email: email,
        clinic_id: clinicId,
        plan_name: "basic",
        plan_price: 0,
        status: "active",
        start_date: new Date().toISOString(),
        end_date: endDate.toISOString(),
      })
      .select("id")
      .single();

    if (subscriptionError || !subscription) {
      console.error("[Subscribe] Free subscription creation failed:", subscriptionError);
      return NextResponse.json({ error: "Failed to create subscription" }, { status: 500 });
    }

    return NextResponse.json(
      { success: true, clinicId, subscriptionId: subscription.id },
      { headers: { "Cache-Control": "no-store, private" } }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    const status = /unauthorized/i.test(message) ? 401 : 403;
    return NextResponse.json(
      { error: status === 401 ? "Unauthorized" : "Forbidden" },
      { status, headers: { "Cache-Control": "no-store, private" } }
    );
  }
}
