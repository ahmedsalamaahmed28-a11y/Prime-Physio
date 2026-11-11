import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/pages/api/auth/[...nextauth]";
import { getAdminClient } from "@/lib/supabase-admin";
import { canViewPatientHistory, hasStaffPermission } from "@/lib/server/staff-permissions";
import { checkSubscriptionLimit } from "@/lib/subscriptionCheck";

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
    const [patients, appointments, doctors, rooms, participants] = await Promise.all([
      auth.admin.from("patients").select("id,nameAr,nameEn").eq("clinic_id", auth.clinicId).order("id", { ascending: true }),
      auth.admin.from("appointments").select("*, treatment_plan:treatment_plans!appointments_treatment_plan_patient_clinic_fkey(id,goals)").eq("clinic_id", auth.clinicId),
      auth.admin.from("staff").select("name,email,role").eq("clinic_id", auth.clinicId),
      auth.admin.from("appointment_rooms").select("id,name,branch_id").eq("clinic_id", auth.clinicId).eq("is_active", true).order("name"),
      auth.admin.from("appointment_group_participants").select("appointment_id,patient_id").eq("clinic_id", auth.clinicId),
    ]);
    if (patients.error) throw patients.error;
    if (appointments.error) throw appointments.error;
    if (doctors.error) throw doctors.error;
    if (rooms.error) throw rooms.error;
    if (participants.error) throw participants.error;
    const canReadClinicalDetails = canViewPatientHistory(auth.staff);
    const safeAppointments = (appointments.data || []).map((appointment: Record<string, unknown>) => {
      if (canReadClinicalDetails) return appointment;
      const safe = { ...appointment };
      delete safe.treatment_plan;
      delete safe.treatment_plan_id;
      delete safe.session_intervention;
      delete safe.session_objectives;
      delete safe.target_exercises;
      return safe;
    });
    const therapistRoles = ["admin", "مدير العياده", "استشاري علاج طبيعي", "أخصائي علاج طبيعي", "ممارس علاج طبيعي", "doctor"];
    const safeDoctors = (doctors.data || []).filter((doctor: { role?: string | null }) =>
      therapistRoles.includes(doctor.role || "")
    );
    return NextResponse.json({
      patients: patients.data || [],
      appointments: safeAppointments,
      doctors: safeDoctors,
      rooms: rooms.data || [],
      groupParticipants: participants.data || [],
    }, { headers: { "Cache-Control": "no-store, private" } });
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
      return NextResponse.json({ error: "بيانات الطلب غير صالحة" }, { status: 400 });
    }

    if (body.action === "create_room") {
      if (!hasStaffPermission(auth.staff, "manage_settings")) {
        return NextResponse.json({ error: "ليس لديك صلاحية إدارة غرف العلاج" }, { status: 403 });
      }
      const name = typeof body.name === "string" ? body.name.trim() : "";
      if (!name || name.length > 60) {
        return NextResponse.json({ error: "اسم الغرفة مطلوب ويجب ألا يتجاوز 60 حرفًا" }, { status: 400 });
      }
      const { data: activeBranches, error: branchesError } = await auth.admin.from("branches")
        .select("id").eq("clinic_id", auth.clinicId).eq("status", "active");
      if (branchesError) throw branchesError;
      let branchId: string | null = null;
      if (body.branchId) {
        const selected = (activeBranches || []).find((branch: any) => branch.id === body.branchId);
        if (!selected) return NextResponse.json({ error: "الفرع المختار لا يتبع هذه العيادة" }, { status: 400 });
        branchId = selected.id;
      } else if ((activeBranches || []).length === 1) {
        branchId = activeBranches![0].id;
      } else if ((activeBranches || []).length > 1) {
        return NextResponse.json({ error: "يرجى تحديد الفرع قبل إضافة الغرفة" }, { status: 400 });
      }
      const { data: room, error: roomError } = await auth.admin.from("appointment_rooms")
        .insert({ clinic_id: auth.clinicId, branch_id: branchId, name, is_active: true })
        .select("id,name,branch_id").single();
      if (roomError) {
        if (roomError.code === "23505") return NextResponse.json({ error: "يوجد غرفة بهذا الاسم بالفعل" }, { status: 409 });
        throw roomError;
      }
      return NextResponse.json({ success: true, room });
    }

    if (!hasStaffPermission(auth.staff, "edit_appointments") || !hasStaffPermission(auth.staff, "create_invoice")) {
      return NextResponse.json({ error: "ليس لديك صلاحية حجز المواعيد وإنشاء الفواتير" }, { status: 403 });
    }
    const canEditClinicalDetails = hasStaffPermission(auth.staff, "edit_emr");
    const hasClinicalPayload = Boolean(
      body.treatmentPlanId ||
      (typeof body.sessionIntervention === "string" && body.sessionIntervention.trim()) ||
      (typeof body.sessionObjectives === "string" && body.sessionObjectives.trim()) ||
      (Array.isArray(body.targetExercises) && body.targetExercises.length > 0)
    );
    if (hasClinicalPayload && !canEditClinicalDetails) {
      return NextResponse.json({ error: "ليس لديك صلاحية ربط الخطة العلاجية أو إدخال تفاصيل الجلسة الطبية" }, { status: 403 });
    }
    if (canEditClinicalDetails && body.targetExercises !== undefined && !Array.isArray(body.targetExercises)) {
      return NextResponse.json({ error: "قائمة التمارين المستهدفة غير صالحة" }, { status: 400 });
    }
    const start = new Date(body.startTime);
    const end = new Date(body.endTime);
    const recurrenceMode = body.recurrenceMode === "weekly" || body.recurrenceMode === "biweekly" ? body.recurrenceMode : "none";
    const recurrenceCount = recurrenceMode === "none" ? 1 : Number(body.recurrenceCount);
    if (recurrenceMode !== "none" && (!Number.isInteger(recurrenceCount) || recurrenceCount < 2 || recurrenceCount > 12)) {
      return NextResponse.json({ error: "عدد التكرارات يجب أن يكون بين 2 و12" }, { status: 400 });
    }
    const patientIds = Array.isArray(body.patientIds) ? [...new Set(body.patientIds.filter((id: unknown) => typeof id === "string" && id.trim()))] : [body.patientId];
    if (patientIds.length < 1 || patientIds.length > 12 || (body.isGroupSession && patientIds.length < 2) || (!body.isGroupSession && patientIds.length !== 1)) {
      return NextResponse.json({ error: "حدد مريضًا واحدًا أو من 2 إلى 12 مريضًا للجلسة الجماعية" }, { status: 400 });
    }
    const subscriptionLimit = await checkSubscriptionLimit(auth.clinicId, "sessions", recurrenceCount * patientIds.length);
    if (!subscriptionLimit.allowed) {
      return NextResponse.json({ error: "عدد الجلسات المطلوبة يتجاوز الحد المتاح في باقة المركز لهذا الشهر.", limit: subscriptionLimit }, { status: 403 });
    }
    if (body.isGroupSession && hasClinicalPayload) {
      return NextResponse.json({ error: "يجب ربط الخطط والتفاصيل الطبية بكل مريض بشكل منفصل؛ لا يمكن مشاركة خطة طبية في جلسة جماعية" }, { status: 400 });
    }
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

    const { data: patientRows, error: patientError } = await auth.admin.from("patients")
      .select("id,nameAr").eq("clinic_id", auth.clinicId).in("id", patientIds);
    if (patientError) throw patientError;
    const patientMap = new Map((patientRows || []).map((item: any) => [item.id, item]));
    if (patientMap.size !== patientIds.length) return NextResponse.json({ error: "يوجد مريض غير موجود في العيادة الحالية" }, { status: 404 });
    const patients = patientIds.map((id: string) => patientMap.get(id)!);
    const patient = patients[0];
    if (body.patientId !== patient.id) return NextResponse.json({ error: "المريض الأساسي لا يطابق قائمة المشاركين" }, { status: 400 });

    if (body.treatmentPlanId && canEditClinicalDetails) {
      const { data: plan, error: planError } = await auth.admin.from("treatment_plans")
        .select("id").eq("id", body.treatmentPlanId).eq("patient_id", patient.id)
        .eq("clinic_id", auth.clinicId).eq("status", "active").maybeSingle();
      if (planError) throw planError;
      if (!plan) return NextResponse.json({ error: "الخطة العلاجية غير نشطة أو لا تخص هذا المريض" }, { status: 400 });
    }

    if (!body.appointmentId || !body.startTime || !body.endTime || !body.invoiceId) {
      return NextResponse.json({ error: "بيانات الموعد أو الفاتورة غير مكتملة" }, { status: 400 });
    }
    const recurrenceId = recurrenceCount > 1 ? `SERIES-${crypto.randomUUID()}` : null;
    const createdAppointmentIds: string[] = [];
    const createdInvoiceIds: string[] = [];
    try {
      for (let index = 0; index < recurrenceCount; index += 1) {
        const offsetDays = recurrenceMode === "weekly" ? index * 7 : recurrenceMode === "biweekly" ? index * 14 : 0;
        const occurrenceStart = new Date(start.getTime() + offsetDays * 86400000);
        const occurrenceEnd = new Date(end.getTime() + offsetDays * 86400000);
        const appointmentId = index === 0 ? body.appointmentId : `AP-${crypto.randomUUID()}`;
        const invoiceRows = patients.map((item: any, patientIndex: number) => {
          const invoiceId = index === 0 && patientIndex === 0 ? body.invoiceId : `INV-${crypto.randomUUID()}`;
          createdInvoiceIds.push(invoiceId);
          return {
            id: invoiceId,
            clinic_id: auth.clinicId,
            patient_id: item.id,
            patient_name: item.nameAr,
            description: body.isGroupSession ? (body.invoiceDescription + " - جلسة جماعية") : body.invoiceDescription,
            amount: body.invoiceAmount,
            status: body.invoiceStatus || "انتظار",
            payment_method: "—",
            date: occurrenceStart.toISOString().split("T")[0],
            branch_id: branchId,
          };
        });
        const { error: appointmentError } = await auth.admin.from("appointments").insert({
          id: appointmentId,
          clinic_id: auth.clinicId,
          patient_id: patient.id,
          patient_name: body.isGroupSession ? `جلسة جماعية (${patients.length})` : patient.nameAr,
          doctor_name: therapist.name,
          therapist_id: therapist.id,
          room_id: roomId,
          branch_id: branchId,
          appointment_type: body.isGroupSession ? "جلسة جماعية" : body.visitType,
          status: body.status || "مؤكد",
          start_time: occurrenceStart.toISOString(),
          end_time: occurrenceEnd.toISOString(),
          treatment_plan_id: canEditClinicalDetails ? (body.treatmentPlanId || null) : null,
          session_intervention: canEditClinicalDetails ? (body.sessionIntervention || null) : null,
          session_objectives: canEditClinicalDetails ? (body.sessionObjectives || null) : null,
          target_exercises: canEditClinicalDetails ? (body.targetExercises || []) : [],
          is_group_session: Boolean(body.isGroupSession),
          recurrence_id: recurrenceId,
          recurrence_index: recurrenceId ? index + 1 : null,
          recurrence_total: recurrenceId ? recurrenceCount : null,
        });
        if (appointmentError) throw appointmentError;
        createdAppointmentIds.push(appointmentId);

        const { error: invoiceError } = await auth.admin.from("invoices").insert(invoiceRows);
        if (invoiceError) throw invoiceError;

        const participantRows = patients.map((item: any, patientIndex: number) => ({
          clinic_id: auth.clinicId,
          appointment_id: appointmentId,
          patient_id: item.id,
          invoice_id: invoiceRows[patientIndex].id,
        }));
        const { error: participantError } = await auth.admin.from("appointment_group_participants").insert(participantRows);
        if (participantError) throw participantError;
      }
    } catch (creationError: any) {
      if (createdAppointmentIds.length) await auth.admin.from("appointments").delete().eq("clinic_id", auth.clinicId).in("id", createdAppointmentIds);
      if (createdInvoiceIds.length) await auth.admin.from("invoices").delete().eq("clinic_id", auth.clinicId).in("id", createdInvoiceIds);
      if (creationError?.code === "23P01" || /THERAPIST_TIME_CONFLICT|ROOM_TIME_CONFLICT/.test(creationError?.message || "")) {
        return NextResponse.json({ error: "يوجد تعارض في أحد مواعيد السلسلة للمعالج أو الغرفة. لم يتم الاحتفاظ بأي موعد من هذه السلسلة." }, { status: 409 });
      }
      throw creationError;
    }
    return NextResponse.json({ success: true, createdCount: recurrenceCount, recurrenceId, appointmentIds: createdAppointmentIds, groupSize: patients.length });
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
      if (body.roomId !== undefined) {
        if (body.roomId === null || body.roomId === "") {
          updates.room_id = null;
        } else {
          const { data: room, error: roomError } = await auth.admin.from("appointment_rooms")
            .select("id,branch_id").eq("id", body.roomId).eq("clinic_id", auth.clinicId).eq("is_active", true).maybeSingle();
          if (roomError) throw roomError;
          if (!room) return NextResponse.json({ error: "الغرفة المختارة غير متاحة في هذه العيادة" }, { status: 400 });
          updates.room_id = room.id;
        }
      }
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
