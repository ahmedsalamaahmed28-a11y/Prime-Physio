import { NextRequest, NextResponse } from "next/server";
import { getAdminClient } from "@/lib/supabase";
import { requireAuth } from "../utils/auth";

export async function GET(req: NextRequest) {
  try {
    const user = await requireAuth(req);
    const requestedEmail = new URL(req.url).searchParams.get("email")?.toLowerCase().trim();
    if (requestedEmail && requestedEmail !== user.email) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const admin = getAdminClient();
    const { data: staff, error } = await admin.from("staff").select("clinic_id")
      .eq("email", user.email).limit(1).maybeSingle();
    if (error) return NextResponse.json({ error: "Unable to verify clinic membership" }, { status: 500 });
    return NextResponse.json({ hasClinic: Boolean(staff?.clinic_id) });
  } catch (err) {
    const message = err instanceof Error ? err.message : "";
    const status = message === "Unauthorized" ? 401 : 500;
    return NextResponse.json({ error: status === 401 ? "Unauthorized" : "Internal server error" }, { status });
  }
}
