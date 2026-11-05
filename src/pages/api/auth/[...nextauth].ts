import NextAuth from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import CredentialsProvider from "next-auth/providers/credentials";
import { NextApiRequest, NextApiResponse } from "next";
import { getAdminClient } from "@/lib/supabase-admin";
import bcrypt from "bcryptjs";
import { createHmac } from "crypto";

export const authOptions = {
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
        const forwarded = headers["x-forwarded-for"];
        const realIp = headers["x-real-ip"];
        const forwardedIp = Array.isArray(forwarded)
          ? forwarded[0]
          : typeof forwarded === "string"
            ? forwarded.split(",")[0]
            : "";
        const ip = String(forwardedIp || realIp || "unknown").trim().slice(0, 128);
        const ipHash = createHmac("sha256", secret).update(ip).digest("hex");

        try {
          const admin = getAdminClient();
          const { data: allowed, error: rateLimitError } = await admin.rpc("check_auth_login_attempt", {
            p_email: email,
            p_ip_hash: ipHash,
          });
          if (rateLimitError || allowed !== true) return null;

          const { data, error } = await admin
            .from("auth_accounts")
            .select("id, email, password_hash, verified")
            .eq("email", email)
            .maybeSingle();

          if (error || !data || data.verified !== true) return null;

          const valid = await bcrypt.compare(String(credentials.password), data.password_hash);
          if (!valid) return null;

          const { error: clearError } = await admin.rpc("clear_auth_login_attempts", {
            p_email: email,
            p_ip_hash: ipHash,
          });
          if (clearError) {
            console.error("[Auth] Failed to clear login attempt counter:", clearError);
          }

          return {
            id: data.id,
            email: data.email,
            name: data.email.split("@")[0],
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
      }
      return token;
    },
    async session({ session, token }: any) {
      if (session?.user) {
        session.user.id = token.sub || token.id;
        session.user.email = token.email;
        session.user.name = token.name;
      }
      return session;
    },
  },
};

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  return NextAuth(req, res, authOptions);
}
