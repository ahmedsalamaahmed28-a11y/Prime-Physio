import { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";
import { getAdminClient } from "@/lib/supabase";

export interface AuthUser {
  email: string;
  userId?: string;
}

export async function requireAuth(req: NextRequest): Promise<AuthUser> {
  // 1. Try NextAuth token (Google OAuth users)
  const token = await getToken({ req });
  if (token?.email) {
    return { email: token.email, userId: token.sub };
  }

  // 2. Try Supabase session cookie (email/password users)
  try {
    const cookieName = "sb-pnqwkdqldfmcqozqrdeo-auth-token";
    const sbCookie = req.cookies.get(cookieName);
    if (sbCookie?.value) {
      const parsed = JSON.parse(sbCookie.value);
      const { data: { user }, error } = await getAdminClient().auth.getUser(parsed.access_token);
      if (!error && user?.email) {
        return { email: user.email, userId: user.id };
      }
    }
  } catch {}

  // 3. Try Authorization header (programmatic access)
  const authHeader = req.headers.get("authorization");
  if (authHeader?.startsWith("Bearer ")) {
    const { data: { user }, error } = await getAdminClient().auth.getUser(authHeader.slice(7));
    if (!error && user?.email) {
      return { email: user.email, userId: user.id };
    }
  }

  throw new Error("Unauthorized");
}
