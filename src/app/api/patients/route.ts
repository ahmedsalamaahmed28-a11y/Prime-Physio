import { NextRequest, NextResponse } from "next/server";
import { getAdminClient } from "@/lib/supabase-admin";
import { getClinicContext } from "@/lib/server/clinic-context";
import { canViewPatientHistory, hasStaffPermission } from "@/lib/server/staff-permissions";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const LIST_FIELDS = [
  "id", "nameAr", "nameEn", "phone", "gender", "age", "address",
  "activePackage", "sessionsUsed", "sessionsTotal", "status", "occupation",
  "emergencyContact", "emergencyPhone", "doctor",
] as const;

const PATIENT_FIELDS = [
  "id",
  "nameAr",
  "nameEn",
  "email",
  "nationalId",
  "referral",
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

export async function GET(req: NextRequest) {
  try {
    const auth = await getClinicContext(req);
    if ("response" in auth) return auth.response;
    const { admin, clinicId } = auth;

    const archivedView = req.nextUrl.searchParams.get("archived") === "true";
    const { data, error } = await admin
      .from("patients")
      .select(LIST_FIELDS.join(",") + ",is_archived,archived_at")
      .eq("clinic_id", clinicId)
      .eq("is_archived", archivedView)
      .order("id", { ascending: true });
    if (error) {
      console.error("[Patients API] List query failed:", error);
      return NextResponse.json({ error: "تعذر تحميل قائمة المرضى" }, { status: 500 });
    }
    return NextResponse.json({ patients: data || [] }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("[Patients API] List failed:", error);
    return NextResponse.json({ error: "حدث خطأ أثناء تحميل قائمة المرضى" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await getClinicContext(request);
    if ("response" in auth) return auth.response;
    const { admin, clinicId, staff } = auth;

    const body = await request.json();
    if (!body || typeof body !== "object" || Array.isArray(body)) {
      return NextResponse.json({ error: "بيانات المريض غير صالحة" }, { status: 400 });
    }

    if (body.clinic_id && body.clinic_id !== clinicId) {
      return NextResponse.json({ error: "لا يمكن إضافة مريض إلى عيادة أخرى" }, { status: 403 });
    }
    if (!hasStaffPermission(staff, "edit_patient")) {
      return NextResponse.json({ error: "ليس لديك صلاحية إضافة مريض" }, { status: 403 });
    }

    const { data: activeBranches, error: branchesError } = await admin.from("branches")
      .select("id").eq("clinic_id", clinicId).eq("status", "active");
    if (branchesError) throw branchesError;
    let branchId: string | null = null;
    if (body.branchId) {
      const selectedBranch = (activeBranches || []).find((item: any) => item.id === body.branchId);
      if (!selectedBranch) return NextResponse.json({ error: "الفرع المختار لا يتبع هذه العيادة" }, { status: 400 });
      branchId = selectedBranch.id;
    } else if ((activeBranches || []).length === 1) {
      branchId = activeBranches![0].id;
    } else if ((activeBranches || []).length > 1) {
      return NextResponse.json({ error: "يرجى تحديد الفرع قبل إضافة المريض" }, { status: 400 });
    }

    const patient: Record<string, unknown> = {};
    for (const field of PATIENT_FIELDS) {
      if (body[field] !== undefined) patient[field] = body[field];
    }

    if (
      typeof patient.id !== "string" ||
      !patient.id.startsWith(String(clinicId).substring(0, 4).toUpperCase() + "-") ||
      typeof patient.nameAr !== "string" ||
      !patient.nameAr.trim() ||
      typeof patient.phone !== "string" ||
      !patient.phone.trim()
    ) {
      return NextResponse.json({ error: "الاسم ورقم الهاتف ورقم ملف صحيح مطلوبة" }, { status: 400 });
    }

    patient.clinic_id = clinicId;
    patient.branch_id = branchId;

    const { data, error } = await admin
      .from("patients")
      .insert(patient)
      .select("id")
      .single();

    if (error) {
      console.error("[Patients API] Insert failed:", error);
      const patientLimit = /PLAN_LIMIT_PATIENTS/i.test(error.message || "");
      const status = patientLimit ? 403 : error.code === "23505" ? 409 : 500;
      return NextResponse.json(
        {
          error: patientLimit
            ? "وصلت إلى الحد الأقصى لعدد المرضى في باقتك. رقِّ الباقة لإضافة مرضى آخرين."
            : error.code === "23505"
              ? "رقم ملف المريض مستخدم بالفعل، أعد المحاولة"
              : "تعذر حفظ بيانات المريض في قاعدة البيانات",
          code: patientLimit ? "PLAN_LIMIT_PATIENTS" : undefined,
        },
        { status }
      );
    }

    const warnings: string[] = [];
    const medicalAtCreation = ["bloodType", "allergies", "dvt"].reduce<Record<string, unknown>>((acc, field) => {
      if (body[field] !== undefined && body[field] !== null && body[field] !== "") acc[field] = body[field];
      return acc;
    }, {});
    if (Object.keys(medicalAtCreation).length > 0) {
      if (!canViewPatientHistory(staff) || !hasStaffPermission(staff, "edit_emr")) {
        warnings.push("تم إنشاء ملف المريض، لكن لم تُحفظ البيانات الطبية الحساسة لعدم توفر الصلاحية.");
      } else {
        const { error: medicalError } = await admin.from("patient_medical_records").upsert({
          patient_id: data.id,
          clinic_id: clinicId,
          medical_history: medicalAtCreation,
        }, { onConflict: "patient_id" });
        if (medicalError) {
          console.error("[Patients API] Medical record insert failed:", medicalError);
          warnings.push("تم إنشاء ملف المريض، لكن تعذر حفظ البيانات الطبية.");
        }
      }
    }

    if (body.invoice && typeof body.invoice === "object" && hasStaffPermission(staff, "create_invoice")) {
      const invoice = {
        id: body.invoice.id,
        clinic_id: clinicId,
        patient_id: data.id,
        patient_name: patient.nameAr,
        description: body.invoice.description,
        amount: body.invoice.amount,
        status: body.invoice.status || "انتظار",
        payment_method: body.invoice.payment_method || "—",
        date: body.invoice.date || new Date().toISOString().slice(0, 10),
        branch_id: branchId,
      };
      const { error: invoiceError } = await admin.from("invoices").insert(invoice);
      if (invoiceError) {
        console.error("[Patients API] Initial invoice insert failed:", invoiceError);
        warnings.push("تم إنشاء ملف المريض، لكن تعذر إنشاء الفاتورة الأولية: " + invoiceError.message);
      }
    }

    if (body.appointment && typeof body.appointment === "object" && hasStaffPermission(staff, "edit_appointments")) {
      const appointment = {
        id: body.appointment.id,
        clinic_id: clinicId,
        patient_id: data.id,
        patient_name: patient.nameAr,
        doctor_name: body.appointment.doctor_name || null,
        appointment_type: body.appointment.appointment_type || null,
        status: body.appointment.status || "مؤكد",
        start_time: body.appointment.start_time,
        end_time: body.appointment.end_time,
      };
      const { error: appointmentError } = await admin.from("appointments").insert(appointment);
      if (appointmentError) {
        console.error("[Patients API] Initial appointment insert failed:", appointmentError);
        warnings.push("تم إنشاء ملف المريض، لكن تعذر إنشاء الموعد الأول: " + appointmentError.message);
      }
    }

    if (body.invoice && !hasStaffPermission(staff, "create_invoice")) {
      warnings.push("تم إنشاء ملف المريض، لكن لم تُنشأ الفاتورة لعدم توفر صلاحية إنشاء الفواتير.");
    }
    if (body.appointment && !hasStaffPermission(staff, "edit_appointments")) {
      warnings.push("تم إنشاء ملف المريض، لكن لم يُنشأ الموعد لعدم توفر صلاحية إدارة المواعيد.");
    }

    return NextResponse.json({ success: true, patientId: data.id, warnings }, { status: 201 });
  } catch (error) {
    console.error("[Patients API] Unexpected error:", error);
    return NextResponse.json({ error: "حدث خطأ غير متوقع أثناء حفظ المريض" }, { status: 500 });
  }
}
