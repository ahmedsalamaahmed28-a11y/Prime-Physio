import { NextRequest, NextResponse } from "next/server";
import { getAdminClient } from "@/lib/supabase";

export async function POST(req: NextRequest) {
  try {
    const { email, name } = await req.json();

    if (!email) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    const admin = getAdminClient();

    // Check if already provisioned
    const { data: existing } = await admin
      .from("staff")
      .select("clinic_id")
      .eq("email", email.toLowerCase().trim())
      .maybeSingle();

    if (existing?.clinic_id) {
      return NextResponse.json({ clinicId: existing.clinic_id });
    }

    // Create clinic
    const clinicId = crypto.randomUUID();
    const clinicName = name || email.split("@")[0];

    const { error: clinicError } = await admin.from("clinics").insert({
      id: clinicId,
      name: clinicName,
      email,
      is_active: true,
      created_at: new Date().toISOString(),
    });

    if (clinicError) {
      console.error("[AutoProvision] Failed to create clinic:", clinicError.message);
      return NextResponse.json({ error: "فشل إنشاء العيادة" }, { status: 500 });
    }

    // Create staff record (admin)
    const { error: staffError } = await admin.from("staff").insert({
      clinic_id: clinicId,
      name: clinicName,
      email,
      role: "admin",
      status: "نشط",
    });

    if (staffError) {
      try { await admin.from("clinics").delete().eq("id", clinicId); } catch {}
      console.error("[AutoProvision] Failed to create staff:", staffError.message);
      return NextResponse.json({ error: "فشل إنشاء بيانات الموظف" }, { status: 500 });
    }

    // Create default clinic_settings
    try {
      await admin.from("clinic_settings").upsert({
        clinic_id: clinicId,
        clinic_name: clinicName,
        phone: "",
      });
    } catch {}

    return NextResponse.json({ clinicId, clinicName });
  } catch (err) {
    console.error("[AutoProvision] Error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal server error" },
      { status: 500 }
    );
  }
}
