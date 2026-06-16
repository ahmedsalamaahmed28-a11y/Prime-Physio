import { NextRequest, NextResponse } from "next/server";
import { checkSubscriptionLimit } from "@/lib/subscriptionCheck";
import { requireAuth } from "../../utils/auth";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const clinicId = searchParams.get("clinic_id");
    const resource = searchParams.get("resource") as "patients" | "sessions" | null;

    if (!clinicId || !resource || !["patients", "sessions"].includes(resource)) {
      return NextResponse.json({ error: "Missing clinic_id or resource" }, { status: 400 });
    }

    await requireAuth(req);

    const result = await checkSubscriptionLimit(clinicId, resource);
    return NextResponse.json(result);
  } catch (err: any) {
    const status = err.message === "Unauthorized" ? 401 : 500;
    return NextResponse.json({ error: err.message }, { status });
  }
}
