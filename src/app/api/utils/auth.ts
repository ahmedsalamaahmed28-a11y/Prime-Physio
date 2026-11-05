import { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/pages/api/auth/[...nextauth]";
import { getAdminClient } from "@/lib/supabase-admin";

export interface AuthUser {
  email: string;
  userId?: string;
  clinicId?: string;
}

function mapStaffRoleToRoleKey(role: string): "admin" | "doctor" | "receptionist" {
  switch (role) {
    case "admin":
    case "مدير العياده":
    case "مدير العيادة":
      return "admin";
    case "موظف استقبال":
    case "receptionist":
      return "receptionist";
    default:
      return "doctor";
  }
}

export async function requireAuth(req: NextRequest): Promise<AuthUser> {
  // 1. Try NextAuth session (Google OAuth users)
  try {
    const session = await getServerSession(authOptions);
    if (session?.user?.email) {
      return { email: session.user.email, userId: undefined }; // NextAuth might not expose sub easily in session, but email is enough
    }
  } catch (err) {
    console.error("[auth] NextAuth session error:", err);
  }

  // 2. Try Supabase session cookie (email/password users)
  try {
    const cookies = req.cookies.getAll();
    const tokenCookies = cookies.filter(c => c.name.startsWith("sb-") && c.name.includes("-auth-token"));
    
    // Group cookies by their base name (e.g. "sb-[id]-auth-token")
    const groupedCookies: Record<string, typeof cookies> = {};
    for (const c of tokenCookies) {
      const baseName = c.name.replace(/\.\d+$/, "");
      if (!groupedCookies[baseName]) groupedCookies[baseName] = [];
      groupedCookies[baseName].push(c);
    }
    
    // Try parsing each group
    for (const baseName in groupedCookies) {
      const group = groupedCookies[baseName].sort((a, b) => a.name.localeCompare(b.name));
      let tokenValue = group.map(c => c.value).join("");
      
      try {
        if (tokenValue.startsWith("base64-")) {
          tokenValue = Buffer.from(tokenValue.replace("base64-", ""), "base64").toString("utf-8");
        }
        const parsed = JSON.parse(tokenValue);
        const { data: { user }, error } = await getAdminClient().auth.getUser(parsed.access_token);
        if (
          !error &&
          user?.email &&
          (user.email_confirmed_at || user.confirmed_at) &&
          user.app_metadata?.auth_source !== "nextauth-shadow"
        ) {
          return { email: user.email, userId: user.id };
        }
      } catch (e) {
        // Ignore JSON parse errors for this specific group and try the next one
      }
    }
  } catch (err) {
    console.error("[auth] Supabase cookie error:", err);
  }

  // 3. Try Authorization header (programmatic access)
  const authHeader = req.headers.get("authorization");
  if (authHeader?.startsWith("Bearer ")) {
    const { data: { user }, error } = await getAdminClient().auth.getUser(authHeader.slice(7));
    if (
      !error &&
      user?.email &&
      (user.email_confirmed_at || user.confirmed_at) &&
      user.app_metadata?.auth_source !== "nextauth-shadow"
    ) {
      return { email: user.email, userId: user.id };
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

  // If checking for platform_admin, verify in platform_admins table
  if (allowedRoles.includes("platform_admin")) {
    const { data: platformAdmin } = await admin
      .from("platform_admins")
      .select("*")
      .eq("email", authed.email)
      .limit(1)
      .maybeSingle();

    if (platformAdmin) {
      return { ...authed, roleKey: "platform_admin" };
    }
  }

  const { data: staff } = await admin
    .from("staff")
    .select("role, clinic_id")
    .eq("email", authed.email)
    .limit(1)
    .maybeSingle();

  if (!staff) {
    if (allowedRoles.includes("platform_admin")) {
        throw new Error("Unauthorized — you are not a platform admin");
    }
    throw new Error("لم يتم العثور على حساب الموظف");
  }

  const roleKey = mapStaffRoleToRoleKey(staff.role);

  if (!allowedRoles.includes(roleKey)) {
    throw new Error("غير مصرح — صلاحية غير كافية");
  }

  return { ...authed, roleKey, clinicId: staff.clinic_id };
}

export async function requireAuthOnly(req: NextRequest): Promise<AuthUser> {
  return requireAuth(req);
}
