import { NextResponse } from "next/server";
import { getAdminClient } from "@/lib/supabase-admin";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/pages/api/auth/[...nextauth]";
import { createHash, createHmac } from "crypto";
import type { User as SupabaseAuthUser } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";
export const revalidate = 0;

async function findAuthUserByEmail(admin: ReturnType<typeof getAdminClient>, email: string) {
  for (let page = 1; page <= 50; page += 1) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 1000 });
    if (error) throw error;
    const match = data.users.find((user) => user.email?.toLowerCase() === email);
    if (match) return match;
    if (data.users.length < 1000) return null;
  }
  throw new Error("Could not safely resolve existing Supabase identity");
}

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers: { "Cache-Control": "no-store, private" } });
    }

    const email = session.user.email.toLowerCase().trim();
    // getServerSession has already verified the signed NextAuth session and its JWT expiry.
    // Do not reject an otherwise authenticated session based on a missing or differently
    // serialized presentation-layer `expires` value. Use its expiry when valid; otherwise
    // bound the shadow-session metadata to the configured 8-hour NextAuth lifetime.
    const parsedSessionExpiry = Date.parse(session.expires || "");
    const nowSeconds = Math.floor(Date.now() / 1000);
    const nextAuthExpiresAt =
      Number.isFinite(parsedSessionExpiry) && parsedSessionExpiry > Date.now()
        ? Math.floor(parsedSessionExpiry / 1000)
        : nowSeconds + 8 * 60 * 60;
    const secret = process.env.NEXTAUTH_SECRET;
    if (!secret || secret.length < 32) {
      return NextResponse.json({ error: "Authentication is not configured securely" }, { status: 503, headers: { "Cache-Control": "no-store, private" } });
    }

    const admin = getAdminClient();
    const shadowPassword = createHmac("sha256", secret)
      .update(`${email}:prime-physio-shadow-user`)
      .digest("hex");

    let authResult = await admin.auth.signInWithPassword({ email, password: shadowPassword });

    if (authResult.error) {
      // Migrate the legacy SHA-256 shadow password without touching ordinary Supabase users.
      // Never attempt the historical hard-coded fallback credential. It was predictable
      // and could allow direct Supabase Auth sign-in outside this NextAuth session bridge.
      const legacyPasswords = [
        createHash("sha256").update(email + secret + "SHADOW").digest("hex"),
      ];
      let legacySessionUser: SupabaseAuthUser | null = null;

      for (const legacyPassword of legacyPasswords) {
        const legacy = await admin.auth.signInWithPassword({ email, password: legacyPassword });
        if (!legacy.error && legacy.data.user) {
          legacySessionUser = legacy.data.user;
          break;
        }
      }

      if (legacySessionUser) {
        const { error: upgradeError } = await admin.auth.admin.updateUserById(legacySessionUser.id, {
          password: shadowPassword,
          app_metadata: {
            ...(legacySessionUser.app_metadata || {}),
            auth_source: "nextauth-shadow",
            nextauth_expires_at: nextAuthExpiresAt,
          },
        });
        if (upgradeError) throw upgradeError;
        authResult = await admin.auth.signInWithPassword({ email, password: shadowPassword });
      } else {
        const existingUser = await findAuthUserByEmail(admin, email);

        if (existingUser?.app_metadata?.auth_source === "nextauth-shadow") {
          const { error: rotateError } = await admin.auth.admin.updateUserById(existingUser.id, {
            password: shadowPassword,
          });
          if (rotateError) throw rotateError;
          authResult = await admin.auth.signInWithPassword({ email, password: shadowPassword });
        } else if (existingUser) {
          // Never overwrite a user's independently managed Supabase Auth password.
          return NextResponse.json(
            { error: "An existing Supabase identity needs account-linking review" },
            { status: 409, headers: { "Cache-Control": "no-store, private" } }
          );
        } else {
          const { error: createError } = await admin.auth.admin.createUser({
            email,
            password: shadowPassword,
            email_confirm: true,
            app_metadata: { auth_source: "nextauth-shadow", nextauth_expires_at: nextAuthExpiresAt },
          });
          if (createError) throw createError;
          authResult = await admin.auth.signInWithPassword({ email, password: shadowPassword });
        }
      }
    }

    if (authResult.error || !authResult.data.session || !authResult.data.user) {
      console.error("[SupabaseSession] Shadow session provisioning failed:", authResult.error);
      return NextResponse.json({ error: "Failed to establish data session" }, { status: 503, headers: { "Cache-Control": "no-store, private" } });
    }

    const currentAppMetadata = authResult.data.user.app_metadata || {};
    const storedNextAuthExpiry = Number(currentAppMetadata.nextauth_expires_at || 0);
    if (
      currentAppMetadata.auth_source !== "nextauth-shadow" ||
      storedNextAuthExpiry !== nextAuthExpiresAt
    ) {
      const { error: metadataError } = await admin.auth.admin.updateUserById(authResult.data.user.id, {
        app_metadata: {
          ...currentAppMetadata,
          auth_source: "nextauth-shadow",
          nextauth_expires_at: nextAuthExpiresAt,
        },
      });
      if (metadataError) throw metadataError;
      authResult = await admin.auth.signInWithPassword({ email, password: shadowPassword });
    }

    if (authResult.error || !authResult.data.session) {
      console.error("[SupabaseSession] Final shadow sign-in failed:", authResult.error);
      return NextResponse.json({ error: "Failed to establish data session" }, { status: 503, headers: { "Cache-Control": "no-store, private" } });
    }

    return NextResponse.json(
      { session: authResult.data.session },
      { headers: { "Cache-Control": "no-store, private" } }
    );
  } catch (error) {
    console.error("[SupabaseSession] Provisioning error:", error);
    return NextResponse.json(
      { error: "Failed to establish data session" },
      { status: 503, headers: { "Cache-Control": "no-store, private" } }
    );
  }
}
