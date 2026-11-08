import "server-only";

import { getAdminClient } from "./supabase-admin";

const PLAN_LIMITS: Record<string, { patients: number; sessionsPerMonth: number }> = {
  basic:  { patients: 50,  sessionsPerMonth: 100 },
  silver: { patients: 200, sessionsPerMonth: 500 },
  gold:   { patients: -1,  sessionsPerMonth: -1 },
};

export async function checkSubscriptionLimit(clinicId: string, resource: "patients" | "sessions") {
  const admin = getAdminClient();

  const { data: sub } = await admin
    .from("subscriptions")
    .select("plan_name, status")
    .eq("clinic_id", clinicId)
    .eq("status", "active")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const planName = sub?.plan_name || "basic";
  const limits = PLAN_LIMITS[planName];
  if (!limits) {
    return { allowed: false, reason: "unknown_plan" };
  }

  if (resource === "patients" && limits.patients === -1) {
    return { allowed: true };
  }
  if (resource === "sessions" && limits.sessionsPerMonth === -1) {
    return { allowed: true };
  }

  const limit = resource === "patients" ? limits.patients : limits.sessionsPerMonth;

  let count: number | null = null;

  if (resource === "patients") {
    const { count: c } = await admin
      .from("patients")
      .select("*", { count: "exact", head: true })
      .eq("clinic_id", clinicId);
    count = c;
  } else {
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);
    const { count: c } = await admin
      .from("sessions")
      .select("*", { count: "exact", head: true })
      .eq("clinic_id", clinicId)
      .gte("created_at", startOfMonth.toISOString());
    count = c;
  }

  if (count !== null && count >= limit) {
    return { allowed: false, reason: "limit_reached", current: count, limit };
  }

  return { allowed: true, current: count ?? 0, limit };
}
