import { NextRequest, NextResponse } from "next/server";
import { getAdminClient } from "@/lib/supabase";
import { requireAuthOnly, requireRole } from "../../utils/auth";

export async function POST(req: NextRequest) {
  try {
    const user = await requireAuthOnly(req);
    const admin = getAdminClient();
    const { data: staff, error: staffError } = await admin.from("staff")
      .select("clinic_id,role").eq("email", user.email).limit(1).maybeSingle();
    if (staffError) return NextResponse.json({ error: "Unable to verify account ownership" }, { status: 500 });

    if (staff?.clinic_id) {
      const roleResult = await requireRole(req, ["admin"]);
      if (roleResult.clinicId !== staff.clinic_id) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

      const clinicId = roleResult.clinicId;
      // Only the owning clinic administrator may initiate clinic-wide deletion.
      const tables = ["patients", "sessions", "appointments", "invoices", "branches", "clinic_settings", "subscriptions", "staff"];
      for (const table of tables) {
        const { error } = await admin.from(table).delete().eq("clinic_id", clinicId);
        if (error) {
          console.error("[AccountDelete] Failed deleting clinic table:", table, error.message);
          return NextResponse.json({ error: "تعذر إكمال حذف بيانات العيادة؛ لم يتم حذف الحساب" }, { status: 500 });
        }
      }
      const { error: clinicDeleteError } = await admin.from("clinics").delete().eq("id", clinicId);
      if (clinicDeleteError) return NextResponse.json({ error: "تعذر حذف العيادة" }, { status: 500 });
    } else if (staff) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { error: accountError } = await admin.from("auth_accounts").delete().eq("email", user.email);
    if (accountError) return NextResponse.json({ error: "تعذر حذف الحساب" }, { status: 500 });
    return NextResponse.json({ success: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "";
    const status = message === "Unauthorized" ? 401 : /forbidden|insufficient|membership/i.test(message) ? 403 : 500;
    return NextResponse.json({ error: status === 401 ? "Unauthorized" : status === 403 ? "Forbidden" : "Internal server error" }, { status });
  }
}
