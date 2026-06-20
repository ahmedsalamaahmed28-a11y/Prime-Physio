import { NextRequest, NextResponse } from "next/server";
import { getAdminClient } from "@/lib/supabase";
import bcrypt from "bcryptjs";

export async function POST(req: NextRequest) {
  try {
    const { email, code, clinicName, phone, password, role } = await req.json();

    if (!email || !code || !clinicName || phone === undefined || !password || !role) {
      return NextResponse.json({ error: "جميع الحقول مطلوبة" }, { status: 400 });
    }

    const admin = getAdminClient();
    const cleanEmail = email.toLowerCase().trim();

    // Verify the code from app_key_values
    const key = `verification_${cleanEmail.replace(/[^a-z0-9]/g, "_")}`;
    const { data: kv } = await admin
      .from("app_key_values")
      .select("value")
      .eq("key", key)
      .maybeSingle();

    if (!kv) {
      return NextResponse.json({ error: "لم يتم طلب رمز تحقق" }, { status: 400 });
    }

    const stored = kv.value as { code: string; expires_at: number; used: boolean };

    if (stored.used) {
      return NextResponse.json({ error: "رمز التحقق مستخدم بالفعل" }, { status: 400 });
    }

    if (stored.code !== code) {
      return NextResponse.json({ error: "رمز التحقق غير صحيح" }, { status: 400 });
    }

    if (Date.now() > stored.expires_at) {
      return NextResponse.json({ error: "انتهت صلاحية رمز التحقق" }, { status: 400 });
    }

    // Mark code as used
    await admin.from("app_key_values").upsert({
      key,
      value: { ...stored, used: true },
    });

    // Check race condition
    const { data: existing } = await admin
      .from("auth_accounts")
      .select("id")
      .eq("email", cleanEmail)
      .maybeSingle();

    if (existing) {
      return NextResponse.json({ error: "البريد الإلكتروني مسجل بالفعل" }, { status: 400 });
    }

    // Create auth_accounts entry
    const passwordHash = await bcrypt.hash(password, 10);
    const { data: authRecord, error: authError } = await admin
      .from("auth_accounts")
      .insert({ email: cleanEmail, password_hash: passwordHash })
      .select("id")
      .single();

    if (authError || !authRecord) {
      return NextResponse.json({ error: "فشل إنشاء الحساب" }, { status: 500 });
    }

    const userId = authRecord.id;

    // Create clinic
    const clinicId = crypto.randomUUID();
    const { error: clinicError } = await admin.from("clinics").insert({
      id: clinicId,
      name: clinicName,
      admin_email: cleanEmail,
      phone: phone || null,
      status: "active",
    });

    if (clinicError) {
      try { await admin.from("auth_accounts").delete().eq("id", userId); } catch {}
      return NextResponse.json({ error: "فشل إنشاء العيادة" }, { status: 500 });
    }

    // Create staff record
    const roleKey = role === "receptionist" ? "receptionist" : "admin";
    const { error: staffError } = await admin.from("staff").insert({
      clinic_id: clinicId,
      name: clinicName,
      email,
      phone: phone || null,
      role: roleKey,
      status: "نشط",
    });

    if (staffError) {
      try { await admin.from("clinics").delete().eq("id", clinicId); } catch {}
      try { await admin.from("auth_accounts").delete().eq("id", userId); } catch {}
      return NextResponse.json({ error: "فشل إنشاء بيانات الموظف" }, { status: 500 });
    }

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
    console.error("[VerifyEmail] Error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
