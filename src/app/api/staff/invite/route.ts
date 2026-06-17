import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/app/api/utils/auth";
import { getAdminClient } from "@/lib/supabase";
import bcrypt from "bcryptjs";

export async function POST(req: NextRequest) {
  try {
    const { name, email, password, role, clinicId, phone } = await req.json();

    if (!name || !email || !password || !role || !clinicId) {
      return NextResponse.json({ error: "جميع الحقول المطلوبة" }, { status: 400 });
    }

    // Get the authenticated user
    let authedUser;
    try {
      authedUser = await requireAuth(req);
    } catch {
      return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
    }

    const admin = getAdminClient();

    // Verify the requester is an admin of this clinic
    const { data: adminStaff } = await admin
      .from("staff")
      .select("role")
      .eq("email", authedUser.email)
      .eq("clinic_id", clinicId)
      .maybeSingle();

    if (!adminStaff || (adminStaff.role !== "admin" && adminStaff.role !== "مدير العياده")) {
      return NextResponse.json({ error: "غير مصرح بإضافة موظفين" }, { status: 403 });
    }

    // Check if email already in auth_accounts
    const { data: existing } = await admin
      .from("auth_accounts")
      .select("id")
      .eq("email", email.toLowerCase().trim())
      .maybeSingle();

    if (existing) {
      return NextResponse.json({ error: "البريد الإلكتروني مستخدم بالفعل" }, { status: 400 });
    }

    // Hash password and create auth_accounts entry
    const passwordHash = await bcrypt.hash(password, 10);
    const { error: authError } = await admin
      .from("auth_accounts")
      .insert({ email: email.toLowerCase().trim(), password_hash: passwordHash });

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
      try { await admin.from("auth_accounts").delete().eq("email", email.toLowerCase().trim()); } catch {}
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
