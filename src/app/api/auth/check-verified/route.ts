import { NextRequest, NextResponse } from "next/server";
import { getAdminClient } from "@/lib/supabase";
import { requireAuth } from "../../utils/auth";

export async function POST(req: NextRequest) {
  try {
    const user = await requireAuth(req);
    const body = await req.json();
    const requestedEmail = typeof body?.email === "string" ? body.email.toLowerCase().trim() : "";
    if (!requestedEmail || requestedEmail !== user.email) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    const { data, error } = await getAdminClient().from("auth_accounts")
      .select("verified").eq("email", user.email).maybeSingle();
    if (error) return NextResponse.json({ error: "Unable to check verification status" }, { status: 500 });
    return NextResponse.json({ verified: data?.verified === true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "";
    const status = message === "Unauthorized" ? 401 : 500;
    return NextResponse.json({ error: status === 401 ? "Unauthorized" : "Internal server error" }, { status });
  }
}
