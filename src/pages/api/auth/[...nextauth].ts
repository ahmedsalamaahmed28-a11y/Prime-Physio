import NextAuth from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import { NextApiRequest, NextApiResponse } from "next";

export const authOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID || "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
    }),
  ],
  pages: {
    signIn: "/login",
  },
  callbacks: {
    async session({ session, token }: any) {
      if (session?.user) {
        session.user.id = token.sub;
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
