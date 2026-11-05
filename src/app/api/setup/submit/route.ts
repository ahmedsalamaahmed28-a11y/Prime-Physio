import { NextRequest, NextResponse } from "next/server";
import { getAdminClient } from "@/lib/supabase";
import { requireAuth } from "../../utils/auth";

export async function POST(req: NextRequest) {
  try {
    const session = await requireAuth(req);
    const body = await req.json();
    const name = typeof body?.name === "string" ? body.name.trim() : "";
    const centers = body?.centers;

    if (!name || name.length > 160) return NextResponse.json({ error: "اسم العيادة غير صحيح" }, { status: 400 });
    if (!Array.isArray(centers) || centers.length < 1 || centers.length > 5) {
      return NextResponse.json({ error: "يجب إضافة مركز واحد على الأقل وبحد أقصى 5 مراكز" }, { status: 400 });
    }

    const normalizedCenters = centers.map((center: any) => ({
      shortName: typeof center?.shortName === "string" ? center.shortName.trim() : "",
      fullName: typeof center?.fullName === "string" ? center.fullName.trim() : "",
      slug: typeof center?.slug === "string" ? center.slug.trim().toLowerCase() : "",
    }));

    const admin = getAdminClient();
    const { data, error } = await admin.rpc("setup_clinic_transaction_server", {
      p_email: session.email,
      p_name: name,
      p_centers: normalizedCenters,
    });

    if (error) {
      console.error("[Setup Submit] Secure onboarding RPC failed:", error.message);
      return NextResponse.json({ error: "تعذر إكمال إعداد العيادة" }, { status: 500 });
    }
    if (!data?.success) {
      const message = typeof data?.error === "string" ? data.error : "تعذر إكمال إعداد العيادة";
      const status = /only clinic administrators/i.test(message) ? 403 :
        /supports|taken|duplicate/i.test(message) ? 409 : 400;
      return NextResponse.json({ error: message }, { status });
    }
    return NextResponse.json(data);
  } catch (err) {
    const message = err instanceof Error ? err.message : "";
    const status = message === "Unauthorized" ? 401 : 500;
    return NextResponse.json({ error: status === 401 ? "Unauthorized" : "Internal server error" }, { status });
  }
}
