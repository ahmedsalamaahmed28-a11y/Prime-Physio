import { NextRequest, NextResponse } from "next/server";
import { getAdminClient } from "@/lib/supabase-admin";
import { requireAuthOnly } from "../../utils/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    await requireAuthOnly(req);
    const admin = getAdminClient();
    const { data, error } = await admin.from("platform_settings")
      .select("instapay_phone,instapay_account,instapay_link,vodafone_cash_phone,subscription_payments_enabled")
      .eq("id", 1).maybeSingle();
    if (error) throw error;
    return NextResponse.json({
      enabled: data?.subscription_payments_enabled === true,
      methods: {
        instapay: {
          phone: data?.instapay_phone || "",
          account: data?.instapay_account || "",
          link: data?.instapay_link || ""
        },
        vodafone_cash: { phone: data?.vodafone_cash_phone || "" }
      }
    }, { headers: { "Cache-Control": "no-store, private" } });
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    return NextResponse.json({ error: /unauthorized/i.test(message) ? "Unauthorized" : "Unable to load payment methods" }, { status: /unauthorized/i.test(message) ? 401 : 500 });
  }
}
