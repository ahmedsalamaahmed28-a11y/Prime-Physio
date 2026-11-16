import { getAdminClient } from "./supabase";

export type SubscriptionResource =
  | "patients"
  | "active_users"
  | "total_users"
  | "sessions"
  | "centers"
  | "storage";

type PlanLimits = {
  plan_code: string;
  max_active_users: number;
  max_total_users: number;
  max_centers: number;
  max_patients: number;
  max_sessions_per_month: number;
  max_storage_bytes: number | string;
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
  const { data: planData, error: planError } = await admin.rpc(
    "get_clinic_subscription_limits",
    { p_clinic_id: clinicId }
  );
  if (planError) throw planError;

  const limits = planData as PlanLimits | null;
  if (!limits?.plan_code) return { allowed: false, reason: "unknown_plan" };

  let current = 0;
  let limit = -1;

  if (resource === "patients") {
    const { count, error } = await admin
      .from("patients")
      .select("id", { count: "exact", head: true })
      .eq("clinic_id", clinicId);
    if (error) throw error;
    current = count || 0;
    limit = Number(limits.max_patients);
  } else if (resource === "active_users" || resource === "total_users") {
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

    const ownerEmails = new Set(
      (owners || []).map((owner) => String(owner.owner_email || "").trim().toLowerCase())
    );
    const rows = (data || []).filter(
      (row) => !ownerEmails.has(String(row.email || "").trim().toLowerCase())
    );
    const ownerCount = ownerEmails.size;
    current = ownerCount + (resource === "active_users"
      ? rows.filter((row) => ACTIVE_STATUSES.has(String(row.status || "").trim().toLowerCase())).length
      : rows.filter((row) => !DELETED_STATUSES.has(String(row.status || "").trim().toLowerCase())).length);
    limit = resource === "active_users"
      ? Number(limits.max_active_users)
      : Number(limits.max_total_users);
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
    limit = Number(limits.max_sessions_per_month);
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
    limit = Number(limits.max_centers);
  } else if (resource === "storage") {
    // Read in stable pages so clinics with more than the API's default row limit
    // are not shown an artificially low storage total.
    const pageSize = 1000;
    let offset = 0;
    let hasMore = true;
    while (hasMore) {
      const { data, error } = await admin
        .from("patient_attachments")
        .select("id,file_size")
        .eq("clinic_id", clinicId)
        .order("id", { ascending: true })
        .range(offset, offset + pageSize - 1);
      if (error) throw error;
      const rows = data || [];
      current += rows.reduce((sum, row) => sum + Number(row.file_size || 0), 0);
      hasMore = rows.length === pageSize;
      offset += rows.length;
    }
    limit = Number(limits.max_storage_bytes);
  }

  const allowed = limit === -1 || current + quantity <= limit;
  return {
    allowed,
    reason: allowed ? undefined : "limit_reached",
    plan: limits.plan_code,
    current,
    requested: quantity,
    limit,
    remaining: limit === -1 ? -1 : Math.max(0, limit - current),
  };
}
