import { NextRequest, NextResponse } from "next/server";
import { getAdminClient } from "@/lib/supabase";
import bcrypt from "bcryptjs";

export async function POST(req: NextRequest) {
  try {
    const { email: rawEmail, password, clinicName, phone, role } = await req.json();

    if (!rawEmail || !password || !clinicName || !phone || !role) {
      return NextResponse.json({ error: "جميع الحقول المطلوبة" }, { status: 400 });
    }
    const email = rawEmail.toLowerCase().trim();

    const admin = getAdminClient();

    // Check if email already exists in auth_accounts, staff, or clinics
    const { data: existingAuth } = await admin
      .from("auth_accounts")
      .select("id")
      .eq("email", email)
      .maybeSingle();

    const { data: existingStaff } = await admin
      .from("staff")
      .select("id")
      .eq("email", email)
      .maybeSingle();

    if (existingAuth || existingStaff) {
      return NextResponse.json({ error: "البريد الإلكتروني مسجل بالفعل في النظام" }, { status: 400 });
    }

    // Hash password and store in auth_accounts
    const passwordHash = await bcrypt.hash(password, 10);
    const { data: authRecord, error: authError } = await admin
      .from("auth_accounts")
      .insert({ email, password_hash: passwordHash })
      .select("id")
      .single();

    if (authError || !authRecord) {
      console.error("[Signup] Failed to create auth account:", authError?.message);
      return NextResponse.json({ error: "فشل إنشاء الحساب" }, { status: 500 });
    }

    const userId = authRecord.id;

    // 2. Create clinic
    const clinicId = crypto.randomUUID();
    const { error: clinicError } = await admin.from("clinics").insert({
      id: clinicId,
      name: clinicName,
      phone,
      admin_email: email,
      status: "active",
    });

    if (clinicError) {
      try { await admin.from("auth_accounts").delete().eq("id", userId); } catch {}
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
      try { await admin.from("auth_accounts").delete().eq("id", userId); } catch {}
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
