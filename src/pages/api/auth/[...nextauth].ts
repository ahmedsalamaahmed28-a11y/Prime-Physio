import NextAuth, { type NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import CredentialsProvider from "next-auth/providers/credentials";
import { NextApiRequest, NextApiResponse } from "next";
import { getAdminClient } from "@/lib/supabase-admin";
import bcrypt from "bcryptjs";
import { createHmac } from "crypto";

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID || "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
      authorization: { params: { prompt: "select_account" } },
    }),
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
        clinicSlug: { label: "Clinic", type: "text" },
      },
      async authorize(credentials, req) {
        if (!credentials?.email || !credentials?.password) return null;

        const email = String(credentials.email).trim().toLowerCase();
        if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return null;

        const secret = process.env.NEXTAUTH_SECRET;
        if (!secret || secret.length < 32) {
          console.error("[Auth] NEXTAUTH_SECRET is missing or too short");
          return null;
        }

        const headers = req?.headers || {};
        const realIp = headers["x-real-ip"];
        const forwarded = headers["x-forwarded-for"];
        const forwardedValues = Array.isArray(forwarded)
          ? forwarded
          : typeof forwarded === "string"
            ? forwarded.split(",")
            : [];
        // Prefer the proxy-normalized x-real-ip; otherwise use the final forwarded hop.
        const ip = String(realIp || forwardedValues[forwardedValues.length - 1] || "unknown").trim().slice(0, 128);
        const ipHash = createHmac("sha256", secret).update(`ip:${ip}`).digest("hex");
        const accountRateHash = createHmac("sha256", secret).update(`account:${email}`).digest("hex");

        try {
          const admin = getAdminClient();
          const [ipLimit, accountLimit] = await Promise.all([
            admin.rpc("check_auth_login_attempt", { p_email: email, p_ip_hash: ipHash }),
            admin.rpc("check_auth_login_attempt", { p_email: email, p_ip_hash: accountRateHash }),
          ]);
          if (ipLimit.error || accountLimit.error || ipLimit.data !== true || accountLimit.data !== true) return null;

          const { data, error } = await admin
            .from("auth_accounts")
            .select("id, email, password_hash, verified")
            .eq("email", email)
            .maybeSingle();

          if (error || !data || data.verified !== true) {
            // Keep nonexistent and unverified accounts close to the same bcrypt response time.
            await bcrypt.hash("Prime-Physio-invalid-login-dummy", 12);
            return null;
          }

          const valid = await bcrypt.compare(String(credentials.password), data.password_hash);
          if (!valid) return null;

          const clearResults = await Promise.all([
            admin.rpc("clear_auth_login_attempts", { p_email: email, p_ip_hash: ipHash }),
            admin.rpc("clear_auth_login_attempts", { p_email: email, p_ip_hash: accountRateHash }),
          ]);
          if (clearResults.some((result) => result.error)) {
            console.error("[Auth] Failed to clear one or more login attempt counters");
          }

          let clinicId: string | null = null;
          const requestedClinicSlug = String(credentials.clinicSlug || "").trim().toLowerCase();

          if (requestedClinicSlug) {
            if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(requestedClinicSlug) || requestedClinicSlug.length > 80) return null;

            const { data: requestedClinic, error: clinicError } = await admin
              .from("clinics")
              .select("id")
              .eq("slug", requestedClinicSlug)
              .eq("is_active", true)
              .eq("status", "active")
              .maybeSingle();

            if (clinicError || !requestedClinic?.id) return null;

            const { data: platformAdmin, error: platformAdminError } = await admin
              .from("platform_admins")
              .select("id")
              .eq("email", email)
              .limit(1)
              .maybeSingle();

            if (platformAdminError) return null;

            if (!platformAdmin) {
              const [{ data: staffMembership, error: staffMembershipError }, { data: ownerMembership, error: ownerMembershipError }] = await Promise.all([
                admin.from("staff").select("clinic_id").eq("email", email).eq("clinic_id", requestedClinic.id).neq("status", "محذوف").neq("status", "deleted").neq("status", "inactive").neq("status", "غير نشط").limit(1).maybeSingle(),
                admin.from("clinic_owners").select("clinic_id").eq("owner_email", email).eq("clinic_id", requestedClinic.id).limit(1).maybeSingle(),
              ]);

              if (staffMembershipError || ownerMembershipError || (!staffMembership && !ownerMembership)) return null;
            }
            clinicId = requestedClinic.id;
          }

          return {
            id: data.id,
            email: data.email,
            name: data.email.split("@")[0],
            clinicId,
          };
        } catch (error) {
          console.error("[Auth] Credentials authorization failed:", error);
          return null;
        }
      }
    }),
  ],
  session: { strategy: "jwt", maxAge: 8 * 60 * 60 },
  jwt: { maxAge: 8 * 60 * 60 },
  pages: {
    signIn: "/manage",
  },
  callbacks: {
    async signIn({ user, account, profile }: any) {
      if (account?.provider === "google") {
        const googleProfile = profile as { email_verified?: boolean } | undefined;
        return Boolean(user?.email && googleProfile?.email_verified === true);
      }
      return true;
    },
    async jwt({ token, user }: any) {
      if (user) {
        token.id = user.id;
        token.email = user.email;
        token.name = user.name;
        if (typeof (user as any).clinicId === "string") token.clinicId = (user as any).clinicId;
      }
      return token;
    },
    async session({ session, token }: any) {
      if (session?.user) {
        session.user.id = token.sub || token.id;
        session.user.email = token.email;
        session.user.name = token.name;
        (session.user as any).clinicId = typeof token.clinicId === "string" ? token.clinicId : null;
      }
      return session;
    },
  },
};

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  return NextAuth(req, res, authOptions);
}
