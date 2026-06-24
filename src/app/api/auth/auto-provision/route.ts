import { NextRequest, NextResponse } from "next/server";
import { getAdminClient } from "@/lib/supabase";

export async function POST(req: NextRequest) {
  try {
    const { email: rawEmail, name } = await req.json();
    if (!rawEmail) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }
    const email = rawEmail.toLowerCase().trim();
    const clinicName = name || email.split("@")[0];

    const admin = getAdminClient();

    // 1. Check if user is already in staff
    const { data: existingStaff } = await admin
      .from("staff")
      .select("clinic_id")
      .eq("email", email)
      .maybeSingle();

    if (existingStaff?.clinic_id) {
      console.log(`[AutoProvision] User already exists — clinicId: ${existingStaff.clinic_id}`);
      return NextResponse.json({ clinicId: existingStaff.clinic_id, clinicName });
    }

    // 2. Create clinic
    const clinicId = crypto.randomUUID();
    const { error: clinicError } = await admin.from("clinics").insert({
      id: clinicId,
      name: clinicName,
      admin_email: email,
      status: "active",
    });

    if (clinicError) {
      console.error("[AutoProvision] Clinic creation failed:", clinicError);
      return NextResponse.json({ error: "فشل إنشاء العيادة" }, { status: 500 });
    }

    // 3. Create staff record
    const { error: staffError } = await admin.from("staff").insert({
      clinic_id: clinicId,
      name: clinicName,
      email,
      role: "admin",
      status: "نشط",
    });

    if (staffError) {
      console.error("[AutoProvision] Staff creation failed:", staffError);
      try { await admin.from("clinics").delete().eq("id", clinicId); } catch {}
      return NextResponse.json({ error: "فشل إنشاء الموظف" }, { status: 500 });
    }

    // 4. Create default clinic_settings
    try {
      await admin.from("clinic_settings").upsert({
        clinic_id: clinicId,
        clinic_name: clinicName,
      });
    } catch (e) {
      console.error("[AutoProvision] Settings creation failed (ignored):", e);
    }

    console.log(`[AutoProvision] ✅ Created new clinic — clinicId: ${clinicId}`);

    return NextResponse.json({ clinicId, clinicName });
  } catch (err) {
    console.error("[AutoProvision] Unhandled error:", err);
    const msg = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
