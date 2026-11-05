import { NextRequest, NextResponse } from "next/server";
import { getAdminClient } from "@/lib/supabase-admin";
import { requireAuthOnly, requireRole } from "../../utils/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function POST(req: NextRequest) {
  try {
    const user = await requireAuthOnly(req);
    const email = user.email.toLowerCase().trim();
    const admin = getAdminClient();

    const { data: staff, error: staffLookupError } = await admin
      .from("staff")
      .select("clinic_id")
      .eq("email", email)
      .limit(1)
      .maybeSingle();

    if (staffLookupError) {
      console.error("[AccountDelete] Staff lookup failed:", staffLookupError);
      return NextResponse.json({ error: "Unable to verify account ownership" }, { status: 500 });
    }

    if (staff?.clinic_id) {
      try {
        await requireRole(req, ["admin"]);
      } catch {
        return NextResponse.json(
          { error: "Only the clinic administrator can delete clinic data" },
          { status: 403, headers: { "Cache-Control": "no-store, private" } }
        );
      }

      const clinicId = staff.clinic_id;
      const { data: clinic, error: clinicError } = await admin
        .from("clinics")
        .select("id")
        .eq("id", clinicId)
        .eq("admin_email", email)
        .limit(1)
        .maybeSingle();

      if (clinicError || !clinic) {
        return NextResponse.json(
          { error: "Clinic ownership could not be verified" },
          { status: 403, headers: { "Cache-Control": "no-store, private" } }
        );
      }

      const deleteClinicRows = [
        () => admin.from("patients").delete().eq("clinic_id", clinicId),
        () => admin.from("sessions").delete().eq("clinic_id", clinicId),
        () => admin.from("appointments").delete().eq("clinic_id", clinicId),
        () => admin.from("invoices").delete().eq("clinic_id", clinicId),
        () => admin.from("branches").delete().eq("clinic_id", clinicId),
        () => admin.from("clinic_settings").delete().eq("clinic_id", clinicId),
        () => admin.from("subscriptions").delete().eq("clinic_id", clinicId),
        () => admin.from("staff").delete().eq("clinic_id", clinicId),
      ];

      for (const deleteRows of deleteClinicRows) {
        const { error: deletionError } = await deleteRows();
        if (deletionError) {
          console.error("[AccountDelete] Clinic data deletion failed:", deletionError);
          return NextResponse.json(
            { error: "Clinic deletion could not be completed safely" },
            { status: 500 }
          );
        }
      }

      const { error: clinicDeleteError } = await admin
        .from("clinics")
        .delete()
        .eq("id", clinicId)
        .eq("admin_email", email);

      if (clinicDeleteError) {
        console.error("[AccountDelete] Clinic record deletion failed:", clinicDeleteError);
        return NextResponse.json({ error: "Clinic deletion failed" }, { status: 500 });
      }
    }

    const { error: accountDeleteError } = await admin
      .from("auth_accounts")
      .delete()
      .eq("email", email);

    if (accountDeleteError) {
      console.error("[AccountDelete] Account record deletion failed:", accountDeleteError);
      return NextResponse.json({ error: "Account deletion failed" }, { status: 500 });
    }

    return NextResponse.json({ success: true }, {
      headers: { "Cache-Control": "no-store, private" },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    const status = /unauthorized/i.test(message) ? 401 : 500;
    return NextResponse.json(
      { error: status === 401 ? "Unauthorized" : "Account deletion failed" },
      { status, headers: { "Cache-Control": "no-store, private" } }
    );
  }
}
