import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/pages/api/auth/[...nextauth]";
import { getAdminClient } from "@/lib/supabase-admin";
import { canViewPatientHistory, hasStaffPermission } from "@/lib/server/staff-permissions";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const GENERAL_FIELDS = [
  "nameAr", "nameEn", "age", "gender", "phone", "email", "nationalId",
  "bloodType", "allergies", "dvt", "emergencyContact", "emergencyPhone",
  "address", "occupation", "referral", "doctor",
] as const;

const MEDICAL_FIELDS = [
  "chiefComplaint", "diagnosis", "medicalHistory", "pastSurgeries",
  "chronicDiseases", "currentMedications", "drugAllergies",
] as const;

async function getAuthorizedClinic() {
  const session = await getServerSession(authOptions);
  const email = session?.user?.email?.toLowerCase().trim();
  if (!email) return { error: NextResponse.json({ error: "يجب تسجيل الدخول أولاً" }, { status: 401 }) };

  const admin = getAdminClient();
  const { data: staff, error } = await admin
    .from("staff")
    .select("clinic_id,status,role,permissions")
    .eq("email", email)
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error("[Patient API] Staff lookup failed:", error);
    return { error: NextResponse.json({ error: "تعذر التحقق من صلاحية الحساب" }, { status: 503 }) };
  }
  if (!staff?.clinic_id || staff.status === "محذوف") {
    return { error: NextResponse.json({ error: "لا توجد صلاحية نشطة لهذه العيادة" }, { status: 403 }) };
  }
  return { admin, clinicId: staff.clinic_id, staff };
}

export async function GET(_request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const auth = await getAuthorizedClinic();
  if ("error" in auth) return auth.error;
  if (!hasStaffPermission(auth.staff, "edit_patient") && !canViewPatientHistory(auth.staff)) {
    return NextResponse.json({ error: "ليس لديك صلاحية الاطلاع على ملف المريض" }, { status: 403 });
  }
  const { id } = await context.params;
  const canReadMedical = canViewPatientHistory(auth.staff);
  const baseFields = "id,clinic_id,nameAr,nameEn,email,nationalId,phone,gender,age,address,activePackage,sessionsUsed,sessionsTotal,status,occupation,emergencyContact,emergencyPhone,doctor,created_at,updated_at";
  const selectFields = canReadMedical ? baseFields + ",bloodType,allergies,dvt,referral,medical_history" : baseFields;

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
  return NextResponse.json({ patient: data }, { headers: { "Cache-Control": "no-store, private" } });
}

export async function PATCH(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const auth = await getAuthorizedClinic();
  if ("error" in auth) return auth.error;
  const { id } = await context.params;

  try {
    const body = await request.json();
    if (!body || typeof body !== "object" || Array.isArray(body)) {
      return NextResponse.json({ error: "بيانات التعديل غير صالحة" }, { status: 400 });
    }
    if (Object.keys(body).some((key) => GENERAL_FIELDS.includes(key as typeof GENERAL_FIELDS[number]))
      && !hasStaffPermission(auth.staff, "edit_patient")) {
      return NextResponse.json({ error: "ليس لديك صلاحية تعديل البيانات الأساسية للمريض" }, { status: 403 });
    }
    if (body.medicalFields !== undefined && !hasStaffPermission(auth.staff, "edit_emr")) {
      return NextResponse.json({ error: "ليس لديك صلاحية تعديل الملف الطبي" }, { status: 403 });
    }

    const { data: existing, error: lookupError } = await auth.admin
      .from("patients")
      .select("id,medical_history")
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
      const medical = { ...((existing.medical_history as Record<string, unknown> | null) || {}) };
      for (const field of MEDICAL_FIELDS) {
        if (Object.prototype.hasOwnProperty.call(body.medicalFields, field)) {
          medical[field] = body.medicalFields[field];
        }
      }
      updates.medical_history = medical;
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: "لا توجد بيانات صالحة للحفظ" }, { status: 400 });
    }

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
    const responsePatient = { ...data };
    if (!canViewPatientHistory(auth.staff)) delete responsePatient.medical_history;
    return NextResponse.json({ success: true, patient: responsePatient }, {
      headers: { "Cache-Control": "no-store, private" },
    });
  } catch (error) {
    console.error("[Patient API] Unexpected error:", error);
    return NextResponse.json({ error: "حدث خطأ غير متوقع أثناء حفظ البيانات" }, { status: 500 });
  }
}


export async function DELETE(_request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const auth = await getAuthorizedClinic();
  if ("error" in auth) return auth.error;
  const { id } = await context.params;

  try {
    const dependentTables = [
      "invoices", "appointments", "sessions", "patient_evaluations",
      "assessments", "treatment_plans", "progress_tracking",
      "discharges", "patient_programs", "peer_reviews",
    ] as const;

    const checks = await Promise.all(dependentTables.map((table) =>
      auth.admin.from(table).select("id", { count: "exact", head: true })
        .eq("clinic_id", auth.clinicId).eq("patient_id", id)
    ));
    const failed = checks.find((result) => result.error);
    if (failed?.error) throw failed.error;
    const linkedRecords = checks.reduce((total, result) => total + (result.count || 0), 0);
    if (linkedRecords > 0) {
      return NextResponse.json({
        error: "لا يمكن حذف المريض لوجود سجلات جلسات أو تقييمات أو فواتير أو برامج علاجية مرتبطة به",
        linkedRecords,
      }, { status: 409 });
    }

    const { data, error } = await auth.admin.from("patients").delete()
      .eq("id", id).eq("clinic_id", auth.clinicId).select("id").maybeSingle();
    if (error) throw error;
    if (!data) return NextResponse.json({ error: "المريض غير موجود في العيادة الحالية" }, { status: 404 });
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("[Patient API] Delete failed:", error);
    return NextResponse.json({ error: error?.message || "تعذر حذف ملف المريض" }, { status: 500 });
  }
}
