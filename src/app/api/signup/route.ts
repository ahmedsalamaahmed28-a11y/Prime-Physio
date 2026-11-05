import { NextResponse } from "next/server";

// Legacy signup bypassed the verified OTP/password-security onboarding flow.
// New accounts must use /api/auth/send-verification and /api/auth/verify-email.
export async function POST() {
  return NextResponse.json(
    { error: "This legacy signup endpoint is disabled. Use the verified signup flow." },
    { status: 410, headers: { "Cache-Control": "no-store, private" } }
  );
}
