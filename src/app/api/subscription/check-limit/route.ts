import { NextRequest, NextResponse } from "next/server";
import { checkSubscriptionLimit } from "@/lib/subscriptionCheck";
import { requireAuth } from "../../utils/auth";
import { getAdminClient } from "@/lib/supabase";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const clinicId = searchParams.get("clinic_id");
    const resource = searchParams.get("resource") as "patients" | "sessions" | null;

    if (!clinicId || !resource || !["patients", "sessions"].includes(resource)) {
      return NextResponse.json({ error: "Missing clinic_id or resource" }, { status: 400 });
    }

    const { email } = await requireAuth(req);

    const admin = getAdminClient();
    const { data: pa } = await admin.from("platform_admins").select("email").eq("email", email).maybeSingle();
    const isPlatformAdmin = !!pa;

    const result = await checkSubscriptionLimit(clinicId, resource, isPlatformAdmin);
    return NextResponse.json(result);
  } catch (err: any) {
    const status = err.message === "Unauthorized" ? 401 : 500;
    return NextResponse.json({ error: err.message }, { status });
  }
}
