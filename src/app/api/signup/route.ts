import { NextResponse } from "next/server";

export async function POST() {
  return NextResponse.json(
    { error: "This legacy signup endpoint is disabled. Use the verified signup flow." },
    { status: 410 }
  );
}
