import { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/pages/api/auth/[...nextauth]";
import { getAdminClient } from "@/lib/supabase";

export interface AuthUser {
  email: string;
  userId?: string;
  clinicId?: string;
}

function mapStaffRoleToRoleKey(role: string): "admin" | "doctor" | "receptionist" {
  const normalized = (role || "").trim().toLowerCase();
  if (["admin", "clinic_admin", "مدير العيادة", "مدير العياده"].includes(normalized)) return "admin";
  if (["موظف استقبال", "receptionist"].includes(normalized)) return "receptionist";
  if (["استشاري علاج طبيعي", "أخصائي علاج طبيعي", "اخصائي علاج طبيعي", "ممارس علاج طبيعي", "استشاري", "أخصائي", "اخصائي", "ممارس", "doctor", "therapist"].includes(normalized)) return "doctor";
  throw new Error("Unauthorized — unsupported staff role");
}

export async function requireAuth(req: NextRequest): Promise<AuthUser> {
  try {
    const session = await getServerSession(authOptions);
    if (session?.user?.email) {
      return { email: session.user.email.toLowerCase().trim() };
    }
  } catch (err) {
    console.error("[auth] NextAuth session error:", err);
  }

  try {
    const cookies = req.cookies.getAll();
    const tokenCookies = cookies.filter(c => c.name.startsWith("sb-") && c.name.includes("-auth-token"));
    const groupedCookies: Record<string, typeof cookies> = {};
    for (const cookie of tokenCookies) {
      const baseName = cookie.name.replace(/\.\d+$/, "");
      (groupedCookies[baseName] ||= []).push(cookie);
    }

    for (const group of Object.values(groupedCookies)) {
      const tokenValue = group.sort((a, b) => a.name.localeCompare(b.name)).map(c => c.value).join("");
      try {
        const decoded = tokenValue.startsWith("base64-")
          ? Buffer.from(tokenValue.slice(7), "base64").toString("utf-8")
          : tokenValue;
        const parsed = JSON.parse(decoded);
        if (typeof parsed?.access_token !== "string") continue;
        const { data: { user }, error } = await getAdminClient().auth.getUser(parsed.access_token);
        if (!error && user?.email) return { email: user.email.toLowerCase().trim(), userId: user.id };
      } catch {
        // Ignore malformed cookie groups and continue checking credentials.
      }
    }
  } catch (err) {
    console.error("[auth] Supabase cookie error:", err);
  }

  const authHeader = req.headers.get("authorization");
  if (authHeader?.startsWith("Bearer ")) {
    const token = authHeader.slice(7).trim();
    if (token) {
      const { data: { user }, error } = await getAdminClient().auth.getUser(token);
      if (!error && user?.email) return { email: user.email.toLowerCase().trim(), userId: user.id };
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

  if (allowedRoles.includes("platform_admin")) {
    const { data: platformAdmin, error } = await admin
      .from("platform_admins").select("id").eq("email", authed.email).limit(1).maybeSingle();
    if (error) throw new Error("Unable to verify platform administrator");
    if (platformAdmin) return { ...authed, roleKey: "platform_admin" };
  }

  const { data: staff, error } = await admin
    .from("staff").select("role, clinic_id").eq("email", authed.email).limit(1).maybeSingle();
  if (error) throw new Error("Unable to verify staff membership");
  if (!staff) throw new Error("Unauthorized — staff account not found");

  const roleKey = mapStaffRoleToRoleKey(staff.role);
  if (!allowedRoles.includes(roleKey)) throw new Error("Forbidden — insufficient role");
  if (!staff.clinic_id) throw new Error("Forbidden — no clinic membership");
  return { ...authed, roleKey, clinicId: staff.clinic_id };
}

export async function requireAuthOnly(req: NextRequest): Promise<AuthUser> {
  return requireAuth(req);
}
