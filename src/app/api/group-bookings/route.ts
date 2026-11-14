import { NextRequest, NextResponse } from "next/server";
import { getClinicContext } from "@/lib/server/clinic-context";
import { hasStaffPermission } from "@/lib/server/staff-permissions";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(request: NextRequest) {
  const auth = await getClinicContext(request);
  if ("response" in auth) return auth.response;
  if (!hasStaffPermission(auth.staff, "edit_emr")) {
    return NextResponse.json({ error: "هذه الصفحة متاحة للأخصائي أو مدير المركز فقط." }, { status: 403 });
  }
  try {
    const { data: requests, error } = await auth.admin.from("group_booking_requests")
      .select("id,patient_id,group_code,selected_times,status,created_at,sessions_total")
      .eq("clinic_id", auth.clinicId).order("created_at", { ascending: false }).limit(100);
    if (error) throw error;
    const patientIds = [...new Set((requests || []).map((item: any) => item.patient_id))];
    const [{ data: patients, error: patientsError }, { data: evaluations, error: evaluationsError }] = await Promise.all([
      patientIds.length ? auth.admin.from("patients").select('id,"nameAr",age,phone,address').eq("clinic_id", auth.clinicId).in("id", patientIds) : Promise.resolve({ data: [], error: null } as any),
      patientIds.length ? auth.admin.from("patient_evaluations").select("patient_id").eq("clinic_id", auth.clinicId).in("patient_id", patientIds) : Promise.resolve({ data: [], error: null } as any),
    ]);
    if (patientsError) throw patientsError;
    if (evaluationsError) throw evaluationsError;
    const patientMap = new Map((patients || []).map((item: any) => [item.id, item]));
    const evaluated = new Set((evaluations || []).map((item: any) => item.patient_id));
    return NextResponse.json({
      requests: (requests || []).map((item: any) => ({
        ...item, patient: patientMap.get(item.patient_id) || null, evaluated: evaluated.has(item.patient_id),
      })),
    }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("[Group bookings] Load failed:", error);
    return NextResponse.json({ error: "تعذر تحميل طلبات المجموعات." }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const auth = await getClinicContext(request);
  if ("response" in auth) return auth.response;
  if (!hasStaffPermission(auth.staff, "edit_emr")) {
    return NextResponse.json({ error: "اعتماد المجموعات وتحديد عدد الجلسات يتطلب صلاحية الأخصائي." }, { status: 403 });
  }
  try {
    const body = await request.json();
    const requestId = String(body.requestId || "");
    const sessionsTotal = Number(body.sessionsTotal);
    if (!/^[0-9a-f-]{36}$/i.test(requestId) || !Number.isInteger(sessionsTotal) || sessionsTotal < 1 || sessionsTotal > 150) {
      return NextResponse.json({ error: "أدخل عدد جلسات صحيحًا من 1 إلى 150." }, { status: 400 });
    }
    const { data, error } = await auth.admin.rpc("approve_group_booking_request", {
      p_request_id: requestId,
      p_clinic_id: auth.clinicId,
      p_sessions_total: sessionsTotal,
      p_approved_by: auth.staff.id || auth.staff.role || "specialist",
    });
    if (error) {
      console.error("[Group bookings] Approval failed:", { code: error.code, message: error.message, clinicId: auth.clinicId });
      const msg = error.message || "";
      const known = msg.includes("SPECIALIST_EVALUATION_REQUIRED")
        ? "يجب على الأخصائي حفظ التقييم السريري للمريض أولًا قبل اعتماد عدد الجلسات."
        : msg.includes("GROUP_BOOKING_TIME_CONFLICT")
          ? "يوجد تعارض في أحد مواعيد السلسلة. لم يتم إنشاء أي جلسة؛ راجع الأوقات ثم حاول مجددًا."
          : msg.includes("GROUP_DAY_OUTSIDE_WORKING_HOURS")
            ? "أحد الأيام لم يعد ضمن ساعات عمل المركز. راجع ساعات العمل والأوقات المختارة."
            : msg.includes("GROUP_REQUEST_NOT_PENDING")
              ? "هذا الطلب تمت معالجته بالفعل."
              : "تعذر اعتماد الجدول. راجع التقييم وساعات العمل وتعارضات المواعيد.";
      return NextResponse.json({ error: known }, { status: error.code === "23P01" ? 409 : 400 });
    }
    return NextResponse.json({ success: true, sessionsCreated: data, sessionsTotal });
  } catch (error) {
    console.error("[Group bookings] Approval request failed:", error);
    return NextResponse.json({ error: "حدث خطأ أثناء اعتماد المجموعة." }, { status: 500 });
  }
}
