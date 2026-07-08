import { NextRequest, NextResponse } from "next/server";
import { getAdminClient } from "@/lib/supabase";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/pages/api/auth/[...nextauth]";
import crypto from "crypto";

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user?.email) {
      return NextResponse.json({ error: "Unauthorized: No NextAuth session found" }, { status: 401 });
    }

    const email = session.user.email.toLowerCase().trim();
    const admin = getAdminClient();
    
    // Deterministic secure password known only to the server
    const baseSecret = process.env.NEXTAUTH_SECRET || "fallback_secret_123456789";
    const shadowPassword = crypto.createHash("sha256").update(email + baseSecret + "SHADOW").digest("hex");

    // Try to sign in
    let { data: authData, error: authError } = await admin.auth.signInWithPassword({
      email,
      password: shadowPassword,
    });

    // If it fails (likely because the user doesn't exist), create the user
    if (authError && (authError.message.includes("Invalid login") || authError.message.includes("not found"))) {
      const { data: newUser, error: createError } = await admin.auth.admin.createUser({
        email,
        password: shadowPassword,
        email_confirm: true,
      });

      if (createError) {
        console.error("[SupabaseSession] Failed to create shadow user:", createError);
        return NextResponse.json({ error: "Failed to provision Supabase user" }, { status: 500 });
      }

      // Try signing in again
      const retryAuth = await admin.auth.signInWithPassword({
        email,
        password: shadowPassword,
      });
      
      authData = retryAuth.data;
      authError = retryAuth.error;
    }

    if (authError || !authData?.session) {
      console.error("[SupabaseSession] Failed to sign in shadow user:", authError);
      return NextResponse.json({ error: "Failed to authenticate with Supabase" }, { status: 500 });
    }

    return NextResponse.json({ session: authData.session });
  } catch (error: any) {
    console.error("[SupabaseSession] Unhandled error:", error);
    return NextResponse.json({ error: error.message || "Unknown error" }, { status: 500 });
  }
}
