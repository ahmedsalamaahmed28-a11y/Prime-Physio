import { NextRequest, NextResponse } from "next/server";
import { getClinicContext } from "@/lib/server/clinic-context";
import { hasStaffPermission } from "@/lib/server/staff-permissions";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function amount(value: unknown): number {
  const normalized = String(value ?? "").replace(/[٠-٩]/g, (digit) => String("٠١٢٣٤٥٦٧٨٩".indexOf(digit))).replace(/[٬,]/g, "").replace(/[٫]/g, ".").replace(/[^0-9.-]/g, "");
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : 0;
}

export async function GET(request: NextRequest) {
  const auth = await getClinicContext(request);
  if ("response" in auth) return auth.response;

  if (!hasStaffPermission(auth.staff, "view_analytics")) {
    return NextResponse.json({ error: "ليس لديك صلاحية مشاهدة التحليلات والمؤشرات المالية" }, { status: 403 });
  }

  try {
    const [patientsResult, sessionsResult, invoicesResult, reportsResult] = await Promise.all([
      auth.admin.from("patients").select("id,status,activePackage").eq("clinic_id", auth.clinicId),
      auth.admin.from("sessions").select("id").eq("clinic_id", auth.clinicId),
      auth.admin.from("invoices").select("amount,status").eq("clinic_id", auth.clinicId),
      auth.admin.from("executive_reports")
        .select("id,report_month,revenue_forecast,growth_forecast,capacity_forecast,ai_consultant_notes,created_at")
        .eq("clinic_id", auth.clinicId)
        .order("created_at", { ascending: false })
        .limit(5),
    ]);

    const error = [patientsResult, sessionsResult, invoicesResult, reportsResult].find((item) => item.error)?.error;
    if (error) throw error;

    const patients = patientsResult.data || [];
    const invoices = invoicesResult.data || [];
    const paidInvoices = invoices.filter((invoice) => ["مدفوع", "Paid"].includes(String(invoice.status || "")));
    const netRevenue = paidInvoices.reduce((sum, invoice) => sum + amount(invoice.amount), 0);

    let backPackageCount = 0;
    let kneePackageCount = 0;
    let singleSessionsCount = 0;
    for (const patient of patients) {
      const packageName = patient.activePackage || "جلسات فردية";
      if (packageName === "باقة علاج الظهر") backPackageCount += 1;
      else if (packageName === "تأهيل الركبة") kneePackageCount += 1;
      else singleSessionsCount += 1;
    }

    return NextResponse.json({
      stats: {
        totalPatients: patients.length,
        activePatients: patients.filter((patient) => patient.status === "نشط").length,
        inactivePatients: patients.filter((patient) => patient.status === "غير نشط").length,
        totalSessions: (sessionsResult.data || []).length,
        netRevenue,
        satisfactionRate: null,
        backPackageCount,
        kneePackageCount,
        singleSessionsCount,
      },
      executiveReports: reportsResult.data || [],
    }, { headers: { "Cache-Control": "no-store, private" } });
  } catch (error) {
    console.error("[Analytics API] Load failed:", error);
    return NextResponse.json({ error: "تعذر تحميل التحليلات" }, { status: 500 });
  }
}
