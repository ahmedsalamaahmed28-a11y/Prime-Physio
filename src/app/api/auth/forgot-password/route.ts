import { NextRequest, NextResponse } from "next/server";
import { randomInt } from "crypto";
import { getAdminClient } from "@/lib/supabase";
import bcrypt from "bcryptjs";
import { sendVerificationCode } from "@/lib/email";

export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json();

    if (!email) {
      return NextResponse.json({ error: "يرجى إدخال البريد الإلكتروني" }, { status: 400 });
    }

    const admin = getAdminClient();
    const cleanEmail = email.toLowerCase().trim();

    // Check if the email exists in auth_accounts (email/password users)
    const { data: existingAuth } = await admin
      .from("auth_accounts")
      .select("id")
      .eq("email", cleanEmail)
      .maybeSingle();

    // If not found in auth_accounts, check if it's a Google OAuth user
    if (!existingAuth) {
      const { data: staffUser } = await admin
        .from("staff")
        .select("id")
        .eq("email", cleanEmail)
        .maybeSingle();

      if (!staffUser) {
        // Don't reveal that the email doesn't exist
        return NextResponse.json({ success: true });
      }
      // Google user: allow them to set a password too
    }

    // Generate 4-digit OTP
    const code = randomInt(100000, 1000000).toString();

    // Store the OTP in app_key_values
    const key = `password_reset_${cleanEmail.replace(/[^a-z0-9]/g, "_")}`;
    const expiresAt = Date.now() + 10 * 60 * 1000; // 10 minutes

    await admin.from("app_key_values").upsert({
      key,
      value: { code, expires_at: expiresAt, used: false },
    });

    // Send the OTP via email
    const emailSent = await sendVerificationCode(cleanEmail, code);

    if (!emailSent && process.env.NODE_ENV === "production") {
      return NextResponse.json({ success: false, error: "Unable to send verification email" }, { status: 503 });
    }
    return NextResponse.json({ success: true, ...(process.env.NODE_ENV !== "production" && !emailSent ? { devCode: code } : {}) });
  } catch (err) {
    console.error("[ForgotPassword] Error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
