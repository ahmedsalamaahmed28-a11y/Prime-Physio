import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/pages/api/auth/[...nextauth]";
import { getAdminClient } from "@/lib/supabase-admin";

export const dynamic = "force-dynamic";
export const revalidate = 0;

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
    console.error("[Patient Clinical API] Staff lookup failed:", error);
    return { error: NextResponse.json({ error: "تعذر التحقق من صلاحية الحساب" }, { status: 503 }) };
  }
  if (!staff?.clinic_id || staff.status === "محذوف") {
    return { error: NextResponse.json({ error: "لا توجد صلاحية نشطة لهذه العيادة" }, { status: 403 }) };
  }
  return { admin, clinicId: staff.clinic_id };
}

async function verifyPatient(admin: ReturnType<typeof getAdminClient>, patientId: string, clinicId: string) {
  const { data, error } = await admin
    .from("patients")
    .select("id")
    .eq("id", patientId)
    .eq("clinic_id", clinicId)
    .maybeSingle();
  if (error) throw error;
  return Boolean(data);
}

export async function GET(_request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const auth = await getAuthorizedClinic();
  if ("error" in auth) return auth.error;
  const { id } = await context.params;

  try {
    if (!(await verifyPatient(auth.admin, id, auth.clinicId))) {
      return NextResponse.json({ error: "المريض غير موجود في العيادة الحالية" }, { status: 404 });
    }

    const [evaluations, plans, programs, progress] = await Promise.all([
      auth.admin.from("patient_evaluations").select("id,evaluation_date,evaluation_type,vas_score,notes").eq("clinic_id", auth.clinicId).eq("patient_id", id).order("evaluation_date", { ascending: false }),
      auth.admin.from("treatment_plans").select("id,goals,session_plan,frequency,duration,home_program,status,created_at").eq("clinic_id", auth.clinicId).eq("patient_id", id).order("created_at", { ascending: false }),
      auth.admin.from("patient_programs").select("id,title,exercises,created_at").eq("clinic_id", auth.clinicId).eq("patient_id", id).neq("title", "__prime_physio_active_protocol_state__").order("created_at", { ascending: false }),
      auth.admin.from("progress_tracking").select("id,pain_before,pain_level,rom_status,strength_status,recovery_score,completed_exercises,appointment_id,session_id,notes,created_at,session:sessions!progress_tracking_session_id_fkey(intervention,session_objectives,target_exercises)").eq("clinic_id", auth.clinicId).eq("patient_id", id).order("created_at", { ascending: false }),
    ]);

    const failed = [evaluations, plans, programs, progress].find((result) => result.error);
    if (failed?.error) {
      console.error("[Patient Clinical API] History load failed:", failed.error);
      return NextResponse.json({ error: "تعذر تحميل السجل العلاجي" }, { status: 500 });
    }

    return NextResponse.json({
      evaluations: evaluations.data || [],
      plans: plans.data || [],
      programs: programs.data || [],
      progress: progress.data || [],
    });
  } catch (error) {
    console.error("[Patient Clinical API] Unexpected history error:", error);
    return NextResponse.json({ error: "حدث خطأ أثناء تحميل السجل العلاجي" }, { status: 500 });
  }
}

export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const auth = await getAuthorizedClinic();
  if ("error" in auth) return auth.error;
  const { id } = await context.params;

  const inserted: { table: string; id: string }[] = [];
  const cleanup = async () => {
    for (const item of inserted.reverse()) {
      await auth.admin.from(item.table).delete().eq("id", item.id).eq("clinic_id", auth.clinicId);
    }
  };

  try {
    const body = await request.json();
    if (!body || typeof body !== "object" || Array.isArray(body)) {
      return NextResponse.json({ error: "بيانات الحفظ غير صالحة" }, { status: 400 });
    }
    if (!(await verifyPatient(auth.admin, id, auth.clinicId))) {
      return NextResponse.json({ error: "المريض غير موجود في العيادة الحالية" }, { status: 404 });
    }

    if (body.action === "progress") {
      const progress = body.progress || {};
      const pain = Number(progress.pain);
      const recovery = Number(progress.recovery);
      if (!Number.isInteger(pain) || pain < 0 || pain > 10) {
        return NextResponse.json({ error: "درجة الألم يجب أن تكون من 0 إلى 10" }, { status: 400 });
      }
      if (!Number.isInteger(recovery) || recovery < 0 || recovery > 100) {
        return NextResponse.json({ error: "مؤشر التعافي يجب أن يكون من 0 إلى 100" }, { status: 400 });
      }

      const { error } = await auth.admin.from("progress_tracking").insert({
        clinic_id: auth.clinicId,
        patient_id: id,
        pain_level: pain,
        rom_status: progress.rom || null,
        strength_status: progress.strength || null,
        recovery_score: recovery,
        notes: progress.notes || null,
      });
      if (error) throw error;
      return NextResponse.json({ success: true });
    }

    if (body.action !== "care_plan") {
      return NextResponse.json({ error: "نوع العملية غير معروف" }, { status: 400 });
    }

    const evaluation = body.evaluation || {};
    const plan = body.plan || {};
    const vas = Number(evaluation.vas);
    if (!Number.isInteger(vas) || vas < 0 || vas > 10) {
      return NextResponse.json({ error: "درجة الألم يجب أن تكون من 0 إلى 10" }, { status: 400 });
    }
    if (typeof plan.goals !== "string" || !plan.goals.trim() || typeof plan.sessionPlan !== "string" || !plan.sessionPlan.trim()) {
      return NextResponse.json({ error: "الأهداف العلاجية وخطة الجلسات مطلوبتان" }, { status: 400 });
    }

    const specialTests = String(evaluation.specialTests || "").split("\n").map((line: string) => line.trim()).filter(Boolean);
    const exercises = Array.isArray(plan.exercises)
      ? plan.exercises.filter((item: unknown) => item && typeof item === "object")
      : [];

    const { data: assessment, error: assessmentError } = await auth.admin
      .from("assessments")
      .insert({
        clinic_id: auth.clinicId,
        patient_id: id,
        symptoms: evaluation.symptoms || null,
        rom: JSON.stringify({ notes: evaluation.rom || "" }),
        strength: JSON.stringify({ notes: evaluation.strength || "" }),
        special_tests: specialTests.join("\n"),
        potential_diagnoses: evaluation.potentialDiagnoses || null,
        red_flags: evaluation.redFlags || null,
        clinical_summary: evaluation.summary || null,
      })
      .select("id")
      .single();
    if (assessmentError) throw assessmentError;
    inserted.push({ table: "assessments", id: assessment.id });

    const { data: savedEvaluation, error: evaluationError } = await auth.admin
      .from("patient_evaluations")
      .insert({
        clinic_id: auth.clinicId,
        patient_id: id,
        evaluation_type: String(evaluation.type || "Initial"),
        vas_score: vas,
        rom_data: { notes: evaluation.rom || "" },
        mmt_data: { notes: evaluation.strength || "" },
        special_tests: specialTests,
        notes: evaluation.summary || null,
      })
      .select("id")
      .single();
    if (evaluationError) throw evaluationError;
    inserted.push({ table: "patient_evaluations", id: savedEvaluation.id });

    const { data: savedPlan, error: planError } = await auth.admin
      .from("treatment_plans")
      .insert({
        clinic_id: auth.clinicId,
        patient_id: id,
        assessment_id: assessment.id,
        goals: plan.goals,
        session_plan: plan.sessionPlan,
        frequency: plan.frequency || null,
        duration: plan.duration || null,
        home_program: plan.homeProgram || null,
        status: "active",
        target_exercises: exercises,
      })
      .select("id")
      .single();
    if (planError) throw planError;
    inserted.push({ table: "treatment_plans", id: savedPlan.id });

    const { data: savedProgram, error: programError } = await auth.admin
      .from("patient_programs")
      .insert({
        clinic_id: auth.clinicId,
        patient_id: id,
        title: String(plan.programTitle || "Home Exercise Program"),
        exercises,
      })
      .select("id")
      .single();
    if (programError) throw programError;
    inserted.push({ table: "patient_programs", id: savedProgram.id });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[Patient Clinical API] Save failed:", error);
    await cleanup();
    return NextResponse.json({ error: "تعذر حفظ بيانات التقييم والخطة العلاجية" }, { status: 500 });
  }
}
