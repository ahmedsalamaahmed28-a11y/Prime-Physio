import { NextResponse } from "next/server";

// This legacy maintenance endpoint had no authentication and could verify every account.
// It is intentionally disabled; verification is only performed by the OTP verification flow.
export async function POST() {
  return NextResponse.json(
    { error: "This endpoint has been permanently disabled" },
    { status: 410, headers: { "Cache-Control": "no-store, private" } }
  );
}
