import { NextRequest, NextResponse } from "next/server";
import { getClinicContext } from "@/lib/server/clinic-context";
import { canViewPatientHistory, hasStaffPermission } from "@/lib/server/staff-permissions";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const GENERAL_FIELDS = [
  "nameAr", "nameEn", "age", "gender", "phone", "email", "nationalId",
  "emergencyContact", "emergencyPhone",
  "address", "occupation", "referral", "doctor",
] as const;

const MEDICAL_FIELDS = [
  "chiefComplaint", "diagnosis", "medicalHistory", "pastSurgeries",
  "chronicDiseases", "currentMedications", "drugAllergies", "bloodType", "allergies", "dvt",
] as const;

async function getAuthorizedClinic(req: NextRequest) {
  return getClinicContext(req);
}

export async function GET(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const auth = await getAuthorizedClinic(request);
  if ("response" in auth) return auth.response;
  if (!hasStaffPermission(auth.staff, "view_patients")) {
    return NextResponse.json({ error: "ليس لديك صلاحية مشاهدة ملف المريض" }, { status: 403 });
  }
  const { id } = await context.params;
  const canReadMedical = canViewPatientHistory(auth.staff);
  const baseFields = "id,clinic_id,nameAr,nameEn,email,nationalId,phone,gender,age,address,activePackage,sessionsUsed,sessionsTotal,status,occupation,emergencyContact,emergencyPhone,doctor,created_at,updated_at";
  const selectFields = canReadMedical ? baseFields + ",referral" : baseFields;

  const { data, error } = await auth.admin
    .from("patients")
    .select(selectFields)
    .eq("id", id)
    .eq("clinic_id", auth.clinicId)
    .maybeSingle();

  if (error) {
    console.error("[Patient API] Fetch failed:", error);
    return NextResponse.json({ error: "تعذر تحميل بيانات المريض" }, { status: 500 });
  }
  if (!data) return NextResponse.json({ error: "المريض غير موجود في العيادة الحالية" }, { status: 404 });

  let patient: Record<string, unknown> = { ...(data as unknown as Record<string, unknown>) };
  if (canReadMedical) {
    const { data: medicalRecord, error: medicalError } = await auth.admin
      .from("patient_medical_records")
      .select("medical_history")
      .eq("patient_id", id)
      .eq("clinic_id", auth.clinicId)
      .maybeSingle();
    if (medicalError) {
      console.error("[Patient API] Medical record fetch failed:", medicalError);
      return NextResponse.json({ error: "تعذر تحميل الملف الطبي" }, { status: 500 });
    }
    const medical = (medicalRecord?.medical_history || {}) as Record<string, unknown>;
    patient = {
      ...patient,
      medical_history: medical,
      bloodType: medical.bloodType || "",
      allergies: medical.allergies || "",
      dvt: medical.dvt || "",
    };
  }
  return NextResponse.json({ patient }, { headers: { "Cache-Control": "no-store, private" } });
}

export async function PATCH(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const auth = await getAuthorizedClinic(request);
  if ("response" in auth) return auth.response;
  const { id } = await context.params;

  try {
    const body = await request.json();
    if (!body || typeof body !== "object" || Array.isArray(body)) {
      return NextResponse.json({ error: "بيانات التعديل غير صالحة" }, { status: 400 });
    }
    const generalKeys = Object.keys(body).filter((key) => GENERAL_FIELDS.includes(key as typeof GENERAL_FIELDS[number]));
    const protectedMedicalKeys = ["bloodType", "allergies", "dvt"].filter((key) => Object.prototype.hasOwnProperty.call(body, key));
    if (generalKeys.length === 0 && protectedMedicalKeys.length === 0 && body.medicalFields === undefined) {
      return NextResponse.json({ error: "لا توجد بيانات صالحة للحفظ" }, { status: 400 });
    }
    if (generalKeys.length > 0 && !hasStaffPermission(auth.staff, "edit_patient")) {
      return NextResponse.json({ error: "ليس لديك صلاحية تعديل البيانات الأساسية للمريض" }, { status: 403 });
    }
    if ((body.medicalFields !== undefined || protectedMedicalKeys.length > 0)
      && (!hasStaffPermission(auth.staff, "view_patients") || !hasStaffPermission(auth.staff, "edit_emr"))) {
      return NextResponse.json({ error: "ليس لديك صلاحية تعديل الملف الطبي" }, { status: 403 });
    }

    const { data: existing, error: lookupError } = await auth.admin
      .from("patients")
      .select("id")
      .eq("id", id)
      .eq("clinic_id", auth.clinicId)
      .maybeSingle();

    if (lookupError) {
      console.error("[Patient API] Patient lookup failed:", lookupError);
      return NextResponse.json({ error: "تعذر التحقق من ملف المريض" }, { status: 500 });
    }
    if (!existing) return NextResponse.json({ error: "المريض غير موجود في العيادة الحالية" }, { status: 404 });

    const updates: Record<string, unknown> = {};
    for (const field of GENERAL_FIELDS) {
      if (Object.prototype.hasOwnProperty.call(body, field)) updates[field] = body[field];
    }

    if (body.medicalFields !== undefined) {
      if (!body.medicalFields || typeof body.medicalFields !== "object" || Array.isArray(body.medicalFields)) {
        return NextResponse.json({ error: "بيانات الملف الطبي غير صالحة" }, { status: 400 });
      }
      // Medical data is stored separately from patient demographics and protected by its own RLS.
    }
    if (protectedMedicalKeys.length > 0 || body.medicalFields !== undefined) {
      const { data: currentMedical, error: currentMedicalError } = await auth.admin
        .from("patient_medical_records")
        .select("medical_history")
        .eq("patient_id", id)
        .eq("clinic_id", auth.clinicId)
        .maybeSingle();
      if (currentMedicalError) throw currentMedicalError;

      const medical = { ...((currentMedical?.medical_history as Record<string, unknown> | null) || {}) };
      if (body.medicalFields !== undefined) {
        if (!body.medicalFields || typeof body.medicalFields !== "object" || Array.isArray(body.medicalFields)) {
          return NextResponse.json({ error: "بيانات الملف الطبي غير صالحة" }, { status: 400 });
        }
        for (const field of MEDICAL_FIELDS) {
          if (Object.prototype.hasOwnProperty.call(body.medicalFields, field)) {
            medical[field] = body.medicalFields[field];
          }
        }
      }
      for (const field of protectedMedicalKeys) medical[field] = body[field];

      const { error: medicalSaveError } = await auth.admin
        .from("patient_medical_records")
        .upsert({
          patient_id: id,
          clinic_id: auth.clinicId,
          medical_history: medical,
          updated_at: new Date().toISOString(),
        }, { onConflict: "patient_id" });
      if (medicalSaveError) throw medicalSaveError;
    }

    let responsePatient: Record<string, unknown>;
    if (Object.keys(updates).length > 0) {
      updates.updated_at = new Date().toISOString();
      const { data, error } = await auth.admin
        .from("patients")
        .update(updates)
        .eq("id", id)
        .eq("clinic_id", auth.clinicId)
        .select("*")
        .single();

      if (error) {
        console.error("[Patient API] Update failed:", error);
        return NextResponse.json({ error: "تعذر حفظ بيانات المريض" }, { status: 500 });
      }
      responsePatient = { ...data };
    } else {
      const { data, error } = await auth.admin
        .from("patients")
        .select("*")
        .eq("id", id)
        .eq("clinic_id", auth.clinicId)
        .single();
      if (error) throw error;
      responsePatient = { ...data };
    }
    if (canViewPatientHistory(auth.staff)) {
      const { data: medicalRecord, error: medicalError } = await auth.admin
        .from("patient_medical_records")
        .select("medical_history")
        .eq("patient_id", id)
        .eq("clinic_id", auth.clinicId)
        .maybeSingle();
      if (medicalError) throw medicalError;
      const medical = (medicalRecord?.medical_history || {}) as Record<string, unknown>;
      responsePatient.medical_history = medical;
      responsePatient.bloodType = medical.bloodType || "";
      responsePatient.allergies = medical.allergies || "";
      responsePatient.dvt = medical.dvt || "";
    }
    if (!hasStaffPermission(auth.staff, "view_patients")) {
      return NextResponse.json({ success: true }, { headers: { "Cache-Control": "no-store, private" } });
    }
    return NextResponse.json({ success: true, patient: responsePatient }, {
      headers: { "Cache-Control": "no-store, private" },
    });
  } catch (error) {
    console.error("[Patient API] Unexpected error:", error);
    return NextResponse.json({ error: "حدث خطأ غير متوقع أثناء حفظ البيانات" }, { status: 500 });
  }
}


export async function DELETE(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const auth = await getAuthorizedClinic(request);
  if ("response" in auth) return auth.response;
  if (!hasStaffPermission(auth.staff, "delete_patient")) {
    return NextResponse.json({ error: "ليس لديك صلاحية إدارة ملفات المرضى" }, { status: 403 });
  }
  const { id } = await context.params;

  try {
    const body = await request.json().catch(() => ({}));
    const mode = body?.mode;
    if (!["archive", "restore", "permanent"].includes(mode)) {
      return NextResponse.json({ error: "نوع العملية غير صالح" }, { status: 400 });
    }

    if (mode === "archive" || mode === "restore") {
      const archived = mode === "archive";
      const { data, error } = await auth.admin.from("patients")
        .update({
          is_archived: archived,
          archived_at: archived ? new Date().toISOString() : null,
          archived_by: archived ? String(auth.staff.id || "clinic-owner") : null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", id)
        .eq("clinic_id", auth.clinicId)
        .select("id,is_archived")
        .maybeSingle();

      if (error) throw error;
      if (!data) return NextResponse.json({ error: "المريض غير موجود في العيادة الحالية" }, { status: 404 });
      return NextResponse.json({ success: true, archived: data.is_archived });
    }

    if (body?.confirmPatientId !== id) {
      return NextResponse.json({ error: "تأكيد الحذف النهائي غير مطابق لرقم ملف المريض" }, { status: 400 });
    }

    const { data: attachments, error: attachmentsError } = await auth.admin
      .from("patient_attachments")
      .select("file_path")
      .eq("clinic_id", auth.clinicId)
      .eq("patient_id", id);
    if (attachmentsError) throw attachmentsError;

    const { data: deleted, error: deleteError } = await auth.admin.rpc(
      "hard_delete_patient_with_records",
      { p_clinic_id: auth.clinicId, p_patient_id: id }
    );
    if (deleteError) throw deleteError;

    let storageWarning: string | null = null;
    const paths = (attachments || []).map((item: { file_path: string }) => item.file_path).filter(Boolean);
    if (paths.length > 0) {
      const { error: storageError } = await auth.admin.storage.from("patient-files").remove(paths);
      if (storageError) {
        console.error("[Patient API] Attachment cleanup failed after patient deletion:", storageError);
        storageWarning = "تم حذف سجل المريض وسجلاته، لكن تعذر حذف بعض الملفات المرفقة من التخزين. يرجى مراجعة مسؤول النظام.";
      }
    }

    return NextResponse.json({ success: true, deleted, warning: storageWarning });
  } catch (error: any) {
    console.error("[Patient API] Delete/archive failed:", error);
    return NextResponse.json({ error: error?.message || "تعذر تنفيذ العملية على ملف المريض" }, { status: 500 });
  }
}
