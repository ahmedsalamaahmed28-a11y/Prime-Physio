import { NextRequest, NextResponse } from "next/server";
import { createHmac } from "crypto";
import { getAdminClient } from "@/lib/supabase-admin";
import { validateNewPassword } from "@/lib/passwordSecurity";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null);
    const password = typeof body?.password === "string" ? body.password : "";
    const secret = process.env.NEXTAUTH_SECRET;
    if (!secret || secret.length < 32) {
      return NextResponse.json({ error: "خدمة التحقق من كلمة المرور غير مهيأة بأمان" }, { status: 503 });
    }
    const forwarded = req.headers.get("x-real-ip") || req.headers.get("x-forwarded-for")?.split(",").pop()?.trim() || "unknown";
    const ipHash = createHmac("sha256", secret).update(`password-check:${forwarded}`).digest("hex");
    const { data: allowed, error: rateError } = await getAdminClient().rpc("check_auth_login_attempt", {
      p_email: "password-check@prime-physio.internal",
      p_ip_hash: ipHash,
    });
    if (rateError || allowed !== true) {
      return NextResponse.json({ error: "تم تجاوز عدد محاولات التحقق. حاول بعد 15 دقيقة." }, { status: 429 });
    }
    await validateNewPassword(password);
    return NextResponse.json({ valid: true }, { headers: { "Cache-Control": "no-store, private" } });
  } catch (error) {
    const reason = error instanceof Error ? error.message : "";
    if (reason === "PASSWORD_TOO_WEAK") {
      return NextResponse.json({ error: "كلمة المرور يجب أن تكون 12 حرفًا على الأقل وتحتوي على حرف كبير وصغير ورقم ورمز." }, { status: 400 });
    }
    if (reason === "PASSWORD_COMPROMISED") {
      return NextResponse.json({ error: "كلمة المرور ظهرت في تسريبات سابقة. اختر كلمة مرور مختلفة." }, { status: 400 });
    }
    return NextResponse.json({ error: "تعذر فحص أمان كلمة المرور حاليًا. حاول مرة أخرى." }, { status: 503 });
  }
}
