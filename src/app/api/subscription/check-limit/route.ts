import { NextRequest, NextResponse } from "next/server";
import { checkSubscriptionLimit } from "@/lib/subscriptionCheck";
import { requireRole } from "../../utils/auth";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(req: NextRequest) {
  try {
    const clinicId = req.nextUrl.searchParams.get("clinic_id");
    const resource = req.nextUrl.searchParams.get("resource");
    if (!clinicId || !resource || !["patients", "sessions"].includes(resource)) {
      return NextResponse.json({ error: "Missing clinic_id or resource" }, { status: 400 });
    }

    const user = await requireRole(req, ["admin", "doctor", "receptionist"]);
    if (!user.clinicId || clinicId !== user.clinicId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const result = await checkSubscriptionLimit(user.clinicId, resource as "patients" | "sessions");
    return NextResponse.json(result, { headers: { "Cache-Control": "no-store, private" } });
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    const status = /unauthorized/i.test(message) ? 401 : /forbidden|insufficient|membership/i.test(message) ? 403 : 500;
    return NextResponse.json({ error: status === 401 ? "Unauthorized" : status === 403 ? "Forbidden" : "Internal server error" }, { status });
  }
}
