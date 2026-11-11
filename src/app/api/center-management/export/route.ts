import { NextRequest, NextResponse } from "next/server";
import { getAdminClient } from "@/lib/supabase-admin";
import { requireAuthOnly } from "../../utils/auth";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(req: NextRequest) {
  try {
    const session = await requireAuthOnly(req);
    const clinicId = req.nextUrl.searchParams.get("clinicId") || "";
    if (!clinicId) return NextResponse.json({ error: "معرّف المركز مطلوب." }, { status: 400 });

    const admin = getAdminClient();
    const { data: owner, error: ownerError } = await admin
      .from("clinic_owners").select("clinic_id")
      .eq("clinic_id", clinicId)
      .eq("owner_email", session.email.toLowerCase().trim())
      .maybeSingle();
    if (ownerError) throw ownerError;
    if (!owner) return NextResponse.json({ error: "غير مصرح لك بتصدير بيانات هذا المركز." }, { status: 403 });

    const tables = [
      "clinics", "branches", "subscriptions", "patients", "appointments", "sessions",
      "staff", "invoices", "clinic_services", "clinic_settings", "assessments",
      "patient_evaluations", "patient_programs", "patient_medical_records", "soap_notes",
      "treatment_plans", "patient_attachments", "discharges", "daily_reports", "executive_reports"
    ];
    const results = await Promise.all(tables.map(async (table) => {
      const { data, error } = await admin.from(table).select("*").eq("clinic_id", clinicId);
      if (error) throw new Error(`تعذر تصدير جدول ${table}: ${error.message}`);
      return [table, data || []] as const;
    }));
    const payload = {
      exportedAt: new Date().toISOString(),
      clinicId,
      format: "Prime Physio center export",
      data: Object.fromEntries(results),
    };
    const safeDate = new Date().toISOString().slice(0, 10);
    return new NextResponse(JSON.stringify(payload, null, 2), {
      status: 200,
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Content-Disposition": `attachment; filename="prime-physio-center-${clinicId}-${safeDate}.json"`,
        "Cache-Control": "no-store, private",
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (/unauthorized/i.test(message)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    console.error("[CenterManagement] Export failed:", error);
    return NextResponse.json({ error: error instanceof Error ? error.message : "تعذر تصدير البيانات." }, { status: 500 });
  }
}
