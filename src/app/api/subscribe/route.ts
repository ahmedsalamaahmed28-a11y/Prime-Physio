import { NextRequest, NextResponse } from "next/server";
import { getAdminClient } from "@/lib/supabase";

export async function POST(req: NextRequest) {
  try {
    const { email, name, planId, clinicId } = await req.json();

    if (!email || !name || !planId || !clinicId) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const admin = getAdminClient();

    // Check if clinic exists
    const { data: clinic, error: clinicError } = await admin
      .from("clinics")
      .select("id, name, status")
      .eq("id", clinicId)
      .single();

    if (clinicError || !clinic) {
      return NextResponse.json({ error: "Clinic not found" }, { status: 404 });
    }

    if (clinic.status !== "active") {
      return NextResponse.json({ error: "Clinic is not active" }, { status: 400 });
    }

    // Get staff record for this email
    const { data: staff, error: staffError } = await admin
      .from("staff")
      .select("id, role")
      .eq("email", email.toLowerCase().trim())
      .eq("clinic_id", clinicId)
      .single();

    if (staffError || !staff) {
      return NextResponse.json({ error: "Staff record not found for this clinic" }, { status: 404 });
    }

    // Create subscription based on plan
    const endDate = new Date();
    endDate.setMonth(endDate.getMonth() + 1);

    const subscriptionData: any = {
      user_email: email.toLowerCase().trim(),
      plan_name: planId,
      plan_price: planId === "basic" ? 0 : (planId === "silver" ? 1000 : 1500),
      status: "active",
      start_date: new Date().toISOString(),
      end_date: endDate.toISOString(),
    };

    const { data: subscription, error: subscriptionError } = await admin
      .from("subscriptions")
      .insert(subscriptionData)
      .select("id")
      .single();

    if (subscriptionError || !subscription) {
      return NextResponse.json({ error: "Failed to create subscription" }, { status: 500 });
    }

    // Update clinic_settings with subscription info
    await admin
      .from("clinic_settings")
      .update({
        subscription_id: subscription.id,
        subscription_status: "active",
        subscription_plan: planId,
      })
      .eq("clinic_id", clinicId);

    return NextResponse.json({
      success: true,
      clinicId,
      subscriptionId: subscription.id,
    });
  } catch (err) {
    console.error("[Subscribe] Error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal server error" },
      { status: 500 }
    );
  }
}
