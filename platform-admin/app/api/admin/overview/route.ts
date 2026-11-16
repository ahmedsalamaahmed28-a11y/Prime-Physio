import { NextRequest, NextResponse } from "next/server";
import { isDenied, requirePlatformAdmin } from "@/lib/admin";

export const dynamic = "force-dynamic";
export async function GET(req: NextRequest) {
  const auth = await requirePlatformAdmin(req);
  if (isDenied(auth)) return auth;
  const { db, user } = auth;
  const [clinicsCount, activeClinicsCount, patientsCount, subscriptionsCount, pendingCount, approvedCount, revenue, requests, clinics, plans, audit] = await Promise.all([
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
    db.from("platform_admin_audit_log").select("id,admin_email,action,payment_request_id,clinic_id,plan_code,amount,details,created_at").order("created_at", { ascending: false }).limit(30)
  ]);
  const errors = [clinicsCount,activeClinicsCount,patientsCount,subscriptionsCount,pendingCount,approvedCount,revenue,requests,clinics,plans,audit].filter(x=>x.error);
  if (errors.length) return NextResponse.json({ error: "Could not load platform data" }, { status: 500 });
  const clinicMap = new Map((clinics.data || []).map((c:any)=>[c.id,c]));
  const paymentRequests = (requests.data || []).map((p:any)=>({ ...p, clinic: clinicMap.get(p.clinic_id) || null }));
  return NextResponse.json({
    adminEmail: user.email,
    metrics: {
      clinics: clinicsCount.count || 0, activeClinics: activeClinicsCount.count || 0,
      patients: patientsCount.count || 0, activeSubscriptions: subscriptionsCount.count || 0,
      pendingPayments: pendingCount.count || 0, approvedPayments: approvedCount.count || 0,
      approvedValue: (revenue.data || []).reduce((sum:any,row:any)=>sum + Number(row.amount || 0),0)
    },
    requests: paymentRequests, clinics: clinics.data || [], plans: plans.data || [], audit: audit.data || []
  });
}