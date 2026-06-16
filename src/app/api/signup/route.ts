import { NextRequest, NextResponse } from "next/server";
import { getAdminClient } from "@/lib/supabase";

export async function POST(req: NextRequest) {
  try {
    const { email, password, clinicName, phone, role } = await req.json();

    if (!email || !password || !clinicName || !phone || !role) {
      return NextResponse.json({ error: "جميع الحقول المطلوبة" }, { status: 400 });
    }

    const admin = getAdminClient();

    // 1. Create auth user
    const { data: authUser, error: createError } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: clinicName, clinic_name: clinicName, phone, role },
    });

    if (createError) {
      return NextResponse.json(
        { error: createError.message === "User already registered" ? "User already registered" : "فشل إنشاء الحساب" },
        { status: 400 }
      );
    }

    const userId = authUser.user?.id;
    if (!userId) {
      return NextResponse.json({ error: "فشل إنشاء الحساب" }, { status: 500 });
    }

    // 2. Create clinic
    const clinicId = crypto.randomUUID();
    const { error: clinicError } = await admin.from("clinics").insert({
      id: clinicId,
      name: clinicName,
      phone,
      email,
      is_active: true,
      created_at: new Date().toISOString(),
    });

    if (clinicError) {
      // Cleanup: delete auth user if clinic creation fails
      await admin.auth.admin.deleteUser(userId).catch(() => {});
      return NextResponse.json({ error: "فشل إنشاء العيادة" }, { status: 500 });
    }

    // 3. Create staff record (clinic admin)
    const roleKey = role === "receptionist" ? "receptionist" : "admin";
    const { error: staffError } = await admin.from("staff").insert({
      clinic_id: clinicId,
      name: clinicName,
      email,
      phone,
      role: roleKey,
      status: "نشط",
    });

    if (staffError) {
      try { await admin.from("clinics").delete().eq("id", clinicId); } catch {}
      try { await admin.auth.admin.deleteUser(userId); } catch {}
      return NextResponse.json({ error: "فشل إنشاء بيانات الموظف" }, { status: 500 });
    }

    // 4. Create default clinic_settings
    try {
      await admin.from("clinic_settings").upsert({
        clinic_id: clinicId,
        user_id: userId,
        clinic_name: clinicName,
        phone,
      });
    } catch {}

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[Signup] Error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal server error" },
      { status: 500 }
    );
  }
}
