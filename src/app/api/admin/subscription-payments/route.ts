import { NextRequest, NextResponse } from "next/server";
import { getAdminClient } from "@/lib/supabase-admin";
import { requireAuth } from "../../utils/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function requirePlatformAdmin(req: NextRequest) {
  const user = await requireAuth(req);
  const admin = getAdminClient();
  const { data, error } = await admin.from("platform_admins").select("email")
    .eq("email", user.email.toLowerCase()).maybeSingle();
  if (error || !data) throw new Error("Forbidden");
  return { user, admin };
}

export async function GET(req: NextRequest) {
  try {
    const { admin } = await requirePlatformAdmin(req);
    const { data: requests, error } = await admin.from("subscription_payment_requests")
      .select("*").order("created_at", { ascending: false }).limit(200);
    if (error) throw error;
    const clinicIds = [...new Set((requests || []).map((r: any) => r.clinic_id))];
    const { data: clinics, error: clinicsError } = clinicIds.length
      ? await admin.from("clinics").select("id,name,admin_email").in("id", clinicIds)
      : { data: [], error: null };
    if (clinicsError) throw clinicsError;
    const clinicMap = new Map((clinics || []).map((c: any) => [c.id, c]));
    const enriched = await Promise.all((requests || []).map(async (r: any) => {
      const { data: signed } = await admin.storage.from("subscription-receipts").createSignedUrl(r.receipt_path, 3600);
      const clinic: any = clinicMap.get(r.clinic_id);
      return { ...r, clinicName: clinic?.name || "مركز غير معروف", clinicEmail: clinic?.admin_email || r.user_email, receiptUrl: signed?.signedUrl || null };
    }));
    const { data: settings } = await admin.from("platform_settings")
      .select("instapay_phone,instapay_account,instapay_link,vodafone_cash_phone,subscription_payments_enabled")
      .eq("id", 1).maybeSingle();
    return NextResponse.json({ requests: enriched, settings: settings || {} }, { headers: { "Cache-Control": "no-store, private" } });
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    return NextResponse.json({ error: message || "Unable to load payment requests" }, { status: message === "Unauthorized" ? 401 : message === "Forbidden" ? 403 : 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const { admin } = await requirePlatformAdmin(req);
    const body = await req.json();
    const instapayPhone = String(body.instapay_phone || "").trim();
    const instapayAccount = String(body.instapay_account || "").trim();
    const instapayLink = String(body.instapay_link || "").trim();
    const vodafonePhone = String(body.vodafone_cash_phone || "").trim();
    const enabled = body.subscription_payments_enabled === true;
    if (!/^01[0-9]{9}$/.test(instapayPhone) || !/^01[0-9]{9}$/.test(vodafonePhone) ||
        !/^[^\s@]+@instapay$/i.test(instapayAccount) ||
        !/^https:\/\/ipn\.eg\/S\/[A-Za-z0-9._-]+\/instapay\/[A-Za-z0-9]+$/.test(instapayLink)) {
      return NextResponse.json({ error: "تحقق من أرقام الهاتف ومعرف InstaPay ورابط التحويل." }, { status: 400 });
    }
    const { error } = await admin.from("platform_settings").upsert({
      id: 1, instapay_phone: instapayPhone, instapay_account: instapayAccount,
      instapay_link: instapayLink, vodafone_cash_phone: vodafonePhone,
      subscription_payments_enabled: enabled, updated_at: new Date().toISOString()
    });
    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    return NextResponse.json({ error: message || "Unable to save settings" }, { status: message === "Unauthorized" ? 401 : message === "Forbidden" ? 403 : 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { user, admin } = await requirePlatformAdmin(req);
    const body = await req.json();
    const requestId = String(body.requestId || "").trim();
    const action = String(body.action || "").trim();
    if (!requestId || !["approve", "reject"].includes(action)) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }
    if (action === "approve") {
      const { data, error } = await admin.rpc("approve_subscription_payment", {
        p_request_id: requestId, p_admin_email: user.email.toLowerCase()
      });
      if (error) throw error;
      return NextResponse.json({ success: true, subscriptionId: data });
    }
    const { data, error } = await admin.from("subscription_payment_requests").update({
      status: "rejected", reviewed_by: user.email.toLowerCase(),
      reviewed_at: new Date().toISOString(), updated_at: new Date().toISOString()
    }).eq("id", requestId).eq("status", "pending").select("id").maybeSingle();
    if (error) throw error;
    if (!data) return NextResponse.json({ error: "الطلب غير موجود أو تمت مراجعته بالفعل." }, { status: 409 });
    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    console.error("[admin-subscription-payments] action failed", error);
    return NextResponse.json({ error: message || "Unable to process request" }, { status: message === "Unauthorized" ? 401 : message === "Forbidden" ? 403 : 500 });
  }
}
