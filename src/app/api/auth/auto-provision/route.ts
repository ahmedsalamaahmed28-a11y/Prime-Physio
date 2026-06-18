import { NextRequest, NextResponse } from "next/server";
import { getAdminClient } from "@/lib/supabase";
import { supabase } from "@/lib/supabase";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const { email, name } = body;

    if (!email) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    const normalizedEmail = email.toLowerCase().trim();
    const admin = getAdminClient();

    // Check if service role key is set
    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
      console.error("[AutoProvision] MISSING SUPABASE_SERVICE_ROLE_KEY env var");
      return NextResponse.json(
        { error: "Service role key not configured", detail: "SUPABASE_SERVICE_ROLE_KEY is missing" },
        { status: 500 }
      );
    }

    // Check if already provisioned (staff record exists)
    const { data: existing, error: lookupError } = await admin
      .from("staff")
      .select("clinic_id")
      .eq("email", normalizedEmail)
      .maybeSingle();

    if (lookupError) {
      console.error("[AutoProvision] Staff lookup error:", JSON.stringify(lookupError));
      return NextResponse.json(
        { error: "Staff lookup failed", detail: lookupError.message },
        { status: 500 }
      );
    }

    if (existing?.clinic_id) {
      console.log("[AutoProvision] Staff already exists for", normalizedEmail, "clinic:", existing.clinic_id);
      return NextResponse.json({ clinicId: existing.clinic_id });
    }

    // Guard: check if a clinic already exists for this admin_email
    const { data: existingClinic } = await admin
      .from("clinics")
      .select("id")
      .eq("admin_email", normalizedEmail)
      .maybeSingle();

    let clinicId = existingClinic?.id || crypto.randomUUID();
    const clinicName = name || normalizedEmail.split("@")[0];

    if (!existingClinic) {
      const { error: clinicError } = await admin.from("clinics").insert({
        id: clinicId,
        name: clinicName,
        admin_email: normalizedEmail,
        status: "active",
      });

      if (clinicError) {
        console.error("[AutoProvision] Failed to create clinic:", JSON.stringify(clinicError));
        return NextResponse.json(
          { error: "فشل إنشاء العيادة", detail: clinicError.message },
          { status: 500 }
        );
      }
      console.log("[AutoProvision] Created clinic", clinicId, "for", normalizedEmail);
    } else {
      console.log("[AutoProvision] Clinic already exists for", normalizedEmail, "id:", clinicId);
    }

    // Create staff record (admin)
    const staffRole = "admin";
    const { error: staffError } = await admin.from("staff").insert({
      clinic_id: clinicId,
      name: clinicName || normalizedEmail,
      email: normalizedEmail,
      role: staffRole,
      status: "نشط",
    });

    if (staffError) {
      console.error("[AutoProvision] Failed to create staff:", JSON.stringify(staffError));
      // Rollback clinic only if we created it fresh
      if (!existingClinic) {
        try { await admin.from("clinics").delete().eq("id", clinicId); } catch {}
      }
      return NextResponse.json(
        { error: "فشل إنشاء بيانات الموظف", detail: staffError.message },
        { status: 500 }
      );
    }

    // Create default clinic_settings (best-effort)
    try {
      await admin.from("clinic_settings").upsert({
        clinic_id: clinicId,
        clinic_name: clinicName,
        phone: "",
      });
    } catch (settingsErr) {
      console.warn("[AutoProvision] Clinic settings upsert failed (non-fatal):", settingsErr);
    }

    console.log("[AutoProvision] Success for", normalizedEmail, "clinic:", clinicId);
    return NextResponse.json({ clinicId, clinicName });
  } catch (err) {
    console.error("[AutoProvision] Unhandled error:", err);
    return NextResponse.json(
      {
        error: err instanceof Error ? err.message : "Internal server error",
        detail: err instanceof Error ? err.stack : String(err),
      },
      { status: 500 }
    );
  }
}
