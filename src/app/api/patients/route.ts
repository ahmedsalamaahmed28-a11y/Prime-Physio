import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/pages/api/auth/[...nextauth]";
import { getAdminClient } from "@/lib/supabase-admin";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const PATIENT_FIELDS = [
  "id",
  "nameAr",
  "phone",
  "gender",
  "age",
  "address",
  "activePackage",
  "sessionsUsed",
  "sessionsTotal",
  "status",
  "occupation",
  "emergencyContact",
  "emergencyPhone",
  "doctor",
] as const;

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const email = session?.user?.email?.toLowerCase().trim();
    if (!email) {
      return NextResponse.json({ error: "يجب تسجيل الدخول قبل إضافة مريض" }, { status: 401 });
    }

    const body = await request.json();
    if (!body || typeof body !== "object" || Array.isArray(body)) {
      return NextResponse.json({ error: "بيانات المريض غير صالحة" }, { status: 400 });
    }

    const admin = getAdminClient();
    let staffQuery = admin
      .from("staff")
      .select("clinic_id,status")
      .eq("email", email);
    if (typeof body.clinic_id === "string" && body.clinic_id) {
      staffQuery = staffQuery.eq("clinic_id", body.clinic_id);
    }
    const { data: staff, error: staffError } = await staffQuery
      .limit(1)
      .maybeSingle();

    if (staffError) {
      console.error("[Patients API] Staff lookup failed:", staffError);
      return NextResponse.json({ error: "تعذر التحقق من صلاحية الحساب" }, { status: 503 });
    }
    if (!staff?.clinic_id || staff.status === "محذوف") {
      return NextResponse.json({ error: "لا توجد صلاحية نشطة لإضافة مرضى لهذه العيادة" }, { status: 403 });
    }

    if (body.clinic_id && body.clinic_id !== staff.clinic_id) {
      return NextResponse.json({ error: "لا يمكن إضافة مريض إلى عيادة أخرى" }, { status: 403 });
    }

    const patient: Record<string, unknown> = {};
    for (const field of PATIENT_FIELDS) {
      if (body[field] !== undefined) patient[field] = body[field];
    }

    if (
      typeof patient.id !== "string" ||
      !patient.id.startsWith(String(staff.clinic_id).substring(0, 4).toUpperCase() + "-") ||
      typeof patient.nameAr !== "string" ||
      !patient.nameAr.trim() ||
      typeof patient.phone !== "string" ||
      !patient.phone.trim()
    ) {
      return NextResponse.json({ error: "الاسم ورقم الهاتف ورقم ملف صحيح مطلوبة" }, { status: 400 });
    }

    patient.clinic_id = staff.clinic_id;

    const { data, error } = await admin
      .from("patients")
      .insert(patient)
      .select("id")
      .single();

    if (error) {
      console.error("[Patients API] Insert failed:", error);
      const status = error.code === "23505" ? 409 : 500;
      return NextResponse.json(
        { error: error.code === "23505" ? "رقم ملف المريض مستخدم بالفعل، أعد المحاولة" : "تعذر حفظ بيانات المريض في قاعدة البيانات" },
        { status }
      );
    }

    return NextResponse.json({ success: true, patientId: data.id }, { status: 201 });
  } catch (error) {
    console.error("[Patients API] Unexpected error:", error);
    return NextResponse.json({ error: "حدث خطأ غير متوقع أثناء حفظ المريض" }, { status: 500 });
  }
}
