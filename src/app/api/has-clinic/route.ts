import { NextRequest, NextResponse } from "next/server";
import { getAdminClient } from "@/lib/supabase-admin";
import { requireAuth } from "../utils/auth";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(req: NextRequest) {
  try {
    const user = await requireAuth(req);
    const requestedEmail = req.nextUrl.searchParams.get("email")?.toLowerCase().trim();
    if (requestedEmail && requestedEmail !== user.email.toLowerCase().trim()) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403, headers: { "Cache-Control": "no-store, private" } });
    }

    const admin = getAdminClient();
    const email = user.email.toLowerCase().trim();
    let hasClinic = false;

    if (user.clinicId) {
      const [{ data: owner, error: ownerError }, { data: staff, error: staffError }] = await Promise.all([
        admin.from("clinic_owners").select("clinic_id").eq("owner_email", email).eq("clinic_id", user.clinicId).maybeSingle(),
        admin.from("staff").select("clinic_id").eq("email", email).eq("clinic_id", user.clinicId)
          .not("status", "in", '("محذوف","deleted","inactive","غير نشط")').limit(1).maybeSingle(),
      ]);
      if (ownerError || staffError) return NextResponse.json({ error: "Unable to verify clinic membership" }, { status: 500 });
      hasClinic = Boolean(owner || staff);
    } else {
      const [{ data: owners, error: ownerError }, { data: staffRows, error: staffError }] = await Promise.all([
        admin.from("clinic_owners").select("clinic_id").eq("owner_email", email).limit(1),
        admin.from("staff").select("clinic_id").eq("email", email)
          .not("clinic_id", "is", null).not("status", "in", '("محذوف","deleted","inactive","غير نشط")').limit(1),
      ]);
      if (ownerError || staffError) return NextResponse.json({ error: "Unable to verify clinic membership" }, { status: 500 });
      hasClinic = Boolean(owners?.length || staffRows?.length);
    }

    return NextResponse.json({ hasClinic }, {
      headers: { "Cache-Control": "no-store, private" },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    const status = /unauthorized/i.test(message) ? 401 : 500;
    return NextResponse.json({ error: status === 401 ? "Unauthorized" : "Internal server error" }, { status });
  }
}
