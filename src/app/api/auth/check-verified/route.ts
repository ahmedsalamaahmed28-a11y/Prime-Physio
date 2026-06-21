import { NextRequest, NextResponse } from "next/server";
import { getAdminClient } from "@/lib/supabase";

export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json();
    const admin = getAdminClient();
    const { data } = await admin
      .from("auth_accounts")
      .select("verified")
      .eq("email", email.toLowerCase().trim())
      .maybeSingle();

    return NextResponse.json({ verified: data?.verified || false });
  } catch {
    return NextResponse.json({ verified: false });
  }
}
