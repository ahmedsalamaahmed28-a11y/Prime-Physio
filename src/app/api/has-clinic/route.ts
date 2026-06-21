import { NextRequest, NextResponse } from "next/server";
import { getAdminClient } from "@/lib/supabase";

export async function GET(req: NextRequest) {
  try {
    const email = new URL(req.url).searchParams.get("email");
    if (!email) return NextResponse.json({ hasClinic: false });

    const admin = getAdminClient();
    const { data } = await admin
      .from("clinics")
      .select("id")
      .eq("admin_email", email)
      .maybeSingle();

    return NextResponse.json({ hasClinic: !!data });
  } catch {
    return NextResponse.json({ hasClinic: false });
  }
}
