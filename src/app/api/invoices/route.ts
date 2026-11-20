import { NextRequest, NextResponse } from "next/server";
import { getClinicContext } from "@/lib/server/clinic-context";
import { hasStaffPermission } from "@/lib/server/staff-permissions";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(request: NextRequest) {
  const auth = await getClinicContext(request);
  if ("response" in auth) return auth.response;

  if (!hasStaffPermission(auth.staff, "view_invoices")) {
    return NextResponse.json({ error: "ليس لديك صلاحية مشاهدة الفواتير" }, { status: 403 });
  }

  try {
    const { data, error } = await auth.admin
      .from("invoices")
      .select("id,clinic_id,patient_id,patient_name,description,amount,date,status,payment_method")
      .eq("clinic_id", auth.clinicId)
      .order("date", { ascending: false });

    if (error) throw error;
    return NextResponse.json({ invoices: data || [] }, {
      headers: { "Cache-Control": "no-store, private" },
    });
  } catch (error) {
    console.error("[Invoices API] List failed:", error);
    return NextResponse.json({ error: "تعذر تحميل الفواتير" }, { status: 500 });
  }
}
