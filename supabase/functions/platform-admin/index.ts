import { createClient } from "npm:@supabase/supabase-js@2.108.1";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ADMIN_EMAIL = "ahmedsalamaahmed21@gmail.com";
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Vary": "Origin"
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
    status, headers: { ...corsHeaders, "Content-Type": "application/json", "Cache-Control": "no-store" }
  });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  try {
    const authHeader = req.headers.get("Authorization") || "";
    const token = authHeader.replace(/^Bearer\s+/i, "");
    if (!token) return json({ error: "Unauthorized" }, 401);

    const db = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false }
    });
    const { data: authData, error: authError } = await db.auth.getUser(token);
    const user = authData.user;
    if (authError || !user?.email || !user.email_confirmed_at) return json({ error: "Verified login required" }, 401);
    if (user.email.toLowerCase() !== ADMIN_EMAIL) return json({ error: "Not authorized for platform administration" }, 403);
    const { data: admin } = await db.from("platform_admins").select("email").ilike("email", user.email).maybeSingle();
    if (!admin) return json({ error: "Platform administrator access has been revoked" }, 403);

    const body = await req.json().catch(() => ({}));
    const action = body.action;

    if (action === "overview") {
      const [clinicsCount, activeClinicsCount, patientsCount, subscriptionsCount, pendingCount, approvedCount, revenue, requests, clinics, plans] = await Promise.all([
        db.from("clinics").select("id", { count: "exact", head: true }),
        db.from("clinics").select("id", { count: "exact", head: true }).eq("is_active", true),
        db.from("patients").select("id", { count: "exact", head: true }),
        db.from("subscriptions").select("id", { count: "exact", head: true }).eq("status", "active"),
        db.from("subscription_payment_requests").select("id", { count: "exact", head: true }).eq("status", "pending"),
        db.from("subscription_payment_requests").select("id", { count: "exact", head: true }).eq("status", "approved"),
        db.from("subscription_payment_requests").select("amount").eq("status", "approved"),
        db.from("subscription_payment_requests").select("id,clinic_id,user_email,plan_code,billing_period,amount,payment_method,transfer_reference,receipt_path,status,created_at,rejection_reason").order("created_at", { ascending: false }).limit(100),
        db.from("clinics").select("id,name,admin_email,phone,city,status,is_active,created_at").order("created_at", { ascending: false }).limit(100),
        db.from("subscription_plans").select("name,price_monthly,price_yearly,is_active").order("price_monthly"),
      ]);
      const errors = [clinicsCount,activeClinicsCount,patientsCount,subscriptionsCount,pendingCount,approvedCount,revenue,requests,clinics,plans].filter(x => x.error);
      if (errors.length) return json({ error: "Could not load platform data" }, 500);
      const clinicMap = new Map((clinics.data || []).map((c: any) => [c.id, c]));
      return json({
        adminEmail: user.email,
        metrics: {
          clinics: clinicsCount.count || 0, activeClinics: activeClinicsCount.count || 0,
          patients: patientsCount.count || 0, activeSubscriptions: subscriptionsCount.count || 0,
          pendingPayments: pendingCount.count || 0, approvedPayments: approvedCount.count || 0,
          approvedValue: (revenue.data || []).reduce((sum: number, row: any) => sum + Number(row.amount || 0), 0)
        },
        requests: (requests.data || []).map((p: any) => ({ ...p, clinic: clinicMap.get(p.clinic_id) || null })),
        clinics: clinics.data || [], plans: plans.data || []
      });
    }

    if (action === "receipt") {
      const id = String(body.id || "");
      const { data: payment, error } = await db.from("subscription_payment_requests").select("receipt_path").eq("id", id).maybeSingle();
      if (error || !payment?.receipt_path) return json({ error: "Receipt not found" }, 404);
      const { data, error: storageError } = await db.storage.from("subscription-receipts").createSignedUrl(payment.receipt_path, 90);
      if (storageError || !data?.signedUrl) return json({ error: "Could not create secure receipt link" }, 500);
      return json({ url: data.signedUrl });
    }

    if (action === "approve") {
      const id = String(body.id || "");
      const { data, error } = await db.rpc("approve_subscription_payment", { p_request_id: id, p_admin_email: user.email });
      if (error) return json({ error: error.message }, 400);
      return json({ success: true, subscriptionId: data });
    }

    if (action === "reject") {
      const id = String(body.id || "");
      const reason = String(body.reason || "").trim();
      const { error } = await db.rpc("reject_subscription_payment", { p_request_id: id, p_admin_email: user.email, p_reason: reason });
      if (error) return json({ error: error.message }, 400);
      return json({ success: true });
    }

    return json({ error: "Unknown action" }, 400);
  } catch (_error) {
    return json({ error: "Unexpected server error" }, 500);
  }
});