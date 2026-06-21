import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/app/api/utils/auth";
import { getAdminClient } from "@/lib/supabase";
import bcrypt from "bcryptjs";

const VALID_STAFF_ROLES = ["استشاري علاج طبيعي", "أخصائي علاج طبيعي", "ممارس علاج طبيعي", "موظف استقبال"];

export async function POST(req: NextRequest) {
  try {
    const { name, email, password, role, clinicId, phone } = await req.json();

    if (!name || !email || !password || !role || !clinicId) {
      return NextResponse.json({ error: "جميع الحقول المطلوبة" }, { status: 400 });
    }

    // Only admin can add staff — server-side enforced
    try {
      await requireRole(req, ["admin"]);
    } catch {
      return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
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
      .insert({ email: email.toLowerCase().trim(), password_hash: passwordHash, verified: true });

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
