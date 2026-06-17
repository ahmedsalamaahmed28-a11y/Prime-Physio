import { NextResponse } from "next/server";
import { getAdminClient } from "@/lib/supabase";

export async function GET() {
  const hasKey = !!process.env.SUPABASE_SERVICE_ROLE_KEY;
  const keyPrefix = process.env.SUPABASE_SERVICE_ROLE_KEY?.substring(0, 15);

  const admin = getAdminClient();
  try {
    const { data, error } = await admin.auth.admin.listUsers();
    return NextResponse.json({
      hasKey,
      keyPrefix,
      listUsersError: error?.message || null,
      userCount: data?.users?.length ?? 0,
    });
  } catch (err: unknown) {
    return NextResponse.json({
      hasKey,
      keyPrefix,
      fatalError: err instanceof Error ? err.message : String(err),
    });
  }
}
