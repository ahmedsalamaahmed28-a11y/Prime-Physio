import { NextRequest, NextResponse } from "next/server";
import { getAdminClient } from "@/lib/supabase-admin";
import { requireAuth } from "../../utils/auth";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function POST(req: NextRequest) {
  try {
    const user = await requireAuth(req);
    const body = await req.json().catch(() => null);
    const requestedEmail = typeof body?.email === "string" ? body.email.toLowerCase().trim() : "";
    const sessionEmail = user.email.toLowerCase().trim();
    if (!requestedEmail || requestedEmail !== sessionEmail) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403, headers: { "Cache-Control": "no-store, private" } });
    }

    const { data, error } = await getAdminClient().from("auth_accounts")
      .select("verified")
      .eq("email", sessionEmail)
      .maybeSingle();
    if (error) {
      console.error("[CheckVerified] Lookup failed:", error);
      return NextResponse.json({ error: "Unable to check verification status" }, { status: 500 });
    }
    return NextResponse.json({ verified: data?.verified === true }, {
      headers: { "Cache-Control": "no-store, private" },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    const status = /unauthorized/i.test(message) ? 401 : 500;
    return NextResponse.json({ error: status === 401 ? "Unauthorized" : "Internal server error" }, { status });
  }
}
