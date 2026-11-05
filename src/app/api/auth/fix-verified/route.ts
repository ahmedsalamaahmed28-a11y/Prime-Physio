import { NextRequest, NextResponse } from "next/server";
import { getAdminClient } from "@/lib/supabase";
import { requireRole } from "../../utils/auth";

export async function POST(req: NextRequest) {
  try {
    // This operation changes account trust state and must be platform-admin-only.
    await requireRole(req, ["platform_admin"]);

    const admin = getAdminClient();
    const { error } = await admin
      .from("auth_accounts")
      .update({ verified: true })
      .neq("verified", true);

    if (error) {
      console.error("[FixVerified] Update failed:", error.message);
      return NextResponse.json({ ok: false, error: "Unable to update verification status" }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unauthorized";
    const status = /unauthorized|غير مصرح|صلاحية/i.test(message) ? 403 : 401;
    return NextResponse.json({ ok: false, error: status === 403 ? "Forbidden" : "Unauthorized" }, { status });
  }
}
