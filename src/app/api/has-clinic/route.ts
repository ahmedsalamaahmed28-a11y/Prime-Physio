import { NextRequest, NextResponse } from "next/server";
import { getAdminClient } from "@/lib/supabase";

export async function GET(req: NextRequest) {
  try {
    const email = new URL(req.url).searchParams.get("email");
    if (!email) return NextResponse.json({ hasClinic: false });

    const admin = getAdminClient();
    const { data: clinic } = await admin
      .from("clinics")
      .select("id")
      .eq("admin_email", email)
      .limit(1)
      .maybeSingle();

    if (clinic) return NextResponse.json({ hasClinic: true });

    const { data: staff } = await admin
      .from("staff")
      .select("clinic_id")
      .eq("email", email)
      .limit(1)
      .maybeSingle();

    return NextResponse.json({ hasClinic: !!staff });
  } catch {
    return NextResponse.json({ hasClinic: false });
  }
}
