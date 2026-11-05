import { NextRequest, NextResponse } from "next/server";
import { getAdminClient } from "@/lib/supabase-admin";
import { requireRole } from "../../utils/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function POST(req: NextRequest) {
  try {
    // Identity and role are resolved server-side. Never use the email or role sent by the browser.
    const session = await requireRole(req, ["admin"]);
    const body = await req.json().catch(() => null);

    const name = typeof body?.name === "string" ? body.name.trim().slice(0, 160) : "";
    const centers = Array.isArray(body?.centers) ? body.centers : null;

    if (!name || !centers || centers.length < 1 || centers.length > 5) {
      return NextResponse.json(
        { error: "يرجى إدخال اسم العيادة ومركز واحد إلى خمسة مراكز صحيحة" },
        { status: 400, headers: { "Cache-Control": "no-store, private" } }
      );
    }

    const admin = getAdminClient();
    const { data, error } = await admin.rpc("setup_clinic_transaction_server", {
      p_email: session.email.toLowerCase().trim(),
      p_name: name,
      p_centers: centers,
    });

    if (error) {
      console.error("[Setup Submit] Secure onboarding RPC failed:", error);
      return NextResponse.json(
        { error: "تعذر إكمال إعداد العيادة حاليًا" },
        { status: 500, headers: { "Cache-Control": "no-store, private" } }
      );
    }

    if (!data || data.error) {
      return NextResponse.json(
        { error: data?.error || "فشل إعداد العيادة" },
        { status: 400, headers: { "Cache-Control": "no-store, private" } }
      );
    }

    return NextResponse.json(data, {
      headers: { "Cache-Control": "no-store, private" },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (/unauthorized|غير مصرح|صلاحية غير كافية|not found/i.test(message)) {
      return NextResponse.json(
        { error: "غير مصرح لك بإنشاء أو تعديل المراكز" },
        { status: 403, headers: { "Cache-Control": "no-store, private" } }
      );
    }

    console.error("[Setup Submit] Unhandled error:", error);
    return NextResponse.json(
      { error: "حدث خطأ داخلي أثناء إعداد العيادة" },
      { status: 500, headers: { "Cache-Control": "no-store, private" } }
    );
  }
}
