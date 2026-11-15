import { NextResponse } from "next/server";

// Legacy provisioning created a clinic and granted an admin staff role without
// the current owner verification, plan selection, slug checks, or subscription limits.
// New centers must use the verified /api/centers/create flow.
export async function POST() {
  return NextResponse.json(
    { error: "Legacy auto-provisioning is disabled. Use the verified center creation flow." },
    { status: 410, headers: { "Cache-Control": "no-store, private" } }
  );
}
