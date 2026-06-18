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
    const cleanEmail = email.toLowerCase().trim();

    const { data: existing } = await admin
      .from("auth_accounts")
      .select("id")
      .eq("email", cleanEmail)
      .maybeSingle();

    if (existing) {
      return NextResponse.json({ error: "البريد الإلكتروني مسجل بالفعل" }, { status: 400 });
    }

    const code = Math.floor(1000 + Math.random() * 9000).toString();
    const expiresAt = Date.now() + 10 * 60 * 1000;
    const key = `verification_${cleanEmail.replace(/[^a-z0-9]/g, "_")}`;

    await admin.from("app_key_values").upsert({
      key,
      value: { code, expires_at: expiresAt, used: false },
    });

    const sent = await sendVerificationCode(cleanEmail, code);

    return NextResponse.json({
      sent,
      devCode: sent ? undefined : code,
      smtpMissing: !sent,
    });
  } catch (err) {
    console.error("[SendVerification] Error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
