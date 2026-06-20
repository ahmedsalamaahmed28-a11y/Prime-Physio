import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const { email, name } = await req.json();
    if (!email) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    const { createClient } = await import("@supabase/supabase-js");
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

    if (!serviceKey) {
      return NextResponse.json({ error: "Missing SUPABASE_SERVICE_ROLE_KEY env var" }, { status: 500 });
    }
    if (!supabaseUrl) {
      return NextResponse.json({ error: "Missing NEXT_PUBLIC_SUPABASE_URL env var" }, { status: 500 });
    }

    const admin = createClient(supabaseUrl, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } });

    // Check if already provisioned
    const { data: existing, error: lookupErr } = await admin
      .from("staff")
      .select("clinic_id")
      .eq("email", email.toLowerCase().trim())
      .maybeSingle();
    if (lookupErr) {
      return NextResponse.json({ error: "Staff lookup: " + lookupErr.message }, { status: 500 });
    }
    if (existing?.clinic_id) {
      return NextResponse.json({ clinicId: existing.clinic_id });
    }

    // Create clinic
    const clinicId = crypto.randomUUID();
    const clinicName = name || email.split("@")[0];
    const { error: clinicError } = await admin.from("clinics").insert({
      id: clinicId, name: clinicName, admin_email: email, status: "active",
    });
    if (clinicError) {
      return NextResponse.json({ error: "Clinic insert: " + clinicError.message, details: clinicError }, { status: 500 });
    }

    // Create staff record (admin)
    const { error: staffError } = await admin.from("staff").insert({
      clinic_id: clinicId, name: clinicName, email, role: "admin", status: "نشط",
    });
    if (staffError) {
      try { await admin.from("clinics").delete().eq("id", clinicId); } catch {}
      return NextResponse.json({ error: "Staff insert: " + staffError.message, details: staffError }, { status: 500 });
    }

    // Create default clinic_settings
    try {
      await admin.from("clinic_settings").upsert({
        clinic_id: clinicId, clinic_name: clinicName, phone: "",
      }, { onConflict: "clinic_id" });
    } catch {}

    return NextResponse.json({ clinicId, clinicName });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
