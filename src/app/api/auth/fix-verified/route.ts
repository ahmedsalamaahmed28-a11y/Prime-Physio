import { NextRequest, NextResponse } from "next/server";
import { getAdminClient } from "@/lib/supabase";
import { requireRole } from "../../utils/auth";

export async function POST(req: NextRequest) {
  try {
    await requireRole(req, ["platform_admin"]);
    const body = await req.json();
    const email = typeof body?.email === "string" ? body.email.toLowerCase().trim() : "";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) {
      return NextResponse.json({ error: "A valid email address is required" }, { status: 400 });
    }

    const admin = getAdminClient();
    const { data, error } = await admin.from("auth_accounts")
      .update({ verified: true }).eq("email", email).select("id").maybeSingle();
    if (error) {
      console.error("[FixVerified] Update failed:", error.message);
      return NextResponse.json({ error: "Unable to update account verification" }, { status: 500 });
    }
    if (!data) return NextResponse.json({ error: "Account not found" }, { status: 404 });
    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "";
    const status = message === "Unauthorized" ? 401 : /forbidden|insufficient|platform admin/i.test(message) ? 403 : 500;
    return NextResponse.json({ error: status === 401 ? "Unauthorized" : status === 403 ? "Forbidden" : "Internal server error" }, { status });
  }
}
