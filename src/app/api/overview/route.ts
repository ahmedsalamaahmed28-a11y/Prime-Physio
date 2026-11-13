import { NextRequest, NextResponse } from "next/server";
import { getAdminClient } from "@/lib/supabase-admin";
import { requireAuthOnly } from "../utils/auth";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function cairoParts(date: Date) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Africa/Cairo", year: "numeric", month: "2-digit", day: "2-digit",
  }).formatToParts(date);
  return Object.fromEntries(parts.map((part) => [part.type, part.value]));
}
function cairoDateKey(date: Date) {
  const p = cairoParts(date);
  return `${p.year}-${p.month}-${p.day}`;
}
function cairoMonthStart(date: Date, offset = 0) {
  const p = cairoParts(date);
  const d = new Date(Date.UTC(Number(p.year), Number(p.month) - 1 + offset, 1));
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  return `${y}-${m}-01T00:00:00+02:00`;
}
function money(value: unknown) {
  const n = Number(String(value ?? "0").replace(/[^0-9.-]/g, ""));
  return Number.isFinite(n) ? n : 0;
}
const attendedStatuses = ["attended", "completed", "present", "حضر", "حاضر", "تم الحضور", "مكتملة", "مكتمل"];
const cancelledStatuses = ["cancelled", "canceled", "ملغي", "ملغاة", "ملغى"];
const paidStatuses = ["paid", "مدفوع", "مدفوعة", "paid in full", "مكتمل"];

export async function GET(req: NextRequest) {
  try {
    const session = await requireAuthOnly(req);
    const admin = getAdminClient();
    const email = session.email.toLowerCase().trim();
    const { data: ownerships, error: ownershipError } = await admin
      .from("clinic_owners").select("clinic_id").eq("owner_email", email);
    if (ownershipError) throw ownershipError;
    const clinicIds = [...new Set((ownerships || []).map((x) => x.clinic_id).filter(Boolean))];
    if (!clinicIds.length) {
      return NextResponse.json({ centers: [], totals: null, updatedAt: new Date().toISOString() }, { headers: { "Cache-Control": "no-store, private" } });
    }

    const now = new Date();
    const monthStart = cairoMonthStart(now);
    const previousStart = cairoMonthStart(now, -1);
    const todayStart = `${cairoDateKey(now)}T00:00:00+02:00`;
    const tomorrow = new Date(new Date(todayStart).getTime() + 86400000).toISOString();
    const [clinicsQ, branchesQ, staffQ, patientsQ, appointmentsQ, invoicesQ, subscriptionsQ, settingsQ, servicesQ] = await Promise.all([
      admin.from("clinics").select("id,name,slug,logo_url,phone,address,created_at,status").in("id", clinicIds),
      admin.from("branches").select("id,clinic_id,short_name,full_name,slug,logo_url,status").in("clinic_id", clinicIds),
      admin.from("staff").select("id,clinic_id,status,role").in("clinic_id", clinicIds),
      admin.from("patients").select("id,clinic_id,status,created_at").in("clinic_id", clinicIds),
      admin.from("appointments").select("id,clinic_id,starts_at,status,price").in("clinic_id", clinicIds).gte("starts_at", previousStart).lt("starts_at", tomorrow),
      admin.from("invoices").select("id,clinic_id,amount,status,created_at").in("clinic_id", clinicIds).gte("created_at", previousStart).lt("created_at", tomorrow),
      admin.from("subscriptions").select("clinic_id,plan_name,status,end_date,created_at").in("clinic_id", clinicIds).order("created_at", { ascending: false }),
      admin.from("clinic_settings").select("clinic_id,clinic_name,logo_url,default_session_price").in("clinic_id", clinicIds),
      admin.from("clinic_services").select("clinic_id,is_active,name,price").in("clinic_id", clinicIds),
    ]);
    const err = [clinicsQ, branchesQ, staffQ, patientsQ, appointmentsQ, invoicesQ, subscriptionsQ, settingsQ, servicesQ].find((q) => q.error)?.error;
    if (err) throw err;

    const clinics = clinicsQ.data || [];
    const appointments = appointmentsQ.data || [];
    const invoices = invoicesQ.data || [];
    const staff = staffQ.data || [];
    const patients = patientsQ.data || [];
    const services = servicesQ.data || [];
    const centers = clinics.map((clinic) => {
      const ca = appointments.filter((a) => a.clinic_id === clinic.id);
      const ci = invoices.filter((i) => i.clinic_id === clinic.id);
      const cs = staff.filter((s) => s.clinic_id === clinic.id);
      const cp = patients.filter((p) => p.clinic_id === clinic.id);
      const monthAppointments = ca.filter((a) => new Date(a.starts_at).getTime() >= new Date(monthStart).getTime());
      const due = monthAppointments.filter((a) => new Date(a.starts_at).getTime() <= now.getTime() && !cancelledStatuses.includes(String(a.status || "").toLowerCase()));
      const attended = due.filter((a) => attendedStatuses.includes(String(a.status || "").toLowerCase()));
      const paid = ci.filter((i) => new Date(i.created_at).getTime() >= new Date(monthStart).getTime() && paidStatuses.includes(String(i.status || "").toLowerCase()));
      const branch = (branchesQ.data || []).find((b) => b.clinic_id === clinic.id);
      const subscription = (subscriptionsQ.data || []).find((s) => s.clinic_id === clinic.id);
      const settings = (settingsQ.data || []).find((s) => s.clinic_id === clinic.id);
      const activeStaff = cs.filter((s) => ["active", "نشط", "نشطة"].includes(String(s.status || "").toLowerCase()));
      const activePatients = cp.filter((p) => !["inactive", "archived", "discharged", "غير نشط", "مؤرشف", "منتهي"].includes(String(p.status || "").toLowerCase()));
      const checks = [
        !!(clinic.name && clinic.phone && clinic.address),
        !!settings,
        !!settings?.default_session_price,
        services.some((s) => s.clinic_id === clinic.id && s.is_active),
        activeStaff.length > 0,
        cp.length > 0,
        ca.length > 0,
        ci.some((i) => paidStatuses.includes(String(i.status || "").toLowerCase())),
      ];
      const previousAppointments = ca.filter((a) => new Date(a.starts_at).getTime() >= new Date(previousStart).getTime() && new Date(a.starts_at).getTime() < new Date(monthStart).getTime()).length;
      const previousPaid = ci.filter((i) => new Date(i.created_at).getTime() >= new Date(previousStart).getTime() && new Date(i.created_at).getTime() < new Date(monthStart).getTime() && paidStatuses.includes(String(i.status || "").toLowerCase())).reduce((sum, i) => sum + money(i.amount), 0);
      return {
        id: clinic.id, name: clinic.name, slug: clinic.slug, logoUrl: branch?.logo_url || clinic.logo_url || settings?.logo_url || null,
        todayAppointments: ca.filter((a) => new Date(a.starts_at).getTime() >= new Date(todayStart).getTime() && new Date(a.starts_at).getTime() < new Date(tomorrow).getTime()).length,
        monthAppointments: monthAppointments.length, previousAppointments,
        attendanceRate: due.length ? Math.round(attended.length / due.length * 100) : null,
        receivedPayments: paid.reduce((sum, i) => sum + money(i.amount), 0), previousPayments: previousPaid,
        activeStaff: activeStaff.length, activePatients: activePatients.length,
        setupProgress: { completed: checks.filter(Boolean).length, total: checks.length },\n        setupChecks: checks,
        subscription: subscription?.plan_name || "—",
        subscriptionStatus: subscription?.status || "pending",
        activeUsers: activeStaff.length,
        branchName: branch?.short_name || branch?.full_name || clinic.name,
        createdAt: clinic.created_at,
      };
    });

    const sum = (key: string) => centers.reduce((total: number, center: any) => total + (Number(center[key]) || 0), 0);
    const dueAll = appointments.filter((a) => new Date(a.starts_at).getTime() >= new Date(monthStart).getTime() && new Date(a.starts_at).getTime() <= now.getTime() && !cancelledStatuses.includes(String(a.status || "").toLowerCase()));
    const attendedAll = dueAll.filter((a) => attendedStatuses.includes(String(a.status || "").toLowerCase()));
    const currentPaid = invoices.filter((i) => i.created_at >= monthStart && paidStatuses.includes(String(i.status || "").toLowerCase()));
    const previousPaid = invoices.filter((i) => new Date(i.created_at).getTime() < new Date(monthStart).getTime() && paidStatuses.includes(String(i.status || "").toLowerCase()));
    return NextResponse.json({
      centers,
      totals: {
        todayAppointments: sum("todayAppointments"),
        monthAppointments: sum("monthAppointments"),
        previousAppointments: sum("previousAppointments"),
        attendanceRate: dueAll.length ? Math.round(attendedAll.length / dueAll.length * 100) : null,
        receivedPayments: currentPaid.reduce((total, item) => total + money(item.amount), 0),
        previousPayments: previousPaid.reduce((total, item) => total + money(item.amount), 0),
        activeStaff: sum("activeStaff"), activePatients: sum("activePatients"), activeUsers: sum("activeUsers"),
        userLimit: 20,
      },
      updatedAt: now.toISOString(),
    }, { headers: { "Cache-Control": "no-store, private" } });
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (/unauthorized/i.test(message)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    console.error("[Overview] Failed to load overview:", error);
    return NextResponse.json({ error: "تعذر تحميل بيانات النظرة العامة حاليًا." }, { status: 500 });
  }
}
