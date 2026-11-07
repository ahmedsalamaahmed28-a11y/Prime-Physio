import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/pages/api/auth/[...nextauth]";
import { getAdminClient } from "@/lib/supabase-admin";

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
    .select("clinic_id,status")
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
  return { admin, clinicId: staff.clinic_id };
}

export async function GET(_request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const auth = await getAuthorizedClinic();
  if ("error" in auth) return auth.error;
  const { id } = await context.params;

  const { data, error } = await auth.admin
    .from("patients")
    .select("*")
    .eq("id", id)
    .eq("clinic_id", auth.clinicId)
    .maybeSingle();

  if (error) {
    console.error("[Patient API] Fetch failed:", error);
    return NextResponse.json({ error: "تعذر تحميل بيانات المريض" }, { status: 500 });
  }
  if (!data) return NextResponse.json({ error: "المريض غير موجود في العيادة الحالية" }, { status: 404 });
  return NextResponse.json({ patient: data });
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
    return NextResponse.json({ success: true, patient: data });
  } catch (error) {
    console.error("[Patient API] Unexpected error:", error);
    return NextResponse.json({ error: "حدث خطأ غير متوقع أثناء حفظ البيانات" }, { status: 500 });
  }
}
