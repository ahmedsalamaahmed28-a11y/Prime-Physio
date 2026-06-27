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

    // 1. Fetch system-wide stats
    const { count: totalClinics } = await admin.from("clinics").select("*", { count: "exact", head: true });
    const { count: totalStaff } = await admin.from("staff").select("*", { count: "exact", head: true });
    const { count: totalPatients } = await admin.from("patients").select("*", { count: "exact", head: true });
    const { count: totalSessions } = await admin.from("sessions").select("*", { count: "exact", head: true });
    const { count: totalAppointments } = await admin.from("appointments").select("*", { count: "exact", head: true });
    
    const { data: subscriptions } = await admin.from("subscriptions").select("plan_price, status");
    let totalRevenue = 0;
    if (subscriptions) {
      totalRevenue = subscriptions.reduce((sum, sub) => sum + (sub.plan_price || 0), 0);
    }

    // 2. Fetch Clinics details
    const { data: clinicsRaw } = await admin
      .from("clinics")
      .select("id, name, phone, email, is_active, created_at")
      .order("created_at", { ascending: false });

    const clinics = await Promise.all(
      (clinicsRaw || []).map(async (clinic) => {
        const { count: patientCount } = await admin
          .from("patients")
          .select("*", { count: "exact", head: true })
          .eq("clinic_id", clinic.id);
          
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
          subscription: sub || null 
        };
      })
    );

    // 3. Fetch recent Audit Logs
    const { data: recentLogs } = await admin
      .from("audit_logs")
      .select("id, action, entity, details, created_at, user_email")
      .order("created_at", { ascending: false })
      .limit(50);

    return NextResponse.json({ 
      stats: {
        totalClinics: totalClinics || 0,
        totalStaff: totalStaff || 0,
        totalPatients: totalPatients || 0,
        totalSessions: totalSessions || 0,
        totalAppointments: totalAppointments || 0,
        totalRevenue: totalRevenue || 0,
      },
      clinics,
      subscriptions: subscriptions || [],
      logs: recentLogs || []
    });
  } catch (err: any) {
    const status = err.message === "Unauthorized" ? 401 : err.message === "Forbidden" ? 403 : 500;
    return NextResponse.json({ error: err.message }, { status });
  }
}
