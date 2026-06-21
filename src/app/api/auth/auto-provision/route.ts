import { NextRequest, NextResponse } from "next/server";
import { getAdminClient } from "@/lib/supabase";

export async function POST(req: NextRequest) {
  try {
    const { email, name } = await req.json();
    if (!email) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    const admin = getAdminClient();

    // Check if already provisioned (staff record exists)
    const { data: existing, error: lookupErr } = await admin
      .from("staff")
      .select("clinic_id")
      .eq("email", email.toLowerCase().trim())
      .maybeSingle();
    if (lookupErr) {
      console.error("[AutoProvision] Staff lookup error:", lookupErr.message);
      return NextResponse.json({ error: lookupErr.message }, { status: 500 });
    }
    if (existing?.clinic_id) {
      return NextResponse.json({ clinicId: existing.clinic_id });
    }

    // Check if a clinic already exists for this email (from a previous partial attempt)
    let clinicId = crypto.randomUUID();
    const clinicName = name || email.split("@")[0];
    const { data: existingClinic } = await admin
      .from("clinics")
      .select("id")
      .eq("admin_email", email.toLowerCase().trim())
      .maybeSingle();
    if (existingClinic?.id) {
      clinicId = existingClinic.id;
    } else {
      const { error: clinicError } = await admin.from("clinics").insert({
        id: clinicId, name: clinicName, admin_email: email, status: "active",
      });
      if (clinicError) {
        console.error("[AutoProvision] Clinic insert error:", clinicError.message);
        return NextResponse.json({ error: clinicError.message }, { status: 500 });
      }
    }

    // Create or update staff record (admin)
    const { error: staffError } = await admin.from("staff").upsert({
      clinic_id: clinicId, name: clinicName, email, role: "admin", status: "نشط",
    }, { onConflict: "email" });
    if (staffError) {
      try { await admin.from("clinics").delete().eq("id", clinicId); } catch {}
      console.error("[AutoProvision] Staff insert error:", staffError.message);
      return NextResponse.json({ error: staffError.message }, { status: 500 });
    }

    // Create default clinic_settings
    try {
      await admin.from("clinic_settings").upsert({
        clinic_id: clinicId, clinic_name: clinicName, phone: "",
      }, { onConflict: "clinic_id" });
    } catch {}

    // Check if this email already used a trial before (prevent duplicate)
    let alreadyUsedTrial = false;
    try {
      const { data: prevTrials } = await admin
        .from("subscriptions")
        .select("id")
        .eq("user_email", email.toLowerCase().trim())
        .eq("is_trial", true)
        .limit(1);
      if (prevTrials && prevTrials.length > 0) alreadyUsedTrial = true;
    } catch {}

    if (alreadyUsedTrial) {
      // Create basic plan instead (no free trial for returning users)
      try {
        await admin.from("subscriptions").insert({
          user_email: email,
          clinic_id: clinicId,
          plan_name: "basic",
          plan_price: 0,
          status: "active",
          start_date: new Date().toISOString(),
          end_date: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
          is_trial: false,
        });
      } catch (e) {
        console.warn("[AutoProvision] Failed to create basic subscription:", e);
      }
    } else {
      // Create 7-day free Gold trial subscription
      try {
        const trialEnd = new Date();
        trialEnd.setDate(trialEnd.getDate() + 7);
        await admin.from("subscriptions").insert({
          user_email: email,
          clinic_id: clinicId,
          plan_name: "gold",
          plan_price: 0,
          status: "active",
          start_date: new Date().toISOString(),
          end_date: trialEnd.toISOString(),
          is_trial: true,
        });
      } catch (e) {
        console.warn("[AutoProvision] Failed to create trial subscription:", e);
      }
    }

    return NextResponse.json({ clinicId, clinicName });
  } catch (err) {
    console.error("[AutoProvision] Unhandled error:", err);
    const msg = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
