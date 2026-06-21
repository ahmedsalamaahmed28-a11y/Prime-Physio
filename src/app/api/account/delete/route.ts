import { NextRequest, NextResponse } from "next/server";
import { getAdminClient } from "@/lib/supabase";
import { requireAuthOnly, requireRole } from "../../utils/auth";

export async function POST(req: NextRequest) {
  try {
    let user;
    let clinicId: string | undefined;
    let roleKey: string | undefined;
    const admin = getAdminClient();

    // Try to get role and clinic (works for users subscribed to a clinic)
    try {
      const roleResult = await requireRole(req, ["admin", "doctor", "receptionist"]);
      user = roleResult;
      clinicId = roleResult.clinicId;
      roleKey = roleResult.roleKey;
    } catch {
      // Fall back to just auth (for users who signed up but haven't subscribed yet)
      user = await requireAuthOnly(req);
    }

    if (clinicId) {
      // Delete all clinic-related data
      await admin.from("patients").delete().eq("clinic_id", clinicId);
      await admin.from("sessions").delete().eq("clinic_id", clinicId);
      await admin.from("appointments").delete().eq("clinic_id", clinicId);
      await admin.from("invoices").delete().eq("clinic_id", clinicId);
      await admin.from("branches").delete().eq("clinic_id", clinicId);
      await admin.from("clinic_settings").delete().eq("clinic_id", clinicId);
      await admin.from("subscriptions").delete().eq("clinic_id", clinicId);
      await admin.from("staff").delete().eq("clinic_id", clinicId);
      await admin.from("clinics").delete().eq("id", clinicId);
    }

    // Delete from auth_accounts table
    await admin.from("auth_accounts").delete().eq("email", user.email);

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("Account deletion error:", err);
    const status = err.message === "Unauthorized" ? 401 : err.message === "Forbidden" ? 403 : 500;
    return NextResponse.json({ error: err.message }, { status });
  }
}