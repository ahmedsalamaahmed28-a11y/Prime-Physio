import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/pages/api/auth/[...nextauth]";
import { getAdminClient } from "@/lib/supabase-admin";

export const dynamic = "force-dynamic";
export const revalidate = 0;

async function authorize() {
  const session = await getServerSession(authOptions);
  const email = session?.user?.email?.toLowerCase().trim();
  if (!email) return { response: NextResponse.json({ error: "يجب تسجيل الدخول أولاً" }, { status: 401 }) };
  const admin = getAdminClient();
  const { data: staff, error } = await admin.from("staff").select("clinic_id,status").eq("email", email).limit(1).maybeSingle();
  if (error) {
    console.error("[Calendar API] Staff lookup failed:", error);
    return { response: NextResponse.json({ error: "تعذر التحقق من صلاحية الحساب" }, { status: 503 }) };
  }
  if (!staff?.clinic_id || staff.status === "محذوف") {
    return { response: NextResponse.json({ error: "لا توجد صلاحية نشطة لهذه العيادة" }, { status: 403 }) };
  }
  return { admin, clinicId: staff.clinic_id };
}

export async function GET() {
  const auth = await authorize();
  if ("response" in auth) return auth.response;
  try {
    const [patients, appointments, doctors] = await Promise.all([
      auth.admin.from("patients").select("id,nameAr").eq("clinic_id", auth.clinicId).order("id", { ascending: true }),
      auth.admin.from("appointments").select("*, treatment_plan:treatment_plans!appointments_treatment_plan_patient_clinic_fkey(id,goals)").eq("clinic_id", auth.clinicId),
      auth.admin.from("staff").select("name,email,role").eq("clinic_id", auth.clinicId),
    ]);
    if (patients.error) throw patients.error;
    if (appointments.error) throw appointments.error;
    if (doctors.error) throw doctors.error;
    return NextResponse.json({ patients: patients.data || [], appointments: appointments.data || [], doctors: doctors.data || [] }, { headers: { "Cache-Control": "no-store" } });
  } catch (error: any) {
    console.error("[Calendar API] Load failed:", error);
    return NextResponse.json({ error: "تعذر تحميل بيانات المواعيد والمرضى", detail: error?.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const auth = await authorize();
  if ("response" in auth) return auth.response;
  try {
    const body = await request.json();
    if (!body || typeof body !== "object" || Array.isArray(body)) {
      return NextResponse.json({ error: "بيانات الموعد غير صالحة" }, { status: 400 });
    }
    const { data: patient, error: patientError } = await auth.admin.from("patients")
      .select("id,nameAr").eq("id", body.patientId).eq("clinic_id", auth.clinicId).maybeSingle();
    if (patientError) throw patientError;
    if (!patient) return NextResponse.json({ error: "المريض غير موجود في العيادة الحالية" }, { status: 404 });

    if (!body.appointmentId || !body.startTime || !body.endTime || !body.invoiceId) {
      return NextResponse.json({ error: "بيانات الموعد أو الفاتورة غير مكتملة" }, { status: 400 });
    }
    if (body.treatmentPlanId) {
      const { data: plan, error: planError } = await auth.admin.from("treatment_plans")
        .select("id").eq("id", body.treatmentPlanId).eq("patient_id", patient.id)
        .eq("clinic_id", auth.clinicId).eq("status", "active").maybeSingle();
      if (planError) throw planError;
      if (!plan) return NextResponse.json({ error: "الخطة العلاجية غير نشطة أو لا تخص هذا المريض" }, { status: 400 });
    }

    const { error: invoiceError } = await auth.admin.from("invoices").insert({
      id: body.invoiceId,
      clinic_id: auth.clinicId,
      patient_id: patient.id,
      patient_name: patient.nameAr,
      description: body.invoiceDescription,
      amount: body.invoiceAmount,
      status: body.invoiceStatus || "انتظار",
      payment_method: "—",
      date: body.invoiceDate,
    });
    if (invoiceError) throw invoiceError;

    const { error: appointmentError } = await auth.admin.from("appointments").insert({
      id: body.appointmentId,
      clinic_id: auth.clinicId,
      patient_id: patient.id,
      patient_name: patient.nameAr,
      doctor_name: body.doctor || null,
      appointment_type: body.visitType,
      status: body.status || "مؤكد",
      start_time: body.startTime,
      end_time: body.endTime,
      treatment_plan_id: body.treatmentPlanId || null,
      session_intervention: body.sessionIntervention || null,
      session_objectives: body.sessionObjectives || null,
      target_exercises: body.targetExercises || [],
    });
    if (appointmentError) {
      await auth.admin.from("invoices").delete().eq("id", body.invoiceId).eq("clinic_id", auth.clinicId);
      throw appointmentError;
    }
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("[Calendar API] Appointment creation failed:", error);
    return NextResponse.json({ error: error?.message || "تعذر حفظ الموعد والفاتورة" }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  const auth = await authorize();
  if ("response" in auth) return auth.response;
  try {
    const body = await request.json();
    if (!body?.appointmentId || typeof body.appointmentId !== "string") {
      return NextResponse.json({ error: "رقم الموعد مطلوب" }, { status: 400 });
    }
    const { data: existing, error: lookupError } = await auth.admin.from("appointments")
      .select("id,patient_id").eq("id", body.appointmentId).eq("clinic_id", auth.clinicId).maybeSingle();
    if (lookupError) throw lookupError;
    if (!existing) return NextResponse.json({ error: "الموعد غير موجود" }, { status: 404 });

    if (body.action === "complete") {
      const { data, error } = await auth.admin.rpc("complete_appointment_and_record_progress", {
        p_appointment_id: body.appointmentId,
        p_pain_before: body.outcome?.painBefore,
        p_pain_after: body.outcome?.painAfter,
        p_rom_status: body.outcome?.romStatus || null,
        p_strength_status: body.outcome?.strengthStatus || null,
        p_recovery_score: body.outcome?.recoveryScore,
        p_completed_exercises: (body.outcome?.completedExercises || []).map((name: string) => ({ name })),
        p_notes: body.outcome?.notes || null,
      });
      if (error) throw error;
      return NextResponse.json({ success: true, data });
    }

    const updates: Record<string, unknown> = {};
    if (body.action === "cancel") updates.status = "ملغي";
    else if (body.action === "update") {
      updates.doctor_name = body.doctor;
      updates.appointment_type = body.visitType;
      updates.status = body.status;
      updates.start_time = body.startTime;
      updates.end_time = body.endTime;
    } else return NextResponse.json({ error: "إجراء غير معروف" }, { status: 400 });

    const { data, error } = await auth.admin.from("appointments").update(updates)
      .eq("id", body.appointmentId).eq("clinic_id", auth.clinicId).select("id").maybeSingle();
    if (error) throw error;
    if (!data) return NextResponse.json({ error: "لم يتم تحديث الموعد" }, { status: 404 });
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("[Calendar API] Appointment update failed:", error);
    return NextResponse.json({ error: error?.message || "تعذر تحديث الموعد" }, { status: 500 });
  }
}
