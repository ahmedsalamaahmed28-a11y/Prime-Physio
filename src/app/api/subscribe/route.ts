import { NextRequest, NextResponse } from "next/server";
import { getAdminClient } from "@/lib/supabase";

export async function POST(req: NextRequest) {
  try {
    const { email, name, planId, paymentData } = await req.json();
    if (!email || !planId) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const admin = getAdminClient();
    const cleanEmail = email.toLowerCase().trim();

    // Check if clinic already exists
    const { data: existingClinic } = await admin
      .from("clinics")
      .select("id")
      .eq("admin_email", cleanEmail)
      .maybeSingle();

    if (existingClinic) {
      return NextResponse.json({ clinicId: existingClinic.id });
    }

    const clinicId = crypto.randomUUID();
    const clinicName = name || cleanEmail.split("@")[0];

    // Create clinic
    const { error: clinicErr } = await admin.from("clinics").insert({
      id: clinicId, name: clinicName, admin_email: cleanEmail, status: "active",
    });
    if (clinicErr) {
      return NextResponse.json({ error: clinicErr.message }, { status: 500 });
    }

    // Create staff (admin)
    const { error: staffErr } = await admin.from("staff").insert({
      clinic_id: clinicId, name: clinicName, email: cleanEmail, role: "admin", status: "نشط",
    });
    if (staffErr) {
      await admin.from("clinics").delete().eq("id", clinicId);
      return NextResponse.json({ error: staffErr.message }, { status: 500 });
    }

    // Create clinic_settings
    try {
      await admin.from("clinic_settings").upsert({
        clinic_id: clinicId, clinic_name: clinicName,
      }, { onConflict: "clinic_id" });
    } catch {}

    // Create subscription
    const plans: Record<string, { price: number }> = {
      basic: { price: 500 },
      silver: { price: 1000 },
      gold: { price: 1500 },
    };
    const plan = plans[planId];
    if (!plan) {
      await admin.from("clinics").delete().eq("id", clinicId);
      await admin.from("staff").delete().eq("clinic_id", clinicId);
      return NextResponse.json({ error: "Invalid plan" }, { status: 400 });
    }

    const { error: subErr } = await admin.from("subscriptions").insert({
      clinic_id: clinicId, user_email: cleanEmail, plan_name: planId,
      plan_price: plan.price, status: "active", is_trial: false,
    });
    if (subErr) {
      console.warn("[Subscribe] Subscription error:", subErr);
    }

    return NextResponse.json({ clinicId, clinicName });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
