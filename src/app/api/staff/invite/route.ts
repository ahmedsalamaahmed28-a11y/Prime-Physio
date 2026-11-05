import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/app/api/utils/auth";
import { getAdminClient } from "@/lib/supabase-admin";
import bcrypt from "bcryptjs";
import { validateNewPassword } from "@/lib/passwordSecurity";

const VALID_STAFF_ROLES = ["استشاري علاج طبيعي", "أخصائي علاج طبيعي", "ممارس علاج طبيعي", "موظف استقبال"];

export async function POST(req: NextRequest) {
  try {
    const { name, email: rawEmail, password, role, clinicId, phone } = await req.json();

    if (!name || !rawEmail || !password || !role || !clinicId) {
      return NextResponse.json({ error: "جميع الحقول المطلوبة" }, { status: 400 });
    }
    const email = rawEmail.toLowerCase().trim();

    // Only an authenticated administrator may invite staff into their own clinic.
    let session;
    try {
      session = await requireRole(req, ["admin"]);
    } catch {
      return NextResponse.json({ error: "غير مصرح" }, { status: 403 });
    }

    if (!session.clinicId || session.clinicId !== clinicId) {
      return NextResponse.json({ error: "لا يمكنك إضافة موظفين إلى عيادة أخرى" }, { status: 403 });
    }

    try {
      await validateNewPassword(password);
    } catch (error) {
      return NextResponse.json(
        { error: error instanceof Error ? error.message : "كلمة المرور غير مستوفية للشروط" },
        { status: 400 }
      );
    }

    // Prevent creating more admins via staff invite
    if (role === "admin" || role === "مدير العياده") {
      return NextResponse.json({ error: "لا يمكن إنشاء مدير جديد من هنا. المدير الوحيد يتم إنشاؤه أثناء تسجيل العيادة." }, { status: 403 });
    }

    // Only allow valid staff roles
    if (!VALID_STAFF_ROLES.includes(role)) {
      return NextResponse.json({ error: "دور غير صالح. الأدوار المسموحة: استشاري، أخصائي، ممارس، موظف استقبال" }, { status: 400 });
    }

    const admin = getAdminClient();

    // Check both identity and staff tables to avoid duplicate/cross-clinic identities.
    const [{ data: existing }, { data: existingStaff }] = await Promise.all([
      admin.from("auth_accounts").select("id").eq("email", email).maybeSingle(),
      admin.from("staff").select("id").eq("email", email).maybeSingle(),
    ]);

    if (existing || existingStaff) {
      return NextResponse.json({ error: "البريد الإلكتروني مستخدم بالفعل" }, { status: 400 });
    }

    // Hash password and create auth_accounts entry
    const passwordHash = await bcrypt.hash(password, 10);
    const { error: authError } = await admin
      .from("auth_accounts")
      .insert({ email, password_hash: passwordHash, verified: true });

    if (authError) {
      console.error("[StaffInvite] Failed to create auth_accounts:", authError.message);
      return NextResponse.json({ error: "فشل إنشاء الحساب" }, { status: 500 });
    }

    // Create staff record
    const { error: staffError } = await admin.from("staff").insert({
      clinic_id: clinicId,
      name,
      email,
      phone: phone || "",
      role,
      status: "نشط",
    });

    if (staffError) {
      // Rollback auth_accounts
      try { await admin.from("auth_accounts").delete().eq("email", email); } catch {}
      console.error("[StaffInvite] Failed to create staff:", staffError.message);
      return NextResponse.json({ error: "فشل إنشاء بيانات الموظف" }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[StaffInvite] Error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal server error" },
      { status: 500 }
    );
  }
}
