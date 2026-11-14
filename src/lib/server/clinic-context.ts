import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/app/api/utils/auth";
import { getAdminClient } from "@/lib/supabase-admin";

export async function getClinicContext(req: NextRequest) {
  try {
    // requireRole resolves the active clinic from the verified session/shadow token
    // and verifies either clinic_owners membership or an active staff membership.
    const user = await requireRole(req, ["admin", "doctor", "receptionist"]);
    if (!user.clinicId) {
      return { response: NextResponse.json({ error: "يرجى اختيار المركز ثم تسجيل الدخول مرة أخرى" }, { status: 403 }) };
    }

    const admin = getAdminClient();
    const { data: staff, error } = await admin
      .from("staff")
      .select("id,clinic_id,status,role,permissions")
      .eq("email", user.email)
      .eq("clinic_id", user.clinicId)
      .limit(1)
      .maybeSingle();

    if (error) {
      console.error("[Clinic Context] Staff lookup failed:", error);
      return { response: NextResponse.json({ error: "تعذر التحقق من صلاحية الحساب" }, { status: 503 }) };
    }

    // A verified clinic owner may not have a staff row. Treat the owner as
    // clinic admin, but keep all subsequent queries scoped to this clinic ID.
    const clinicStaff = staff || {
      clinic_id: user.clinicId,
      status: "active",
      role: "admin",
      permissions: null,
      id: undefined,
    };

    return { admin, clinicId: user.clinicId, staff: clinicStaff };
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    const unauthorized = /unauthorized/i.test(message);
    const forbidden = /forbidden|غير مصرح|صلاحية غير كافية|عضوية نشطة|اختيار مركز/i.test(message);
    return {
      response: NextResponse.json(
        { error: unauthorized ? "يجب تسجيل الدخول أولاً" : forbidden ? "لا توجد صلاحية نشطة لهذا المركز" : "تعذر التحقق من صلاحية الحساب" },
        { status: unauthorized ? 401 : forbidden ? 403 : 503 }
      ),
    };
  }
}
