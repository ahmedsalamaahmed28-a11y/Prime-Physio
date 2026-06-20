import { NextRequest, NextResponse } from "next/server";
import { getAdminClient } from "@/lib/supabase";

export async function POST(req: NextRequest) {
  try {
    const { email, code } = await req.json();

    if (!email || !code) {
      return NextResponse.json({ error: "يرجى إدخال البريد الإلكتروني ورمز التحقق" }, { status: 400 });
    }

    const admin = getAdminClient();
    const cleanEmail = email.toLowerCase().trim();
    const key = `password_reset_${cleanEmail.replace(/[^a-z0-9]/g, "_")}`;

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

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[VerifyResetCode] Error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
