import { NextResponse } from "next/server";

export async function POST() {
  return NextResponse.json(
    { error: "Database reset endpoint is permanently disabled" },
    { status: 410, headers: { "Cache-Control": "no-store, private" } }
  );
}
