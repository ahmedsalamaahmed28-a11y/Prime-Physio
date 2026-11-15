import { NextRequest, NextResponse } from "next/server";
import { getAdminClient } from "@/lib/supabase";
import { requireAuth } from "../../utils/auth";

const PAID_INVOICE_STATUS = "مدفوع";

function parseAmount(value: unknown): number {
  const normalized = String(value ?? "").replace(/,/g, "").replace(/[^0-9.-]/g, "");
  const amount = Number(normalized);
  return Number.isFinite(amount) && amount > 0 ? amount : 0;
}

function monthKey(value: string | null | undefined): string {
  if (!value) return "";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? ""
    : `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

export async function GET(req: NextRequest) {
  try {
    const user = await requireAuth(req);
    const admin = getAdminClient();

    const { data: platformAdmin, error: platformAdminError } = await admin
      .from("platform_admins")
      .select("email")
      .eq("email", user.email)
      .maybeSingle();

    if (platformAdminError) throw platformAdminError;
    if (!platformAdmin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const [
      clinicsCountResult,
      staffCountResult,
      patientsCountResult,
      sessionsCountResult,
      appointmentsCountResult,
      subscriptionsResult,
      clinicsResult,
      staffEmailsResult,
      ownerEmailsResult,
      paidInvoicesResult,
      recentLogsResult,
    ] = await Promise.all([
      admin.from("clinics").select("id", { count: "exact", head: true }),
      admin.from("staff").select("id", { count: "exact", head: true }),
      admin.from("patients").select("id", { count: "exact", head: true }),
      admin.from("sessions").select("id", { count: "exact", head: true }),
      admin.from("appointments").select("id", { count: "exact", head: true }),
      admin.from("subscriptions").select("clinic_id,plan_name,status,end_date,is_trial"),
      // The clinics table stores the owner contact in admin_email, not email.
      admin.from("clinics").select("id,name,phone,admin_email,is_active,created_at").order("created_at", { ascending: false }),
      admin.from("staff").select("email").not("email", "is", null),
      admin.from("clinic_owners").select("owner_email").not("owner_email", "is", null),
      admin.from("invoices").select("clinic_id,amount,created_at").eq("status", PAID_INVOICE_STATUS),
      admin.from("audit_logs").select("id,action,entity,details,created_at,user_email").order("created_at", { ascending: false }).limit(10),
    ]);

    const failures = [
      clinicsCountResult.error, staffCountResult.error, patientsCountResult.error,
      sessionsCountResult.error, appointmentsCountResult.error, subscriptionsResult.error,
      clinicsResult.error, staffEmailsResult.error, ownerEmailsResult.error,
      paidInvoicesResult.error, recentLogsResult.error,
    ].filter(Boolean);
    if (failures.length) {
      console.error("[Platform dashboard] Data query failed:", failures);
      throw new Error("Unable to load platform dashboard data");
    }

    const subscriptions = subscriptionsResult.data || [];
    const paidInvoices = paidInvoicesResult.data || [];
    const totalRevenue = paidInvoices.reduce((sum, invoice) => sum + parseAmount(invoice.amount), 0);
    const revenueByClinic = new Map<string, number>();
    const revenueByMonth = new Map<string, number>();

    for (const invoice of paidInvoices) {
      const amount = parseAmount(invoice.amount);
      if (invoice.clinic_id) {
        revenueByClinic.set(invoice.clinic_id, (revenueByClinic.get(invoice.clinic_id) || 0) + amount);
      }
      const key = monthKey(invoice.created_at);
      if (key) revenueByMonth.set(key, (revenueByMonth.get(key) || 0) + amount);
    }

    const activeSubs = subscriptions.filter((item) => item.status === "active").length;
    const expiredSubs = subscriptions.filter((item) => ["expired", "canceled", "cancelled"].includes(String(item.status || "").toLowerCase())).length;
    let basicSubs = 0, proSubs = 0, enterpriseSubs = 0, trialSubs = 0;
    for (const sub of subscriptions) {
      const plan = String(sub.plan_name || "").toLowerCase();
      if (sub.is_trial || plan === "trial") trialSubs++;
      else if (["basic", "free"].includes(plan)) basicSubs++;
      else if (["silver", "pro"].includes(plan)) proSubs++;
      else if (["gold", "enterprise"].includes(plan)) enterpriseSubs++;
    }

    const clinics = await Promise.all((clinicsResult.data || []).map(async (clinic) => {
      const [patientResult, sessionResult, subscriptionResult] = await Promise.all([
        admin.from("patients").select("id", { count: "exact", head: true }).eq("clinic_id", clinic.id),
        admin.from("sessions").select("id", { count: "exact", head: true }).eq("clinic_id", clinic.id),
        admin.from("subscriptions").select("plan_name,status,end_date").eq("clinic_id", clinic.id).eq("status", "active").order("created_at", { ascending: false }).limit(1).maybeSingle(),
      ]);
      if (patientResult.error || sessionResult.error || subscriptionResult.error) {
        throw patientResult.error || sessionResult.error || subscriptionResult.error;
      }
      return {
        ...clinic,
        email: clinic.admin_email || "",
        patientCount: patientResult.count ?? 0,
        sessionCount: sessionResult.count ?? 0,
        revenue: revenueByClinic.get(clinic.id) || 0,
        subscription: subscriptionResult.data || null,
      };
    }));

    const topClinicsByActivity = [...clinics].sort((a, b) => b.sessionCount - a.sessionCount).slice(0, 5);
    const topClinicsByRevenue = [...clinics].sort((a, b) => b.revenue - a.revenue).slice(0, 5);

    const emailSet = new Set<string>();
    for (const row of staffEmailsResult.data || []) {
      const email = String(row.email || "").trim().toLowerCase();
      if (email) emailSet.add(email);
    }
    for (const row of ownerEmailsResult.data || []) {
      const email = String(row.owner_email || "").trim().toLowerCase();
      if (email) emailSet.add(email);
    }

    const now = new Date();
    const months = Array.from({ length: 6 }, (_, index) => {
      const start = new Date(now.getFullYear(), now.getMonth() - 5 + index, 1);
      const end = new Date(start.getFullYear(), start.getMonth() + 1, 1);
      return {
        key: `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, "0")}`,
        start: start.toISOString(),
        end: end.toISOString(),
        name: new Intl.DateTimeFormat(req.nextUrl.searchParams.get("lang") === "en" ? "en-US" : "ar-EG", { month: "short" }).format(start),
      };
    });

    const monthlyCounts = await Promise.all(months.map(async (month) => {
      const [clinicResult, patientResult] = await Promise.all([
        admin.from("clinics").select("id", { count: "exact", head: true }).gte("created_at", month.start).lt("created_at", month.end),
        admin.from("patients").select("id", { count: "exact", head: true }).gte("created_at", month.start).lt("created_at", month.end),
      ]);
      if (clinicResult.error || patientResult.error) throw clinicResult.error || patientResult.error;
      return { name: month.name, clinicCount: clinicResult.count || 0, patientCount: patientResult.count || 0, revenue: revenueByMonth.get(month.key) || 0 };
    }));

    const totalClinics = clinicsCountResult.count || 0;
    const totalPatients = patientsCountResult.count || 0;
    const aiInsights = [
      `عدد المراكز المسجلة: ${totalClinics}`,
      `إجمالي ملفات المرضى: ${totalPatients}`,
      `الاشتراكات النشطة حاليًا: ${activeSubs}`,
      expiredSubs ? `توجد ${expiredSubs} اشتراكات منتهية أو ملغاة.` : "لا توجد اشتراكات منتهية أو ملغاة مسجلة.",
      totalRevenue > 0 ? `إجمالي الفواتير المدفوعة: ${totalRevenue.toLocaleString("en-US")} EGP.` : "لا توجد فواتير مدفوعة مسجلة حتى الآن.",
    ];

    // Infra telemetry is not available from the current hosting/database APIs.
    // Return null rather than displaying fabricated or random health figures.
    const health = {
      onlineUsers: null,
      avgResponseTime: null,
      errorRate: null,
      dbUsage: null,
      storageUsage: null,
      rpm: null,
    };

    return NextResponse.json({
      stats: {
        totalClinics,
        totalStaff: staffCountResult.count || 0,
        totalPatients,
        totalSessions: sessionsCountResult.count || 0,
        totalAppointments: appointmentsCountResult.count || 0,
        totalRevenue,
        registeredUsers: emailSet.size,
        activeSubs,
        expiredSubs,
        basicSubs,
        proSubs,
        enterpriseSubs,
        trialSubs,
      },
      topClinicsByActivity,
      topClinicsByRevenue,
      latestClinics: clinics.slice(0, 5),
      charts: {
        clinicGrowth: monthlyCounts.map((item) => ({ name: item.name, value: item.clinicCount })),
        patientGrowth: monthlyCounts.map((item) => ({ name: item.name, value: item.patientCount })),
        revenueGrowth: monthlyCounts.map((item) => ({ name: item.name, value: item.revenue })),
      },
      health,
      aiInsights,
      logs: recentLogsResult.data || [],
    }, { headers: { "Cache-Control": "no-store, private" } });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unable to load platform dashboard";
    const status = message === "Unauthorized" ? 401 : message === "Forbidden" ? 403 : 500;
    console.error("[Platform dashboard] Request failed:", err);
    return NextResponse.json({ error: status === 500 ? "Unable to load platform dashboard" : message }, { status, headers: { "Cache-Control": "no-store, private" } });
  }
}
