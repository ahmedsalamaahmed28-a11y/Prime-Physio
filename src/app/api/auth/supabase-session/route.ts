import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/pages/api/auth/[...nextauth]";

export const dynamic = "force-dynamic";
export const revalidate = 0;

// The legacy endpoint mutated one global shadow user's active-clinic metadata. Keep
// authentication on this route, but refuse to issue or mutate shared identities.
export async function GET(_req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401, headers: { "Cache-Control": "no-store, private" } },
    );
  }

  return NextResponse.json(
    { error: "Legacy shared clinic sessions are disabled. Use /api/auth/clinic-session." },
    { status: 410, headers: { "Cache-Control": "no-store, private" } },
  );
}
