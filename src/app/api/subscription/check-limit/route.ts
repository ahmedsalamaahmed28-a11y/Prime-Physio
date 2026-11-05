import { NextRequest, NextResponse } from "next/server";
import { checkSubscriptionLimit } from "@/lib/subscriptionCheck";
import { requireRole } from "@/app/api/utils/auth";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const clinicId = searchParams.get("clinic_id");
    const resource = searchParams.get("resource") as "patients" | "sessions" | null;
    if (!clinicId || !resource || !["patients", "sessions"].includes(resource)) {
      return NextResponse.json({ error: "Missing clinic_id or resource" }, { status: 400 });
    }
    const user = await requireRole(req, ["admin", "doctor", "receptionist"]);
    if (clinicId !== user.clinicId) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    return NextResponse.json(await checkSubscriptionLimit(user.clinicId!, resource));
  } catch (err) {
    const message = err instanceof Error ? err.message : "";
    const status = message === "Unauthorized" ? 401 : /forbidden|insufficient|membership/i.test(message) ? 403 : 500;
    return NextResponse.json({ error: status === 401 ? "Unauthorized" : status === 403 ? "Forbidden" : "Internal server error" }, { status });
  }
}
