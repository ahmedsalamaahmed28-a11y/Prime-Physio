import { NextRequest, NextResponse } from "next/server";
import { getAdminClient } from "@/lib/supabase-admin";
import bcrypt from "bcryptjs";
import { consumeVerificationCode, normalizeAuthEmail } from "@/lib/verificationCodes";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null);
    const email = normalizeAuthEmail(body?.email);
    const code = typeof body?.code === "string" ? body.code.trim() : "";
    const clinicName = typeof body?.clinicName === "string" ? body.clinicName.trim() : "";
    const phone = typeof body?.phone === "string" ? body.phone.trim() : "";
    const password = typeof body?.password === "string" ? body.password : "";
    const name = typeof body?.name === "string" ? body.name.trim().slice(0, 120) : "";

    if (!email || !/^\d{6}$/.test(code) || !clinicName || clinicName.length > 160 || !phone || phone.length > 32 || password.length < 10 || password.length > 128) {
      return NextResponse.json({ error: "يرجى مراجعة جميع الحقول المطلوبة" }, { status: 400 });
    }

    const admin = getAdminClient();
    const { data: existingAccount, error: accountLookupError } = await admin
      .from("auth_accounts")
      .select("id")
      .eq("email", email)
      .maybeSingle();
    if (accountLookupError) throw accountLookupError;
    if (existingAccount) {
      return NextResponse.json({ error: "تعذر إنشاء الحساب بهذه البيانات" }, { status: 409 });
    }

    // Do not turn an existing clinic employee into an administrator during signup.
    const { data: existingStaff, error: staffLookupError } = await admin
      .from("staff")
      .select("id")
      .eq("email", email)
      .maybeSingle();
    if (staffLookupError) throw staffLookupError;
    if (existingStaff) {
      return NextResponse.json({ error: "تعذر إنشاء الحساب بهذه البيانات" }, { status: 409 });
    }

    const consumed = await consumeVerificationCode(admin, email, "signup", code);
    if (!consumed) {
      return NextResponse.json({ error: "رمز التحقق غير صحيح أو منتهي الصلاحية أو تم استخدامه" }, { status: 400 });
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const accountName = name || email.split("@")[0];

    const { data: authRecord, error: authError } = await admin
      .from("auth_accounts")
      .insert({
        email,
        password_hash: passwordHash,
        verified: true,
        name: accountName,
        provider: "email",
        role: "admin",
      })
      .select("id")
      .single();

    if (authError || !authRecord) {
      console.error("[VerifyEmail] Account creation failed:", authError);
      return NextResponse.json({ error: "فشل إنشاء الحساب. يمكنك طلب رمز تحقق جديد والمحاولة مرة أخرى." }, { status: 500 });
    }

    const { error: staffError } = await admin.from("staff").insert({
      email,
      name: accountName,
      role: "admin",
      status: "نشط",
      clinic_id: null,
    });

    if (staffError) {
      console.error("[VerifyEmail] Staff insert failed:", staffError);
      await admin.from("auth_accounts").delete().eq("id", authRecord.id);
      return NextResponse.json({ error: "فشل إكمال إنشاء الحساب. يمكنك طلب رمز تحقق جديد والمحاولة مرة أخرى." }, { status: 500 });
    }

    return NextResponse.json({ success: true, id: authRecord.id });
  } catch (error) {
    console.error("[VerifyEmail] Error:", error);
    return NextResponse.json({ error: "تعذر إكمال إنشاء الحساب حاليًا" }, { status: 500 });
  }
}
