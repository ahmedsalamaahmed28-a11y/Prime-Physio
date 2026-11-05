import { NextRequest, NextResponse } from "next/server";
import { getAdminClient } from "@/lib/supabase";
import { requireRole } from "../utils/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function POST(req: NextRequest) {
  try {
    // Only clinic admins can trigger a backup for their clinic
    const user = await requireRole(req, ["admin"]);
    
    if (!user.clinicId) {
      return NextResponse.json({ error: "Unauthorized. Clinic Admin access required." }, { status: 403 });
    }

    const admin = getAdminClient();
    
    // Fetch Clinic Settings
    const { data: settings } = await admin
      .from("clinic_settings")
      .select("*")
      .eq("clinic_id", user.clinicId)
      .single();

    // Fetch Patients
    const { data: patients } = await admin
      .from("patients")
      .select("*")
      .eq("clinic_id", user.clinicId);

    // Fetch Sessions
    const { data: sessions } = await admin
      .from("sessions")
      .select("*")
      .eq("clinic_id", user.clinicId);

    const backupData = {
      timestamp: new Date().toISOString(),
      clinicId: user.clinicId,
      settings: settings || {},
      patients: patients || [],
      sessions: sessions || []
    };

    // Return as a JSON file download
    const jsonString = JSON.stringify(backupData, null, 2);
    
    return new NextResponse(jsonString, {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Content-Disposition": `attachment; filename="backup_${user.clinicId}_${new Date().toISOString().split('T')[0]}.json"`,
        "Cache-Control": "no-store, private",
        "Pragma": "no-cache",
        "X-Content-Type-Options": "nosniff"
      }
    });

  } catch (err: any) {
    const status = err.message === "Unauthorized" ? 401 : err.message === "Forbidden" ? 403 : 500;
    return NextResponse.json({ error: err.message }, { status });
  }
}
