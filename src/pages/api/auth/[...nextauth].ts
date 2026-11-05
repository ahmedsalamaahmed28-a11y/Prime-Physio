import NextAuth from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import CredentialsProvider from "next-auth/providers/credentials";
import { NextApiRequest, NextApiResponse } from "next";
import { createClient } from "@supabase/supabase-js";
import bcrypt from "bcryptjs";
import crypto from "crypto";

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

        const email = credentials.email.toLowerCase().trim();
        const authSecret = process.env.NEXTAUTH_SECRET;
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
        const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
        if (!authSecret || authSecret.length < 32 || !supabaseUrl || !serviceRoleKey) {
          console.error("[CredentialsAuth] Required server auth configuration is missing");
          return null;
        }

        const forwardedFor = req?.headers?.["x-forwarded-for"];
        const realIp = req?.headers?.["x-real-ip"];
        const ip = (Array.isArray(forwardedFor) ? forwardedFor[0] : forwardedFor)?.split(",")[0]?.trim()
          || (Array.isArray(realIp) ? realIp[0] : realIp)?.trim()
          || "unknown";
        const ipHash = crypto.createHmac("sha256", authSecret).update(ip).digest("hex");

        const admin = createClient(supabaseUrl, serviceRoleKey, {
          auth: { autoRefreshToken: false, persistSession: false },
        });

        const { data: allowed, error: rateLimitError } = await admin.rpc("check_auth_login_attempt", {
          p_email: email,
          p_ip_hash: ipHash,
        });
        if (rateLimitError || allowed !== true) {
          if (rateLimitError) console.error("[CredentialsAuth] Rate-limit check failed:", rateLimitError.message);
          return null;
        }

        const { data, error } = await admin
          .from("auth_accounts")
          .select("id, email, password_hash, verified")
          .eq("email", email)
          .maybeSingle();

        if (error || !data || data.verified !== true) return null;
        const valid = await bcrypt.compare(credentials.password, data.password_hash);
        if (!valid) return null;

        const { error: clearError } = await admin.rpc("clear_auth_login_attempts", {
          p_email: email,
          p_ip_hash: ipHash,
        });
        if (clearError) console.error("[CredentialsAuth] Could not clear login attempts:", clearError.message);

        return {
          id: data.id,
          email: data.email,
          name: data.email.split("@")[0],
        };
      },
    }),
  ],
  pages: {
    signIn: "/manage",
  },
  callbacks: {
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
  const proto = req.headers["x-forwarded-proto"] || "http";
  const host = req.headers["x-forwarded-host"] || req.headers.host;
  if (host) {
    process.env.NEXTAUTH_URL = `${proto}://${host}`;
  }
  return NextAuth(req, res, authOptions);
}
