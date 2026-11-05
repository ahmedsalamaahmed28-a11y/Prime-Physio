import { NextRequest, NextResponse } from "next/server";
import { randomInt, createHmac } from "crypto";
import { getAdminClient } from "@/lib/supabase";
import { sendVerificationCode } from "@/lib/email";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const email = typeof body?.email === "string" ? body.email.toLowerCase().trim() : "";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) {
      return NextResponse.json({ error: "البريد الإلكتروني غير صحيح" }, { status: 400 });
    }
    const pepper = process.env.AUTH_OTP_SECRET || process.env.NEXTAUTH_SECRET;
    if (!pepper || pepper.length < 32) {
      return NextResponse.json({ error: "خدمة التحقق غير مهيأة" }, { status: 503 });
    }
    const admin = getAdminClient();
    const { data: existing, error: lookupError } = await admin.from("auth_accounts").select("id").eq("email", email).maybeSingle();
    if (lookupError) return NextResponse.json({ error: "تعذر التحقق من البريد" }, { status: 500 });
    if (existing) return NextResponse.json({ error: "البريد الإلكتروني مسجل بالفعل" }, { status: 409 });

    const code = randomInt(100000, 1000000).toString();
    const codeHash = createHmac("sha256", pepper).update(`signup:${email}:${code}`).digest("hex");
    const { data: stored, error: storeError } = await admin.rpc("store_auth_verification_code", {
      p_email: email, p_purpose: "signup", p_code_hash: codeHash,
      p_expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
    });
    if (storeError) {
      console.error("[SendVerification] Secure code storage failed:", storeError.message);
      return NextResponse.json({ error: "تعذر إرسال رمز التحقق" }, { status: 500 });
    }
    if (stored !== true) return NextResponse.json({ error: "يرجى الانتظار قبل طلب رمز جديد" }, { status: 429 });

    const sent = await sendVerificationCode(email, code);
    if (!sent && process.env.NODE_ENV === "production") {
      return NextResponse.json({ sent: false, error: "تعذر إرسال البريد الإلكتروني" }, { status: 503 });
    }
    return NextResponse.json({ sent, ...(process.env.NODE_ENV !== "production" && !sent ? { devCode: code } : {}) });
  } catch (err) {
    console.error("[SendVerification] Error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
