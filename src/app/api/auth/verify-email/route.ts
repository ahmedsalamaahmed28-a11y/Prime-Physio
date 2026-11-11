import { NextRequest, NextResponse } from "next/server";
import { getAdminClient } from "@/lib/supabase-admin";
import bcrypt from "bcryptjs";
import { checkVerificationCode, consumeVerificationCode, normalizeAuthEmail } from "@/lib/verificationCodes";
import { validateNewPassword } from "@/lib/passwordSecurity";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null);
    const email = normalizeAuthEmail(body?.email);
    const code = typeof body?.code === "string" ? body.code.trim() : "";
    const phone = typeof body?.phone === "string" ? body.phone.trim() : "";
    const password = typeof body?.password === "string" ? body.password : "";
    const name = typeof body?.name === "string" ? body.name.trim().slice(0, 120) : "";
    const acceptedLegal = body?.acceptedLegal === true;

    const phoneDigits = phone.replace(/\D/g, "");
    const validPhone = /^\+?[0-9][0-9\s().-]*$/.test(phone) && phoneDigits.length >= 7 && phoneDigits.length <= 15;

    if (!email || !/^\d{6}$/.test(code) || !validPhone || phone.length > 32 || password.length < 8 || password.length > 128 || !name || !acceptedLegal) {
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
      return NextResponse.json({ error: "تعذر إنشاء الحساب أو رمز التحقق غير صالح" }, { status: 400 });
    }

    // Do not turn an existing clinic employee into an administrator during signup.
    const { data: existingStaff, error: staffLookupError } = await admin
      .from("staff")
      .select("id, clinic_id, role, status")
      .eq("email", email)
      .maybeSingle();
    if (staffLookupError) throw staffLookupError;
    if (existingStaff) {
      const staffRole = String(existingStaff.role || "").trim().toLowerCase();
      const staffStatus = String(existingStaff.status || "").trim().toLowerCase();
      const isUnassignedOwnerPlaceholder = !existingStaff.clinic_id &&
        ["admin", "clinic_admin", "مدير العيادة", "مدير العياده"].includes(staffRole) &&
        !["محذوف", "deleted", "inactive", "غير نشط"].includes(staffStatus);
      if (!isUnassignedOwnerPlaceholder) return NextResponse.json({ error: "هذا البريد مرتبط بعضوية مركز قائمة ولا يمكن استخدامه لإنشاء حساب مالك جديد." }, { status: 409 });
    }

    const codeValid = await checkVerificationCode(admin, email, "signup", code);
    if (!codeValid) {
      return NextResponse.json({ error: "رمز التحقق غير صحيح أو منتهي الصلاحية" }, { status: 400 });
    }

    try {
      await validateNewPassword(password);
    } catch (error) {
      const reason = error instanceof Error ? error.message : "";
      if (reason === "PASSWORD_TOO_WEAK") return NextResponse.json({ error: "كلمة المرور يجب أن تكون 8 أحرف على الأقل وألا تكون شائعة أو سهلة التخمين." }, { status: 400 });
      if (reason === "PASSWORD_COMPROMISED") return NextResponse.json({ error: "كلمة المرور ظهرت في تسريبات سابقة. اختر كلمة مرور مختلفة." }, { status: 400 });
      return NextResponse.json({ error: "تعذر فحص أمان كلمة المرور حاليًا. حاول مرة أخرى." }, { status: 503 });
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

    // Keep the owner's personal contact number outside the clinic-wide staff table.
    let createdStaffRecord = false;
    if (!existingStaff) {
      const { error: staffError } = await admin.from("staff").insert({
        email, name: accountName, role: "admin", status: "نشط", phone: null, clinic_id: null,
      });
      if (staffError) {
        console.error("[VerifyEmail] Staff insert failed:", staffError);
        await admin.from("auth_accounts").delete().eq("id", authRecord.id);
        return NextResponse.json({ error: "فشل إكمال إنشاء الحساب. يمكنك طلب رمز تحقق جديد والمحاولة مرة أخرى." }, { status: 500 });
      }
      createdStaffRecord = true;
    }

    const { error: contactError } = await admin.rpc("store_clinic_owner_contact", {
      p_email: email,
      p_phone: phone,
    });

    if (contactError) {
      console.error("[VerifyEmail] Owner contact storage failed:", contactError);
      if (createdStaffRecord) await admin.from("staff").delete().eq("email", email).is("clinic_id", null);
      await admin.from("auth_accounts").delete().eq("id", authRecord.id);
      return NextResponse.json({ error: "فشل حفظ بيانات التواصل بشكل آمن. يمكنك طلب رمز تحقق جديد والمحاولة مرة أخرى." }, { status: 500 });
    }

    const forwardedFor = req.headers.get("x-forwarded-for");
    const candidateIp = forwardedFor?.split(",")[0]?.trim() || req.headers.get("x-real-ip");
    const ipAddress = candidateIp && /^[0-9a-fA-F:.]+$/.test(candidateIp) ? candidateIp : null;
    const userAgent = req.headers.get("user-agent")?.slice(0, 500) || null;
    const { error: legalError } = await admin.from("legal_acceptances").insert({
      email,
      accepted_terms: true,
      accepted_privacy: true,
      terms_version: "2026-11-09-v1",
      privacy_policy_version: "2026-11-09-v1",
      accepted_at: new Date().toISOString(),
      ip_address: ipAddress,
      user_agent: userAgent,
    });

    if (legalError) {
      console.error("[VerifyEmail] Legal acceptance record failed:", legalError);
      if (createdStaffRecord) await admin.from("staff").delete().eq("email", email).is("clinic_id", null);
      await admin.from("auth_accounts").delete().eq("id", authRecord.id);
      return NextResponse.json({ error: "تعذر تسجيل موافقتك على الشروط. لم يتم إكمال إنشاء الحساب؛ حاول مرة أخرى." }, { status: 500 });
    }

    return NextResponse.json({ success: true, id: authRecord.id });
  } catch (error) {
    console.error("[VerifyEmail] Error:", error);
    return NextResponse.json({ error: "تعذر إكمال إنشاء الحساب حاليًا" }, { status: 500 });
  }
}
