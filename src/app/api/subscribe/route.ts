import { NextRequest, NextResponse } from "next/server";
import { getAdminClient } from "@/lib/supabase";

export async function POST(req: NextRequest) {
  try {
    const { email, name, planId, clinicId: providedClinicId } = await req.json();
    if (!email || !planId) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const admin = getAdminClient();
    const cleanEmail = email.toLowerCase().trim();

    const plans: Record<string, { price: number }> = {
      basic: { price: 500 },
      silver: { price: 1000 },
      gold: { price: 1500 },
    };
    const plan = plans[planId];
    if (!plan) {
      return NextResponse.json({ error: "Invalid plan" }, { status: 400 });
    }

    let clinicId = providedClinicId;

    if (!clinicId) {
      const { data: existingClinic } = await admin
        .from("clinics")
        .select("id")
        .eq("admin_email", cleanEmail)
        .maybeSingle();
      if (existingClinic) {
        clinicId = existingClinic.id;
      }
    }

    if (!clinicId) {
      clinicId = crypto.randomUUID();
      const clinicName = name || cleanEmail.split("@")[0];

      const { error: clinicErr } = await admin.from("clinics").insert({
        id: clinicId, name: clinicName, admin_email: cleanEmail, status: "active",
      });
      if (clinicErr) {
        return NextResponse.json({ error: clinicErr.message }, { status: 500 });
      }

      const { error: staffErr } = await admin.from("staff").insert({
        clinic_id: clinicId, name: clinicName, email: cleanEmail, role: "admin", status: "نشط",
      });
      if (staffErr) {
        await admin.from("clinics").delete().eq("id", clinicId);
        return NextResponse.json({ error: staffErr.message }, { status: 500 });
      }

      try {
        await admin.from("clinic_settings").upsert({
          clinic_id: clinicId, clinic_name: clinicName,
        }, { onConflict: "clinic_id" });
      } catch {}
    }

    const { data: existingSub } = await admin
      .from("subscriptions")
      .select("id")
      .eq("clinic_id", clinicId)
      .eq("plan_name", planId)
      .eq("status", "active")
      .maybeSingle();

    if (!existingSub) {
      const { error: subErr } = await admin.from("subscriptions").insert({
        clinic_id: clinicId, user_email: cleanEmail, plan_name: planId,
        plan_price: plan.price, status: "active", is_trial: false,
      });
      if (subErr) {
        console.warn("[Subscribe] Subscription error:", subErr);
      }
    }

    return NextResponse.json({ clinicId });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
