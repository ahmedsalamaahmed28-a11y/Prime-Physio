import { NextRequest, NextResponse } from "next/server";
import { getAdminClient } from "@/lib/supabase";

export async function POST(req: NextRequest) {
  try {
    const { email: rawEmail, name } = await req.json();
    if (!rawEmail) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }
    const email = rawEmail.toLowerCase().trim();
    const clinicName = name || email.split("@")[0];

    const admin = getAdminClient();

    // Call the atomic DB function — handles race conditions and ON CONFLICT internally
    const { data, error } = await admin.rpc("provision_google_user", {
      p_email: email,
      p_name: clinicName,
    });

    if (error) {
      console.error("[AutoProvision] RPC error:", error.message);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (data?.error) {
      console.error("[AutoProvision] Function error:", data.error);
      return NextResponse.json({ error: data.error }, { status: 500 });
    }

    const clinicId: string = data?.clinicId;
    console.log(`[AutoProvision] ✅ ${data?.status} — clinicId: ${clinicId}`);

    return NextResponse.json({ clinicId, clinicName });
  } catch (err) {
    console.error("[AutoProvision] Unhandled error:", err);
    const msg = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
