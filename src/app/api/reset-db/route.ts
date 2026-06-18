import { NextRequest, NextResponse } from "next/server";
import { getAdminClient } from "@/lib/supabase";

const SUPER_ADMIN_EMAIL = "ahmedsalamaahmed21@gmail.com";

export async function POST(req: NextRequest) {
  const { secret } = await req.json();
  if (secret !== process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = getAdminClient();

  // Find super admin's clinic IDs
  const { data: superStaff } = await admin
    .from("staff")
    .select("clinic_id")
    .eq("email", SUPER_ADMIN_EMAIL);

  const superClinicIds = (superStaff || []).map((s: any) => s.clinic_id);

  // Delete in FK-safe order
  await admin.from("audit_logs").delete().neq("id", "none"); // all
  await admin.from("appointments").delete().neq("id", "none");
  await admin.from("invoices").delete().neq("id", "none");
  await admin.from("patients").delete().neq("id", "none");
  await admin.from("treatment_templates").delete().neq("id", "none");
  await admin.from("app_key_values").delete().neq("id", "none");
  await admin.from("clinic_settings").delete().neq("id", "none");

  // Delete staff except super admin
  await admin.from("staff").delete().neq("email", SUPER_ADMIN_EMAIL);

  // Delete clinics except super admin's
  if (superClinicIds.length > 0) {
    await admin.from("clinics").delete().not("id", "in", `(${superClinicIds.join(",")})`);
  } else {
    await admin.from("clinics").delete().neq("id", "none");
  }

  // Delete auth_accounts except super admin
  await admin.from("auth_accounts").delete().neq("email", SUPER_ADMIN_EMAIL);

  return NextResponse.json({ success: true, message: "تم مسح جميع البيانات بنجاح" });
}
