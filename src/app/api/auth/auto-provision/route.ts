import { NextRequest, NextResponse } from "next/server";
import { getAdminClient } from "@/lib/supabase";

export async function POST(req: NextRequest) {
  try {
    const { email: rawEmail, name } = await req.json();
    if (!rawEmail) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }
    const email = rawEmail.toLowerCase().trim();

    const admin = getAdminClient();

    // Check if already provisioned (staff record exists)
    const { data: existing, error: lookupErr } = await admin
      .from("staff")
      .select("clinic_id")
      .eq("email", email)
      .maybeSingle();
    if (lookupErr) {
      console.error("[AutoProvision] Staff lookup error:", lookupErr.message);
      return NextResponse.json({ error: lookupErr.message }, { status: 500 });
    }
    if (existing) {
      return NextResponse.json({ clinicId: existing.clinic_id });
    }

    // Check if a clinic already exists for this email (from a previous partial attempt)
    let clinicId = crypto.randomUUID();
    const clinicName = name || email.split("@")[0];
    const { data: existingClinic } = await admin
      .from("clinics")
      .select("id")
      .eq("admin_email", email)
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

    return NextResponse.json({ clinicId, clinicName });
  } catch (err) {
    console.error("[AutoProvision] Unhandled error:", err);
    const msg = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
