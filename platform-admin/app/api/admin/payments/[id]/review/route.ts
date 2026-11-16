import { NextRequest, NextResponse } from "next/server";
import { isDenied, requirePlatformAdmin } from "@/lib/admin";
export async function POST(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const auth = await requirePlatformAdmin(req);
  if (isDenied(auth)) return auth;
  const { id } = await context.params;
  const body = await req.json().catch(()=>({}));
  const action = body.action;
  if (!["approve","reject"].includes(action)) return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  const email = auth.user.email!;
  if (action === "approve") {
    const { data, error } = await auth.db.rpc("approve_subscription_payment", { p_request_id: id, p_admin_email: email });
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ success: true, subscriptionId: data });
  }
  const reason = String(body.reason || "").trim();
  const { error } = await auth.db.rpc("reject_subscription_payment", { p_request_id: id, p_admin_email: email, p_reason: reason });
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ success: true });
}