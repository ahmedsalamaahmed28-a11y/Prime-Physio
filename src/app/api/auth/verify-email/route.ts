import { NextRequest, NextResponse } from "next/server";
import { getAdminClient } from "@/lib/supabase";
import bcrypt from "bcryptjs";

export async function POST(req: NextRequest) {
  try {
    const { email, code, clinicName, phone, password, role } = await req.json();

    if (!email || !code || !clinicName || !phone || !password || !role) {
      return NextResponse.json({ error: "جميع الحقول مطلوبة" }, { status: 400 });
    }

    const admin = getAdminClient();

    // Verify the code
    const { data: vc, error: vcError } = await admin
      .from("verification_codes")
      .select("id, code, expires_at")
      .eq("email", email.toLowerCase().trim())
      .eq("used", false)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (vcError || !vc) {
      return NextResponse.json({ error: "لم يتم طلب رمز تحقق" }, { status: 400 });
    }

    if (vc.code !== code) {
      return NextResponse.json({ error: "رمز التحقق غير صحيح" }, { status: 400 });
    }

    if (new Date(vc.expires_at) < new Date()) {
      return NextResponse.json({ error: "انتهت صلاحية رمز التحقق" }, { status: 400 });
    }

    // Mark code as used
    await admin.from("verification_codes").update({ used: true }).eq("id", vc.id);

    // Check if email already registered (race condition guard)
    const { data: existing } = await admin
      .from("auth_accounts")
      .select("id")
      .eq("email", email.toLowerCase().trim())
      .maybeSingle();

    if (existing) {
      return NextResponse.json({ error: "البريد الإلكتروني مسجل بالفعل" }, { status: 400 });
    }

    // Hash password and create auth_accounts entry
    const passwordHash = await bcrypt.hash(password, 10);
    const { data: authRecord, error: authError } = await admin
      .from("auth_accounts")
      .insert({ email: email.toLowerCase().trim(), password_hash: passwordHash })
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
      email,
      phone,
      is_active: true,
      created_at: new Date().toISOString(),
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
      phone,
      role: roleKey,
      status: "نشط",
    });

    if (staffError) {
      try { await admin.from("clinics").delete().eq("id", clinicId); } catch {}
      try { await admin.from("auth_accounts").delete().eq("id", userId); } catch {}
      return NextResponse.json({ error: "فشل إنشاء بيانات الموظف" }, { status: 500 });
    }

    // Create default clinic_settings
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
