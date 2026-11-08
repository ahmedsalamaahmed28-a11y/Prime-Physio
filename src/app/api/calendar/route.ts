import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/pages/api/auth/[...nextauth]";
import { getAdminClient } from "@/lib/supabase-admin";
import { hasStaffPermission } from "@/lib/server/staff-permissions";

export const dynamic = "force-dynamic";
export const revalidate = 0;

async function authorize() {
  const session = await getServerSession(authOptions);
  const email = session?.user?.email?.toLowerCase().trim();
  if (!email) return { response: NextResponse.json({ error: "يجب تسجيل الدخول أولاً" }, { status: 401 }) };
  const admin = getAdminClient();
  const { data: staff, error } = await admin.from("staff").select("clinic_id,status,role,permissions").eq("email", email).limit(1).maybeSingle();
  if (error) {
    console.error("[Calendar API] Staff lookup failed:", error);
    return { response: NextResponse.json({ error: "تعذر التحقق من صلاحية الحساب" }, { status: 503 }) };
  }
  if (!staff?.clinic_id || staff.status === "محذوف") {
    return { response: NextResponse.json({ error: "لا توجد صلاحية نشطة لهذه العيادة" }, { status: 403 }) };
  }
  return { admin, clinicId: staff.clinic_id, staff };
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
    if (!hasStaffPermission(auth.staff, "edit_appointments") || !hasStaffPermission(auth.staff, "create_invoice")) {
      return NextResponse.json({ error: "ليس لديك صلاحية حجز المواعيد وإنشاء الفواتير" }, { status: 403 });
    }
    const body = await request.json();
    if (!body || typeof body !== "object" || Array.isArray(body)) {
      return NextResponse.json({ error: "بيانات الموعد غير صالحة" }, { status: 400 });
    }
    const start = new Date(body.startTime);
    const end = new Date(body.endTime);
    if (!body.startTime || !body.endTime || Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end <= start) {
      return NextResponse.json({ error: "وقت بداية ونهاية الموعد غير صالحين" }, { status: 400 });
    }
    if (typeof body.doctor !== "string" || !body.doctor.trim()) {
      return NextResponse.json({ error: "يرجى اختيار المعالج المسؤول عن الموعد" }, { status: 400 });
    }

    const { data: therapistMatches, error: therapistError } = await auth.admin.from("staff")
      .select("id,name,role,status")
      .eq("clinic_id", auth.clinicId)
      .eq("name", body.doctor.trim());
    if (therapistError) throw therapistError;
    const therapistRoles = ["admin", "مدير العياده", "استشاري علاج طبيعي", "أخصائي علاج طبيعي", "ممارس علاج طبيعي", "doctor"];
    const therapists = (therapistMatches || []).filter((item: any) =>
      item.status !== "محذوف" && therapistRoles.includes(item.role)
    );
    if (therapists.length !== 1) {
      return NextResponse.json({
        error: therapists.length > 1 ? "يوجد أكثر من معالج بالاسم نفسه؛ يرجى تمييز اسم المعالج" : "المعالج المختار غير مسجل أو غير نشط في هذه العيادة",
      }, { status: 400 });
    }
    const therapist = therapists[0];

    const { data: activeBranches, error: branchesError } = await auth.admin.from("branches")
      .select("id").eq("clinic_id", auth.clinicId).eq("status", "active");
    if (branchesError) throw branchesError;
    let branchId: string | null = null;
    if (body.branchId) {
      const selectedBranch = (activeBranches || []).find((item: any) => item.id === body.branchId);
      if (!selectedBranch) return NextResponse.json({ error: "الفرع المختار لا يتبع هذه العيادة" }, { status: 400 });
      branchId = selectedBranch.id;
    } else if ((activeBranches || []).length === 1) {
      branchId = activeBranches![0].id;
    } else if ((activeBranches || []).length > 1) {
      return NextResponse.json({ error: "يرجى تحديد الفرع قبل حجز الموعد" }, { status: 400 });
    }

    let roomId: string | null = null;
    if (body.roomId) {
      const { data: room, error: roomError } = await auth.admin.from("appointment_rooms")
        .select("id,branch_id").eq("id", body.roomId).eq("clinic_id", auth.clinicId).eq("is_active", true).maybeSingle();
      if (roomError) throw roomError;
      if (!room || (room.branch_id && room.branch_id !== branchId)) {
        return NextResponse.json({ error: "الغرفة المختارة غير متاحة في هذا الفرع" }, { status: 400 });
      }
      roomId = room.id;
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
      branch_id: branchId,
    });
    if (invoiceError) throw invoiceError;

    const { error: appointmentError } = await auth.admin.from("appointments").insert({
      id: body.appointmentId,
      clinic_id: auth.clinicId,
      patient_id: patient.id,
      patient_name: patient.nameAr,
      doctor_name: therapist.name,
      therapist_id: therapist.id,
      room_id: roomId,
      branch_id: branchId,
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
      if (appointmentError.code === "23P01" || /THERAPIST_TIME_CONFLICT|ROOM_TIME_CONFLICT/.test(appointmentError.message || "")) {
        return NextResponse.json({ error: "يوجد تعارض في موعد المعالج أو الغرفة خلال هذه الفترة. اختر وقتًا آخر." }, { status: 409 });
      }
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
    if (body.action === "complete") {
      if (!hasStaffPermission(auth.staff, "edit_emr")) {
        return NextResponse.json({ error: "ليس لديك صلاحية إنهاء الجلسة وتسجيل التقدم الطبي" }, { status: 403 });
      }
    } else if (!hasStaffPermission(auth.staff, "edit_appointments")) {
      return NextResponse.json({ error: "ليس لديك صلاحية تعديل أو إلغاء المواعيد" }, { status: 403 });
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
      const start = new Date(body.startTime);
      const end = new Date(body.endTime);
      if (!body.startTime || !body.endTime || Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end <= start) {
        return NextResponse.json({ error: "وقت بداية ونهاية الموعد غير صالحين" }, { status: 400 });
      }
      if (typeof body.doctor !== "string" || !body.doctor.trim()) {
        return NextResponse.json({ error: "يرجى اختيار المعالج المسؤول عن الموعد" }, { status: 400 });
      }
      const { data: therapistMatches, error: therapistError } = await auth.admin.from("staff")
        .select("id,name,role,status")
        .eq("clinic_id", auth.clinicId)
        .eq("name", body.doctor.trim());
      if (therapistError) throw therapistError;
      const therapistRoles = ["admin", "مدير العياده", "استشاري علاج طبيعي", "أخصائي علاج طبيعي", "ممارس علاج طبيعي", "doctor"];
      const therapists = (therapistMatches || []).filter((item: any) =>
        item.status !== "محذوف" && therapistRoles.includes(item.role)
      );
      if (therapists.length !== 1) {
        return NextResponse.json({ error: "المعالج المختار غير مسجل بشكل فريد أو غير نشط" }, { status: 400 });
      }
      updates.doctor_name = therapists[0].name;
      updates.therapist_id = therapists[0].id;
      updates.appointment_type = body.visitType;
      updates.status = body.status;
      updates.start_time = body.startTime;
      updates.end_time = body.endTime;
    } else return NextResponse.json({ error: "إجراء غير معروف" }, { status: 400 });

    const { data, error } = await auth.admin.from("appointments").update(updates)
      .eq("id", body.appointmentId).eq("clinic_id", auth.clinicId).select("id").maybeSingle();
    if (error) {
      if (error.code === "23P01" || /THERAPIST_TIME_CONFLICT|ROOM_TIME_CONFLICT/.test(error.message || "")) {
        return NextResponse.json({ error: "يوجد تعارض في موعد المعالج أو الغرفة خلال هذه الفترة. اختر وقتًا آخر." }, { status: 409 });
      }
      throw error;
    }
    if (!data) return NextResponse.json({ error: "لم يتم تحديث الموعد" }, { status: 404 });
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("[Calendar API] Appointment update failed:", error);
    return NextResponse.json({ error: error?.message || "تعذر تحديث الموعد" }, { status: 500 });
  }
}
