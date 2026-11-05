import { NextRequest, NextResponse } from "next/server";
import { requireAuthOnly } from "../../utils/auth";
import { getAdminClient } from "@/lib/supabase";

export async function POST(req: NextRequest) {
  try {
    const user = await requireAuthOnly(req);
    const admin = getAdminClient();
    const { data: staff, error } = await admin.from("staff")
      .select("clinic_id").eq("email", user.email).limit(1).maybeSingle();
    if (error) return NextResponse.json({ error: "Unable to verify account ownership" }, { status: 500 });
    if (staff?.clinic_id) {
      // Clinic-wide deletion is deliberately disabled until an atomic archival/deletion workflow exists.
      return NextResponse.json({ error: "Clinic account deletion is temporarily unavailable. Contact platform support to preserve and close clinic records safely." }, { status: 409 });
    }
    const { error: deleteError } = await admin.from("auth_accounts").delete().eq("email", user.email);
    if (deleteError) return NextResponse.json({ error: "Unable to delete account" }, { status: 500 });
    return NextResponse.json({ success: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "";
    const status = message === "Unauthorized" ? 401 : 500;
    return NextResponse.json({ error: status === 401 ? "Unauthorized" : "Internal server error" }, { status });
  }
}
