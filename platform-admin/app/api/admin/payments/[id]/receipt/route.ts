import { NextRequest, NextResponse } from "next/server";
import { isDenied, requirePlatformAdmin } from "@/lib/admin";
export const dynamic = "force-dynamic";
export async function GET(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const auth = await requirePlatformAdmin(req);
  if (isDenied(auth)) return auth;
  const { id } = await context.params;
  const { data: payment, error } = await auth.db.from("subscription_payment_requests").select("receipt_path").eq("id", id).maybeSingle();
  if (error || !payment?.receipt_path) return NextResponse.json({ error: "Receipt not found" }, { status: 404 });
  const { data, error: storageError } = await auth.db.storage.from("subscription-receipts").createSignedUrl(payment.receipt_path, 90);
  if (storageError || !data?.signedUrl) return NextResponse.json({ error: "Could not open receipt" }, { status: 500 });
  return NextResponse.json({ url: data.signedUrl });
}