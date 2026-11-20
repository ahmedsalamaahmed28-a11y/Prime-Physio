import { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/pages/api/auth/[...nextauth]";
import { getAdminClient } from "@/lib/supabase-admin";

export interface AuthUser {
  email: string;
  userId?: string;
  clinicId?: string;
  authSource?: string;
}

function mapStaffRoleToRoleKey(role: string): "admin" | "doctor" | "receptionist" | "unknown" {
  switch (role) {
    case "admin":
    case "clinic_admin":
    case "مدير العياده":
    case "مدير العيادة":
      return "admin";
    case "موظف استقبال":
    case "receptionist":
      return "receptionist";
    case "استشاري علاج طبيعي":
    case "أخصائي علاج طبيعي":
    case "ممارس علاج طبيعي":
    case "doctor":
      return "doctor";
    default:
      return "unknown";
  }
}

function parseAuthCookie(req: NextRequest): string | null {
  const cookies = req.cookies.getAll();
  const tokenCookies = cookies.filter((cookie) => cookie.name.startsWith("sb-") && cookie.name.includes("-auth-token"));
  const grouped: Record<string, typeof cookies> = {};
  for (const cookie of tokenCookies) {
    const base = cookie.name.replace(/\.\d+$/, "");
    if (!grouped[base]) grouped[base] = [];
    grouped[base].push(cookie);
  }
  for (const base of Object.keys(grouped)) {
    const group = grouped[base].sort((a, b) => a.name.localeCompare(b.name));
    let raw = group.map((cookie) => cookie.value).join("");
    try {
      if (raw.startsWith("base64-")) raw = Buffer.from(raw.slice(7), "base64").toString("utf-8");
      const parsed = JSON.parse(raw);
      if (typeof parsed?.access_token === "string") return parsed.access_token;
    } catch {
      // Ignore malformed cookie values.
    }
  }
  return null;
}

export async function requireAuth(req: NextRequest): Promise<AuthUser> {
  const admin = getAdminClient();

  // A clinic-scoped bearer token is the authoritative identity for this tab.
  // It must be checked before the origin-wide NextAuth cookie, otherwise a
  // second clinic login in another tab can silently replace this tab's scope.
  const authHeader = req.headers.get("authorization");
  if (authHeader) {
    const tokenMatch = authHeader.match(/^Bearer\s+(.+)$/i);
    const token = tokenMatch?.[1]?.trim();
    if (!token) throw new Error("Unauthorized");

    const { data: { user }, error } = await admin.auth.getUser(token);
    if (error || !user || !(user.email_confirmed_at || user.confirmed_at)) {
      // Never fall back to the shared NextAuth cookie when a caller supplied
      // an invalid/expired bearer token; doing so could change this tab's user.
      throw new Error("Unauthorized");
    }

    const metadata = user.app_metadata || {};
    if (metadata.auth_source === "clinic-scoped-shadow") {
      const canonicalEmail = typeof metadata.canonical_email === "string"
        ? metadata.canonical_email.trim().toLowerCase()
        : "";
      const clinicId = typeof metadata.clinic_id === "string" ? metadata.clinic_id : "";
      const expiresAt = Number(metadata.nextauth_expires_at || 0);
      if (
        !canonicalEmail ||
        !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(clinicId) ||
        !Number.isSafeInteger(expiresAt) ||
        expiresAt <= Math.floor(Date.now() / 1000)
      ) {
        throw new Error("Invalid or expired clinic-scoped session");
      }

      const [{ data: clinic, error: clinicError }, { data: owner, error: ownerError }, { data: staff, error: staffError }] = await Promise.all([
        admin.from("clinics").select("id,is_active,status").eq("id", clinicId).maybeSingle(),
        admin.from("clinic_owners").select("clinic_id").eq("clinic_id", clinicId).eq("owner_email", canonicalEmail).maybeSingle(),
        admin.from("staff").select("clinic_id,status").eq("clinic_id", clinicId).eq("email", canonicalEmail).maybeSingle(),
      ]);
      if (clinicError || ownerError || staffError) throw new Error("Unable to verify clinic-scoped membership");
      if (!clinic || clinic.is_active !== true || String(clinic.status || "").trim().toLowerCase() !== "active") {
        throw new Error("Forbidden: Clinic is inactive");
      }
      const activeStaff = Boolean(staff && !["محذوف", "deleted", "inactive", "غير نشط"].includes(String(staff.status || "").trim().toLowerCase()));
      if (!owner && !activeStaff) throw new Error("Forbidden: Clinic membership is inactive");

      return { email: canonicalEmail, userId: user.id, clinicId, authSource: "clinic-scoped-shadow" };
    }

    if (metadata.auth_source === "nextauth-shadow" || !user.email) throw new Error("Unauthorized");
    return {
      email: user.email.trim().toLowerCase(),
      userId: user.id,
      clinicId: typeof metadata.active_clinic_id === "string" ? metadata.active_clinic_id : undefined,
    };
  }

  // Legacy sign-in compatibility: the NextAuth cookie remains the initial
  // identity for existing sessions until the clinic-scoped exchange is wired.
  try {
    const session = await getServerSession(authOptions);
    if (session?.user?.email) {
      const email = session.user.email.trim().toLowerCase();
      let clinicId = typeof (session.user as any).clinicId === "string" ? (session.user as any).clinicId : undefined;
      const shadowToken = parseAuthCookie(req);
      if (shadowToken) {
        const { data: { user }, error } = await admin.auth.getUser(shadowToken);
        if (!error && user?.email?.toLowerCase() === email && user.app_metadata?.auth_source === "nextauth-shadow") {
          const activeClinicId = user.app_metadata?.active_clinic_id;
          if (typeof activeClinicId === "string") clinicId = activeClinicId;
          else if (activeClinicId === null) clinicId = undefined;
        }
      }
      return {
        email,
        userId: typeof (session.user as { id?: string }).id === "string" ? (session.user as { id?: string }).id : undefined,
        clinicId,
      };
    }
  } catch (err) {
    console.error("[auth] NextAuth session error:", err);
  }

  const cookieToken = parseAuthCookie(req);
  if (cookieToken) {
    try {
      const { data: { user }, error } = await admin.auth.getUser(cookieToken);
      if (!error && user?.email && (user.email_confirmed_at || user.confirmed_at) && user.app_metadata?.auth_source !== "nextauth-shadow") {
        return {
          email: user.email.trim().toLowerCase(),
          userId: user.id,
          clinicId: typeof user.app_metadata?.active_clinic_id === "string" ? user.app_metadata.active_clinic_id : undefined,
        };
      }
    } catch {
      // Invalid cookies do not establish identity.
    }
  }

  throw new Error("Unauthorized");
}

async function resolveActiveClinicId(req: NextRequest, authed: AuthUser, admin: ReturnType<typeof getAdminClient>) {
  // A clinic ID derived from a verified bearer token is already tab-scoped.
  // Never let an origin-wide Supabase cookie replace that verified tenant.
  if (authed.clinicId) return authed.clinicId;

  let clinicId: string | null = null;
  const token = parseAuthCookie(req);
  if (token) {
    const { data: { user }, error } = await admin.auth.getUser(token);
    if (!error && user?.email?.toLowerCase() === authed.email.toLowerCase()) {
      const claim = user.app_metadata?.active_clinic_id;
      if (typeof claim === "string") clinicId = claim;
    }
  }
  if (clinicId) return clinicId;

  const { data: owners, error: ownerError } = await admin
    .from("clinic_owners")
    .select("clinic_id")
    .eq("owner_email", authed.email);
  if (ownerError) throw new Error("Unable to verify center ownership");
  const ownerIds = [...new Set((owners || []).map((row) => row.clinic_id).filter(Boolean))];
  if (ownerIds.length === 1) return ownerIds[0];
  if (ownerIds.length > 1) throw new Error("Select a center before continuing");

  const { data: staffRows, error: staffError } = await admin
    .from("staff")
    .select("clinic_id")
    .eq("email", authed.email)
    .not("clinic_id", "is", null)
    .not("status", "in", '("محذوف","deleted","inactive","غير نشط")');
  if (staffError) throw new Error("Unable to verify staff membership");
  const staffIds = [...new Set((staffRows || []).map((row) => row.clinic_id).filter(Boolean))];
  if (staffIds.length === 1) return staffIds[0];
  if (staffIds.length > 1) throw new Error("Select a center before continuing");
  return null;
}

export async function requireRole(
  req: NextRequest,
  allowedRoles: Array<"admin" | "doctor" | "receptionist" | "platform_admin">
): Promise<AuthUser & { roleKey: string; clinicId?: string }> {
  const authed = await requireAuth(req);
  const admin = getAdminClient();
  const email = authed.email.trim().toLowerCase();

  if (allowedRoles.includes("platform_admin") && authed.authSource !== "clinic-scoped-shadow") {
    const { data: platformAdmin, error: platformAdminError } = await admin
      .from("platform_admins")
      .select("email")
      .eq("email", email)
      .limit(1)
      .maybeSingle();

    if (platformAdminError) {
      console.error("[auth] Platform-admin lookup failed:", platformAdminError);
      throw new Error("Unable to verify account permissions");
    }
    if (platformAdmin) return { ...authed, roleKey: "platform_admin" };
  }

  const clinicId = await resolveActiveClinicId(req, authed, admin);
  if (!clinicId) throw new Error("يجب اختيار مركز قبل متابعة العملية");

  // Enforce platform-level suspension for every clinic-scoped API.
  // Otherwise toggling clinics.is_active in the platform admin panel would
  // not actually revoke API access for existing staff sessions.
  const { data: clinic, error: clinicError } = await admin
    .from("clinics")
    .select("id,is_active,status")
    .eq("id", clinicId)
    .maybeSingle();

  if (clinicError) {
    console.error("[auth] Clinic status lookup failed:", clinicError);
    throw new Error("Unable to verify clinic status");
  }
  const blockedClinicStatuses = new Set(["inactive", "disabled", "suspended", "deleted", "غير نشط", "موقوف", "محذوف"]);
  if (!clinic || clinic.is_active === false || blockedClinicStatuses.has(String(clinic.status || "").trim().toLowerCase())) {
    throw new Error("Forbidden: Clinic is inactive");
  }

  const { data: ownerMembership, error: ownerError } = await admin
    .from("clinic_owners")
    .select("clinic_id")
    .eq("owner_email", email)
    .eq("clinic_id", clinicId)
    .maybeSingle();

  if (ownerError) {
    console.error("[auth] Owner membership lookup failed:", ownerError);
    throw new Error("Unable to verify account permissions");
  }
  if (ownerMembership) {
    if (!allowedRoles.includes("admin")) throw new Error("غير مصرح — صلاحية غير كافية");
    return { ...authed, roleKey: "admin", clinicId };
  }

  const { data: staff, error: staffError } = await admin
    .from("staff")
    .select("role, clinic_id, status")
    .eq("email", email)
    .eq("clinic_id", clinicId)
    .maybeSingle();

  if (staffError) {
    console.error("[auth] Staff-role lookup failed:", staffError);
    throw new Error("Unable to verify account permissions");
  }
  if (!staff || ["محذوف", "deleted", "inactive", "غير نشط"].includes(String(staff.status || "").trim().toLowerCase())) {
    throw new Error("لم يتم العثور على عضوية نشطة لهذا المركز");
  }

  const roleKey = mapStaffRoleToRoleKey(staff.role);
  if (roleKey === "unknown" || !allowedRoles.includes(roleKey)) {
    throw new Error("غير مصرح — صلاحية غير كافية");
  }

  return { ...authed, roleKey, clinicId };
}

export async function requireAuthOnly(req: NextRequest): Promise<AuthUser> {
  return requireAuth(req);
}
