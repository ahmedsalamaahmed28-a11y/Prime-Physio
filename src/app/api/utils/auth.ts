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

export async function requireAuth(req: NextRequest): Promise<AuthUser> {
  // 1. Try NextAuth session (Google OAuth users)
  try {
    const session = await getServerSession(authOptions);
    if (session?.user?.email) {
      return { email: session.user.email.trim().toLowerCase(), userId: undefined };
    }
  } catch (err) {
    console.error("[auth] NextAuth session error:", err);
  }

  // 2. Try Supabase session cookie (email/password users)
  try {
    const cookies = req.cookies.getAll();
    const tokenCookies = cookies.filter(c => c.name.startsWith("sb-") && c.name.includes("-auth-token"));
    const groupedCookies: Record<string, typeof cookies> = {};

    for (const cookie of tokenCookies) {
      const baseName = cookie.name.replace(/\.\d+$/, "");
      if (!groupedCookies[baseName]) groupedCookies[baseName] = [];
      groupedCookies[baseName].push(cookie);
    }

    for (const baseName in groupedCookies) {
      const group = groupedCookies[baseName].sort((a, b) => a.name.localeCompare(b.name));
      let tokenValue = group.map(c => c.value).join("");

      try {
        if (tokenValue.startsWith("base64-")) {
          tokenValue = Buffer.from(tokenValue.slice("base64-".length), "base64").toString("utf-8");
        }
        const parsed = JSON.parse(tokenValue);
        if (typeof parsed?.access_token !== "string") continue;

        const { data: { user }, error } = await getAdminClient().auth.getUser(parsed.access_token);
        if (
          !error &&
          user?.email &&
          (user.email_confirmed_at || user.confirmed_at) &&
          user.app_metadata?.auth_source !== "nextauth-shadow"
        ) {
          return { email: user.email.trim().toLowerCase(), userId: user.id };
        }
      } catch {
        // Ignore malformed cookie groups and continue checking other supported sessions.
      }
    }
  } catch (err) {
    console.error("[auth] Supabase cookie error:", err);
  }

  // 3. Try Authorization header (programmatic access)
  const authHeader = req.headers.get("authorization");
  if (authHeader?.startsWith("Bearer ")) {
    const token = authHeader.slice(7).trim();
    if (token) {
      const { data: { user }, error } = await getAdminClient().auth.getUser(token);
      if (
        !error &&
        user?.email &&
        (user.email_confirmed_at || user.confirmed_at) &&
        user.app_metadata?.auth_source !== "nextauth-shadow"
      ) {
        return { email: user.email.trim().toLowerCase(), userId: user.id };
      }
    }
  }

  throw new Error("Unauthorized");
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

    if (platformAdmin) {
      return { ...authed, roleKey: "platform_admin" };
    }
  }

  const { data: staff, error: staffError } = await admin
    .from("staff")
    .select("role, clinic_id, status")
    .eq("email", email)
    .limit(1)
    .maybeSingle();

  // Fail closed: a database error must never be treated as a missing/valid membership.
  if (staffError) {
    console.error("[auth] Staff-role lookup failed:", staffError);
    throw new Error("Unable to verify account permissions");
  }

  if (!staff || ["محذوف", "deleted"].includes(String(staff.status || "").trim().toLowerCase())) {
    if (allowedRoles.includes("platform_admin")) {
      throw new Error("Unauthorized — you are not a platform admin");
    }
    throw new Error("لم يتم العثور على حساب موظف نشط");
  }

  const roleKey = mapStaffRoleToRoleKey(staff.role);
  if (roleKey === "unknown" || !allowedRoles.includes(roleKey)) {
    throw new Error("غير مصرح — صلاحية غير كافية");
  }

  return { ...authed, roleKey, clinicId: staff.clinic_id };
}

export async function requireAuthOnly(req: NextRequest): Promise<AuthUser> {
  return requireAuth(req);
}
