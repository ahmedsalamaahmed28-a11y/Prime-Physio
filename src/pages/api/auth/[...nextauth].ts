import NextAuth from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import CredentialsProvider from "next-auth/providers/credentials";
import { NextApiRequest, NextApiResponse } from "next";
import { createClient } from "@supabase/supabase-js";
import bcrypt from "bcryptjs";

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
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        const admin = createClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL || "",
          process.env.SUPABASE_SERVICE_ROLE_KEY || ""
        );

        const { data, error } = await admin
          .from("auth_accounts")
          .select("id, email, password_hash, verified")
          .eq("email", credentials.email.toLowerCase().trim())
          .maybeSingle();

        if (error || !data) return null;

        // Unverified accounts must never receive a credentials session.
        if (data.verified !== true) return null;

        const valid = await bcrypt.compare(credentials.password, data.password_hash);
        if (!valid) return null;

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
