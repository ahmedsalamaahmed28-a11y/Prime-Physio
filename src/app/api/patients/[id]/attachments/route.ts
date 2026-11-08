import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/pages/api/auth/[...nextauth]";
import { getAdminClient } from "@/lib/supabase-admin";
import { canViewPatientHistory, hasStaffPermission } from "@/lib/server/staff-permissions";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const BUCKET = "patient-files";
const MAX_FILE_SIZE = 20 * 1024 * 1024;
const ALLOWED_TYPES = new Set(["application/pdf", "image/jpeg", "image/png", "image/webp"]);
const ALLOWED_CATEGORIES = new Set(["imaging", "lab", "report", "other"]);

async function authorize() {
  const session = await getServerSession(authOptions);
  const email = session?.user?.email?.toLowerCase().trim();
  if (!email) {
    return { error: NextResponse.json({ error: "يجب تسجيل الدخول أولاً" }, { status: 401 }) };
  }

  const admin = getAdminClient();
  const { data: staff, error } = await admin
    .from("staff")
    .select("id,clinic_id,status,role,permissions")
    .eq("email", email)
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error("[Patient Attachments] Staff lookup failed:", error);
    return { error: NextResponse.json({ error: "تعذر التحقق من صلاحية الحساب" }, { status: 503 }) };
  }
  if (!staff?.clinic_id || staff.status === "محذوف") {
    return { error: NextResponse.json({ error: "لا توجد صلاحية نشطة لهذه العيادة" }, { status: 403 }) };
  }
  return { admin, clinicId: staff.clinic_id, staff };
}

export async function GET(_request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const auth = await authorize();
  if ("error" in auth) return auth.error;
  if (!canViewPatientHistory(auth.staff)) {
    return NextResponse.json({ error: "ليس لديك صلاحية الاطلاع على المرفقات الطبية" }, { status: 403 });
  }

  const { id } = await context.params;
  const { data: patient, error: patientError } = await auth.admin
    .from("patients").select("id").eq("id", id).eq("clinic_id", auth.clinicId).maybeSingle();
  if (patientError) return NextResponse.json({ error: "تعذر التحقق من ملف المريض" }, { status: 500 });
  if (!patient) return NextResponse.json({ error: "المريض غير موجود" }, { status: 404 });

  const { data, error } = await auth.admin
    .from("patient_attachments")
    .select("id,file_name,mime_type,file_size,category,notes,created_at,file_path")
    .eq("patient_id", id)
    .eq("clinic_id", auth.clinicId)
    .order("created_at", { ascending: false });
  if (error) {
    console.error("[Patient Attachments] List failed:", error);
    return NextResponse.json({ error: "تعذر تحميل المرفقات" }, { status: 500 });
  }

  const attachments = await Promise.all((data || []).map(async (item) => {
    const { data: signed, error: signedError } = await auth.admin.storage
      .from(BUCKET).createSignedUrl(item.file_path, 300);
    if (signedError) {
      console.error("[Patient Attachments] Signed URL failed:", signedError);
      return { ...item, url: null };
    }
    const { file_path, ...safeItem } = item;
    return { ...safeItem, url: signed?.signedUrl || null };
  }));

  return NextResponse.json({ attachments }, {
    headers: { "Cache-Control": "no-store, private" },
  });
}

export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const auth = await authorize();
  if ("error" in auth) return auth.error;
  if (!hasStaffPermission(auth.staff, "edit_emr")) {
    return NextResponse.json({ error: "ليس لديك صلاحية رفع المرفقات الطبية" }, { status: 403 });
  }

  const { id } = await context.params;
  try {
    const form = await request.formData();
    const file = form.get("file");
    if (!(file instanceof File)) {
      return NextResponse.json({ error: "اختر ملفًا أولاً" }, { status: 400 });
    }
    if (!file.size || file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: "الحد الأقصى لحجم الملف 20 ميجابايت" }, { status: 400 });
    }
    if (!ALLOWED_TYPES.has(file.type)) {
      return NextResponse.json({ error: "الصيغ المسموح بها PDF وJPG وPNG وWebP فقط" }, { status: 400 });
    }

    const { data: patient, error: patientError } = await auth.admin
      .from("patients").select("id,branch_id").eq("id", id).eq("clinic_id", auth.clinicId).maybeSingle();
    if (patientError) throw patientError;
    if (!patient) return NextResponse.json({ error: "المريض غير موجود في العيادة الحالية" }, { status: 404 });

    const categoryValue = String(form.get("category") || "other");
    const category = ALLOWED_CATEGORIES.has(categoryValue) ? categoryValue : "other";
    const notes = String(form.get("notes") || "").trim().slice(0, 1000);
    const safeName = file.name.normalize("NFKC").replace(/[^\p{L}\p{N}._-]+/gu, "_").slice(-120) || "attachment";
    const filePath = `${auth.clinicId}/${id}/${crypto.randomUUID()}-${safeName}`;

    const bytes = new Uint8Array(await file.arrayBuffer());
    const { error: uploadError } = await auth.admin.storage.from(BUCKET).upload(filePath, bytes, {
      contentType: file.type,
      upsert: false,
    });
    if (uploadError) throw uploadError;

    const { data: attachment, error: insertError } = await auth.admin
      .from("patient_attachments")
      .insert({
        clinic_id: auth.clinicId,
        branch_id: patient.branch_id,
        patient_id: id,
        uploaded_by_staff_id: auth.staff.id,
        file_path: filePath,
        file_name: file.name.slice(0, 255),
        mime_type: file.type,
        file_size: file.size,
        category,
        notes: notes || null,
      })
      .select("id,file_name,mime_type,file_size,category,notes,created_at")
      .single();

    if (insertError) {
      await auth.admin.storage.from(BUCKET).remove([filePath]);
      throw insertError;
    }
    return NextResponse.json({ success: true, attachment }, { status: 201 });
  } catch (error) {
    console.error("[Patient Attachments] Upload failed:", error);
    return NextResponse.json({ error: "تعذر رفع الملف. حاول مرة أخرى." }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const auth = await authorize();
  if ("error" in auth) return auth.error;
  if (!hasStaffPermission(auth.staff, "delete_emr")) {
    return NextResponse.json({ error: "ليس لديك صلاحية حذف المرفقات الطبية" }, { status: 403 });
  }

  const { id } = await context.params;
  try {
    const body = await request.json();
    if (typeof body?.attachmentId !== "string") {
      return NextResponse.json({ error: "رقم المرفق غير صالح" }, { status: 400 });
    }
    const { data: attachment, error: lookupError } = await auth.admin
      .from("patient_attachments")
      .select("id,file_path")
      .eq("id", body.attachmentId)
      .eq("patient_id", id)
      .eq("clinic_id", auth.clinicId)
      .maybeSingle();
    if (lookupError) throw lookupError;
    if (!attachment) return NextResponse.json({ error: "المرفق غير موجود" }, { status: 404 });

    const { error: removeError } = await auth.admin.storage.from(BUCKET).remove([attachment.file_path]);
    if (removeError) throw removeError;
    const { error: deleteError } = await auth.admin
      .from("patient_attachments")
      .delete()
      .eq("id", attachment.id)
      .eq("clinic_id", auth.clinicId);
    if (deleteError) throw deleteError;
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[Patient Attachments] Delete failed:", error);
    return NextResponse.json({ error: "تعذر حذف المرفق" }, { status: 500 });
  }
}
