import { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/pages/api/auth/[...nextauth]";
import { getAdminClient } from "@/lib/supabase-admin";

export interface AuthUser {
  email: string;
  userId?: string;
  clinicId?: string;
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
  try {
    const session = await getServerSession(authOptions);
    if (session?.user?.email) {
      const email = session.user.email.trim().toLowerCase();
      let clinicId = typeof (session.user as any).clinicId === "string" ? (session.user as any).clinicId : undefined;
      const shadowToken = parseAuthCookie(req);
      if (shadowToken) {
        const { data: { user }, error } = await getAdminClient().auth.getUser(shadowToken);
        if (!error && user?.email?.toLowerCase() === email && user.app_metadata?.auth_source === "nextauth-shadow") {
          const activeClinicId = user.app_metadata?.active_clinic_id;
          if (typeof activeClinicId === "string") clinicId = activeClinicId;
          else if (activeClinicId === null) clinicId = undefined;
        }
      }
      return {
        email,
        userId: typeof session.user.id === "string" ? session.user.id : undefined,
        clinicId,
      };
    }
  } catch (err) {
    console.error("[auth] NextAuth session error:", err);
  }

  const admin = getAdminClient();
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
      // Continue to supported bearer-token authentication.
    }
  }

  const authHeader = req.headers.get("authorization");
  if (authHeader?.startsWith("Bearer ")) {
    const token = authHeader.slice(7).trim();
    if (token) {
      const { data: { user }, error } = await admin.auth.getUser(token);
      if (!error && user?.email && (user.email_confirmed_at || user.confirmed_at) && user.app_metadata?.auth_source !== "nextauth-shadow") {
        return {
          email: user.email.trim().toLowerCase(),
          userId: user.id,
          clinicId: typeof user.app_metadata?.active_clinic_id === "string" ? user.app_metadata.active_clinic_id : undefined,
        };
      }
    }
  }

  throw new Error("Unauthorized");
}

async function resolveActiveClinicId(req: NextRequest, authed: AuthUser, admin: ReturnType<typeof getAdminClient>) {
  let clinicId = authed.clinicId || null;
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

  if (allowedRoles.includes("platform_admin")) {
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
