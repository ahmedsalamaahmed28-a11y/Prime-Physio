import { getAdminClient } from "./supabase";

export type SubscriptionResource =
  | "patients"
  | "active_users"
  | "total_users"
  | "sessions"
  | "centers"
  | "storage";

type PlanLimits = {
  activeUsers: number;
  totalUsers: number;
  centers: number;
  sessionsPerMonth: number;
  storageBytes: number;
};

const PLAN_LIMITS: Record<string, PlanLimits> = {
  free:      { activeUsers: 20, totalUsers: 100, centers: 1, sessionsPerMonth: 2000, storageBytes: 1 * 1024 ** 3 },
  basic:     { activeUsers: 20, totalUsers: 100, centers: 1, sessionsPerMonth: 2000, storageBytes: 1 * 1024 ** 3 },
  starter:   { activeUsers: 20, totalUsers: 100, centers: 1, sessionsPerMonth: 2000, storageBytes: 1 * 1024 ** 3 },
  essential: { activeUsers: 100, totalUsers: 500, centers: 1, sessionsPerMonth: -1, storageBytes: 10 * 1024 ** 3 },
  silver:    { activeUsers: 100, totalUsers: 500, centers: 1, sessionsPerMonth: -1, storageBytes: 10 * 1024 ** 3 },
  standard:  { activeUsers: 100, totalUsers: 500, centers: 1, sessionsPerMonth: -1, storageBytes: 10 * 1024 ** 3 },
  medium:    { activeUsers: 500, totalUsers: 1000, centers: 2, sessionsPerMonth: -1, storageBytes: 20 * 1024 ** 3 },
  gold:      { activeUsers: 500, totalUsers: 1000, centers: 2, sessionsPerMonth: -1, storageBytes: 20 * 1024 ** 3 },
  advanced:  { activeUsers: 5000, totalUsers: -1, centers: 5, sessionsPerMonth: -1, storageBytes: 30 * 1024 ** 3 },
  maximum:   { activeUsers: -1, totalUsers: -1, centers: 10, sessionsPerMonth: -1, storageBytes: 50 * 1024 ** 3 },
};

const ACTIVE_STATUSES = new Set(["نشط", "active", "enabled"]);
const DELETED_STATUSES = new Set(["محذوف", "deleted"]);

export async function checkSubscriptionLimit(
  clinicId: string,
  resource: SubscriptionResource,
  quantity = 1
) {
  if (!Number.isInteger(quantity) || quantity < 1) {
    return { allowed: false, reason: "invalid_quantity" };
  }

  const admin = getAdminClient();
  const { data: sub, error: subError } = await admin
    .from("subscriptions")
    .select("plan_name")
    .eq("clinic_id", clinicId)
    .eq("status", "active")
    .or("end_date.is.null,end_date.gt." + new Date().toISOString())
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (subError) throw subError;
  const planName = String(sub?.plan_name || "free").trim().toLowerCase();
  const limits = PLAN_LIMITS[planName];
  if (!limits) return { allowed: false, reason: "unknown_plan" };

  // Patient records are not the "users" quota. The plan counts staff accounts.
  if (resource === "patients") return { allowed: true, current: 0, limit: -1 };

  let current = 0;
  let limit = -1;

  if (resource === "active_users" || resource === "total_users") {
    const { data, error } = await admin
      .from("staff")
      .select("status,email")
      .eq("clinic_id", clinicId);
    if (error) throw error;
    const { data: owners, error: ownersError } = await admin
      .from("clinic_owners")
      .select("owner_email")
      .eq("clinic_id", clinicId);
    if (ownersError) throw ownersError;
    const ownerEmails = new Set((owners || []).map((owner) => String(owner.owner_email || "").trim().toLowerCase()));
    const rows = (data || []).filter((row) => !ownerEmails.has(String(row.email || "").trim().toLowerCase()));
    const ownerCount = ownerEmails.size;
    current = ownerCount + (resource === "active_users"
      ? rows.filter((row) => ACTIVE_STATUSES.has(String(row.status || "").trim().toLowerCase())).length
      : rows.filter((row) => !DELETED_STATUSES.has(String(row.status || "").trim().toLowerCase())).length);
    limit = resource === "active_users" ? limits.activeUsers : limits.totalUsers;
  } else if (resource === "sessions") {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    const end = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    const { count, error } = await admin
      .from("sessions")
      .select("id", { count: "exact", head: true })
      .eq("clinic_id", clinicId)
      .gte("created_at", start.toISOString())
      .lt("created_at", end.toISOString());
    if (error) throw error;
    current = count || 0;
    limit = limits.sessionsPerMonth;
  } else if (resource === "centers") {
    const { data: owner, error: ownerError } = await admin
      .from("clinic_owners")
      .select("owner_email")
      .eq("clinic_id", clinicId)
      .limit(1)
      .maybeSingle();
    if (ownerError) throw ownerError;
    if (owner?.owner_email) {
      const { count, error } = await admin
        .from("clinic_owners")
        .select("clinic_id", { count: "exact", head: true })
        .eq("owner_email", owner.owner_email);
      if (error) throw error;
      current = count || 0;
    }
    limit = limits.centers;
  } else if (resource === "storage") {
    const { data, error } = await admin
      .from("patient_attachments")
      .select("file_size")
      .eq("clinic_id", clinicId);
    if (error) throw error;
    current = (data || []).reduce((sum, row) => sum + Number(row.file_size || 0), 0);
    limit = limits.storageBytes;
  }

  const allowed = limit === -1 || current + quantity <= limit;
  return {
    allowed,
    reason: allowed ? undefined : "limit_reached",
    current,
    requested: quantity,
    limit,
    remaining: limit === -1 ? -1 : Math.max(0, limit - current),
  };
}
