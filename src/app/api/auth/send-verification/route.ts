import { NextRequest, NextResponse } from "next/server";
import { randomInt } from "crypto";
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

    const code = randomInt(100000, 1000000).toString();
    const expiresAt = Date.now() + 10 * 60 * 1000;
    const key = `verification_${cleanEmail.replace(/[^a-z0-9]/g, "_")}`;

    await admin.from("app_key_values").upsert({
      key,
      value: { code, expires_at: expiresAt, used: false },
    });

    const sent = await sendVerificationCode(cleanEmail, code);

    if (!sent && process.env.NODE_ENV === "production") {
      return NextResponse.json({ sent: false, error: "Unable to send verification email" }, { status: 503 });
    }
    return NextResponse.json({ sent, ...(process.env.NODE_ENV !== "production" && !sent ? { devCode: code } : {}) });
  } catch (err) {
    console.error("[SendVerification] Error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
