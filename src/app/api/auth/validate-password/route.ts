import { NextRequest, NextResponse } from "next/server";
import { validateNewPassword } from "@/lib/passwordSecurity";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null);
    const password = typeof body?.password === "string" ? body.password : "";
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
