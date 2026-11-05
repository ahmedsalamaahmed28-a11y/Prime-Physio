import { NextRequest, NextResponse } from "next/server";
import { requireAuthOnly } from "../../utils/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

// Clinic deletion spans many related tables and cannot safely be performed as
// a sequence of independent REST deletes. Keep this endpoint closed until an
// atomic archival/deletion RPC and a verified recovery path are available.
export async function POST(req: NextRequest) {
  try {
    await requireAuthOnly(req);
    return NextResponse.json(
      { error: "Account and clinic deletion are temporarily unavailable. Contact platform support to preserve and close records safely." },
      { status: 409, headers: { "Cache-Control": "no-store, private" } }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    const status = /unauthorized/i.test(message) ? 401 : 500;
    return NextResponse.json(
      { error: status === 401 ? "Unauthorized" : "Account deletion unavailable" },
      { status, headers: { "Cache-Control": "no-store, private" } }
    );
  }
}
