import { NextRequest, NextResponse } from "next/server";
import { getAdminClient } from "@/lib/supabase";
import { sendVerificationCode } from "@/lib/email";

export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json();

    if (!email || !email.includes("@")) {
      return NextResponse.json({ error: "البريد الإلكتروني غير صحيح" }, { status: 400 });
    }

    const admin = getAdminClient();

    // Check if email already registered
    const { data: existing } = await admin
      .from("auth_accounts")
      .select("id")
      .eq("email", email.toLowerCase().trim())
      .maybeSingle();

    if (existing) {
      return NextResponse.json({ error: "البريد الإلكتروني مسجل بالفعل" }, { status: 400 });
    }

    // Generate 6-digit code
    const code = Math.floor(100000 + Math.random() * 900000).toString();

    // Store in DB (valid for 10 minutes)
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();

    await admin.from("verification_codes").insert({
      email: email.toLowerCase().trim(),
      code,
      expires_at: expiresAt,
    });

    // Send email
    const sent = await sendVerificationCode(email, code);

    if (!sent) {
      return NextResponse.json({ error: "فشل إرسال رمز التحقق - تأكد من إعدادات البريد" }, { status: 500 });
    }

    return NextResponse.json({ sent: true });
  } catch (err) {
    console.error("[SendVerification] Error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
