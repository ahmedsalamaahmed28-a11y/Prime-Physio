import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/app/api/utils/auth";
import { getAdminClient } from "@/lib/supabase";
import bcrypt from "bcryptjs";

const VALID_STAFF_ROLES = ["استشاري علاج طبيعي", "أخصائي علاج طبيعي", "ممارس علاج طبيعي", "موظف استقبال"];

export async function POST(req: NextRequest) {
  try {
    const user = await requireRole(req, ["admin"]);
    const body = await req.json();
    const name = typeof body?.name === "string" ? body.name.trim() : "";
    const email = typeof body?.email === "string" ? body.email.toLowerCase().trim() : "";
    const password = typeof body?.password === "string" ? body.password : "";
    const role = typeof body?.role === "string" ? body.role : "";
    const clinicId = typeof body?.clinicId === "string" ? body.clinicId : "";
    const phone = typeof body?.phone === "string" ? body.phone.trim() : "";

    if (!name || name.length > 120 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || !password || !role || !clinicId) {
      return NextResponse.json({ error: "يرجى مراجعة الحقول المطلوبة" }, { status: 400 });
    }
    if (password.length < 10 || password.length > 128) {
      return NextResponse.json({ error: "كلمة المرور يجب أن تكون بين 10 و128 حرفًا" }, { status: 400 });
    }
    if (clinicId !== user.clinicId) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    if (role === "admin" || role === "مدير العياده" || role === "مدير العيادة") {
      return NextResponse.json({ error: "لا يمكن إنشاء مدير جديد من هنا." }, { status: 403 });
    }
    if (!VALID_STAFF_ROLES.includes(role)) return NextResponse.json({ error: "دور غير صالح" }, { status: 400 });

    const admin = getAdminClient();
    const { data: existing, error: lookupError } = await admin.from("auth_accounts").select("id").eq("email", email).maybeSingle();
    if (lookupError) return NextResponse.json({ error: "تعذر التحقق من البريد" }, { status: 500 });
    if (existing) return NextResponse.json({ error: "البريد الإلكتروني مستخدم بالفعل" }, { status: 409 });

    const passwordHash = await bcrypt.hash(password, 12);
    const { error: authError } = await admin.from("auth_accounts").insert({ email, password_hash: passwordHash, verified: true });
    if (authError) {
      console.error("[StaffInvite] Account insert failed:", authError.message);
      return NextResponse.json({ error: "فشل إنشاء الحساب" }, { status: 500 });
    }
    const { error: staffError } = await admin.from("staff").insert({
      clinic_id: user.clinicId, name, email, phone, role, status: "نشط",
    });
    if (staffError) {
      await admin.from("auth_accounts").delete().eq("email", email);
      console.error("[StaffInvite] Staff insert failed:", staffError.message);
      return NextResponse.json({ error: "فشل إنشاء بيانات الموظف" }, { status: 500 });
    }
    return NextResponse.json({ success: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "";
    const status = message === "Unauthorized" ? 401 : /forbidden|insufficient|membership/i.test(message) ? 403 : 500;
    return NextResponse.json({ error: status === 401 ? "Unauthorized" : status === 403 ? "Forbidden" : "Internal server error" }, { status });
  }
}
