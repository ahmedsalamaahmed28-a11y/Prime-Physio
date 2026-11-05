import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json(
    { error: "This migration endpoint has been permanently disabled" },
    { status: 410, headers: { "Cache-Control": "no-store, private" } }
  );
}
