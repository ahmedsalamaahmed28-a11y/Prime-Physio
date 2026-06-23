import { NextResponse } from "next/server";
import { getAdminClient } from "@/lib/supabase";

export async function POST() {
  try {
    const admin = getAdminClient();
    const { data, error } = await admin
      .from("auth_accounts")
      .update({ verified: true })
      .filter("verified", "neq", true);

    if (error) {
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
  }
}
