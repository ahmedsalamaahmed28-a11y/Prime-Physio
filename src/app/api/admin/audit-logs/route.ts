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

    const { searchParams } = new URL(req.url);
    const limit = parseInt(searchParams.get("limit") || "100", 10);
    const filter = searchParams.get("filter") || "all";

    let query = admin
      .from("audit_logs")
      .select("id, action, entity, details, created_at, user_email, user_name, clinic_id")
      .order("created_at", { ascending: false })
      .limit(limit);

    if (filter !== "all") {
      query = query.ilike("action", `%${filter}%`);
    }

    const { data: logs, error } = await query;

    if (error) {
      console.error("Error fetching audit logs", error);
      return NextResponse.json({ error: "Failed to load logs" }, { status: 500 });
    }

    // Try to get clinic names if clinic_id exists
    const clinicIds = Array.from(new Set(logs?.filter(l => l.clinic_id).map(l => l.clinic_id) || []));
    let clinicsMap: Record<string, string> = {};
    
    if (clinicIds.length > 0) {
      const { data: clinics } = await admin
        .from("clinics")
        .select("id, name")
        .in("id", clinicIds);
        
      if (clinics) {
        clinics.forEach(c => {
          clinicsMap[c.id] = c.name;
        });
      }
    }

    const enrichedLogs = logs?.map(log => ({
      ...log,
      clinic_name: log.clinic_id ? clinicsMap[log.clinic_id] || "Unknown Clinic" : "System"
    }));

    return NextResponse.json({ logs: enrichedLogs || [] });
  } catch (error: any) {
    console.error("Audit Logs API Error", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
