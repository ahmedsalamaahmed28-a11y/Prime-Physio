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

    const { data: staff, error } = await getAdminClient()
      .from("staff")
      .select("clinic_id, status")
      .eq("email", user.email.toLowerCase().trim())
      .limit(1)
      .maybeSingle();
    if (error) return NextResponse.json({ error: "Unable to verify clinic membership" }, { status: 500 });
    return NextResponse.json({ hasClinic: Boolean(staff?.clinic_id && staff.status !== "محذوف" && staff.status !== "deleted") }, {
      headers: { "Cache-Control": "no-store, private" },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    const status = /unauthorized/i.test(message) ? 401 : 500;
    return NextResponse.json({ error: status === 401 ? "Unauthorized" : "Internal server error" }, { status });
  }
}
