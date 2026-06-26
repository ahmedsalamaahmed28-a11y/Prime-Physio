import { NextRequest, NextResponse } from "next/server";
import { getAdminClient } from "@/lib/supabase";
import { requireAuth } from "../../utils/auth";

export async function GET(req: NextRequest) {
  try {
    const user = await requireAuth(req);

    const admin = getAdminClient();
    const { data: pa } = await admin
      .from("platform_admins")
      .select("email")
      .eq("email", user.email)
      .limit(1)
      .maybeSingle();

    if (!pa) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { data: clinics, error } = await admin
      .from("clinics")
      .select("id, name, phone, email, is_active, created_at")
      .order("created_at", { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Enrich with patient counts and subscription info
    let totalPatients = 0;
    let totalStaff = 0;

    const enriched = await Promise.all(
      (clinics || []).map(async (clinic) => {
        const { count: patientCount } = await admin
          .from("patients")
          .select("*", { count: "exact", head: true })
          .eq("clinic_id", clinic.id);
          
        const { count: staffCount } = await admin
          .from("staff")
          .select("*", { count: "exact", head: true })
          .eq("clinic_id", clinic.id);

        if (patientCount) totalPatients += patientCount;
        if (staffCount) totalStaff += staffCount;

        const { data: sub } = await admin
          .from("subscriptions")
          .select("plan_name, status, end_date")
          .eq("clinic_id", clinic.id)
          .eq("status", "active")
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        return { 
          ...clinic, 
          patientCount: patientCount ?? 0, 
          staffCount: staffCount ?? 0, 
          subscription: sub || null 
        };
      })
    );

    return NextResponse.json({ 
      stats: {
        totalClinics: clinics?.length || 0,
        totalStaff,
        totalPatients
      },
      clinics: enriched 
    });
  } catch (err: any) {
    const status = err.message === "Unauthorized" ? 401 : err.message === "Forbidden" ? 403 : 500;
    return NextResponse.json({ error: err.message }, { status });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const user = await requireAuth(req);

    const admin = getAdminClient();
    const { data: pa } = await admin
      .from("platform_admins")
      .select("email")
      .eq("email", user.email)
      .limit(1)
      .maybeSingle();

    if (!pa) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { clinicId, is_active } = await req.json();
    if (!clinicId) {
      return NextResponse.json({ error: "Missing clinicId" }, { status: 400 });
    }

    const { error } = await admin
      .from("clinics")
      .update({ is_active })
      .eq("id", clinicId);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    const status = err.message === "Unauthorized" ? 401 : err.message === "Forbidden" ? 403 : 500;
    return NextResponse.json({ error: err.message }, { status });
  }
}
