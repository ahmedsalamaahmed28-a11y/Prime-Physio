import { NextRequest, NextResponse } from "next/server";
import { randomInt, createHmac } from "crypto";
import { getAdminClient } from "@/lib/supabase";
import { sendVerificationCode } from "@/lib/email";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const email = typeof body?.email === "string" ? body.email.toLowerCase().trim() : "";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) {
      return NextResponse.json({ error: "يرجى إدخال بريد إلكتروني صحيح" }, { status: 400 });
    }
    const generic = NextResponse.json({ success: true });
    const pepper = process.env.AUTH_OTP_SECRET || process.env.NEXTAUTH_SECRET;
    if (!pepper || pepper.length < 32) {
      console.error("[ForgotPassword] OTP secret is not configured");
      return NextResponse.json({ error: "خدمة استعادة كلمة المرور غير مهيأة" }, { status: 503 });
    }
    const admin = getAdminClient();
    const { data: account, error: accountError } = await admin.from("auth_accounts").select("id").eq("email", email).maybeSingle();
    if (accountError) return generic;
    if (!account) {
      const { data: staff, error: staffError } = await admin.from("staff").select("id").eq("email", email).maybeSingle();
      if (staffError || !staff) return generic;
    }

    const code = randomInt(100000, 1000000).toString();
    const codeHash = createHmac("sha256", pepper).update(`password_reset:${email}:${code}`).digest("hex");
    const { data: stored, error: storeError } = await admin.rpc("store_auth_verification_code", {
      p_email: email, p_purpose: "password_reset", p_code_hash: codeHash,
      p_expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
    });
    if (storeError) {
      console.error("[ForgotPassword] Secure code storage failed:", storeError.message);
      return generic;
    }
    if (stored !== true) return NextResponse.json({ success: true, message: "يرجى الانتظار قبل طلب رمز جديد" });
    const sent = await sendVerificationCode(email, code);
    if (!sent && process.env.NODE_ENV === "production") {
      return NextResponse.json({ success: true });
    }
    return NextResponse.json({ success: true, ...(process.env.NODE_ENV !== "production" && !sent ? { devCode: code } : {}) });
  } catch (err) {
    console.error("[ForgotPassword] Error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
