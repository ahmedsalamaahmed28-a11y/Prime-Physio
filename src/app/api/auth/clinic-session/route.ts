import { NextRequest, NextResponse } from "next/server";
import { createHmac } from "crypto";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/pages/api/auth/[...nextauth]";
import { getAdminClient } from "@/lib/supabase-admin";
import type { User as SupabaseAuthUser } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const INACTIVE_STAFF_STATUSES = new Set(["محذوف", "deleted", "inactive", "غير نشط"]);

function noStoreJson(body: unknown, status = 200) {
  return NextResponse.json(body, {
    status,
    headers: { "Cache-Control": "no-store, private", Vary: "Cookie, Authorization" },
  });
}

function isSameOrigin(req: NextRequest) {
  const origin = req.headers.get("origin");
  if (!origin) return false;
  try {
    // Compare full origins against the canonical request URL. Do not trust
    // client-supplied forwarded-host headers for this credential-issuing route.
    return new URL(origin).origin === new URL(req.url).origin;
  } catch {
    return false;
  }
}

async function findAuthUserByEmail(
  admin: ReturnType<typeof getAdminClient>,
  email: string
): Promise<SupabaseAuthUser | null> {
  for (let page = 1; page <= 50; page += 1) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 1000 });
    if (error) throw error;
    const match = data.users.find((candidate) => candidate.email?.toLowerCase() === email);
    if (match) return match;
    if (data.users.length < 1000) return null;
  }
  throw new Error("Could not safely resolve the clinic-scoped identity");
}

export async function POST(req: NextRequest) {
  if (!isSameOrigin(req)) return noStoreJson({ error: "Forbidden origin" }, 403);

  try {
    const session = await getServerSession(authOptions);
    const canonicalEmail = session?.user?.email?.trim().toLowerCase();
    if (!session || !canonicalEmail) return noStoreJson({ error: "Unauthorized" }, 401);

    const body = await req.json().catch(() => null);
    const expectedEmail = typeof body?.expected_email === "string"
      ? body.expected_email.trim().toLowerCase()
      : "";
    if (!expectedEmail || expectedEmail.length > 254 || expectedEmail !== canonicalEmail) {
      return noStoreJson({ error: "The login identity changed in another tab; please retry" }, 409);
    }
    const clinicId = typeof body?.clinic_id === "string" ? body.clinic_id.trim() : "";
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(clinicId)) {
      return noStoreJson({ error: "A valid clinic_id is required" }, 400);
    }

    const secret = process.env.NEXTAUTH_SECRET;
    if (!secret || secret.length < 32) {
      return noStoreJson({ error: "Authentication is not configured securely" }, 503);
    }

    const admin = getAdminClient();
    const [{ data: clinic, error: clinicError }, { data: owner, error: ownerError }, { data: staff, error: staffError }] = await Promise.all([
      admin.from("clinics").select("id").eq("id", clinicId).eq("is_active", true).eq("status", "active").maybeSingle(),
      admin.from("clinic_owners").select("clinic_id").eq("clinic_id", clinicId).eq("owner_email", canonicalEmail).maybeSingle(),
      admin.from("staff").select("clinic_id,status").eq("clinic_id", clinicId).eq("email", canonicalEmail).maybeSingle(),
    ]);

    if (clinicError || ownerError || staffError) {
      console.error("[ClinicSession] Membership verification failed", {
        clinicCode: clinicError?.code || null,
        ownerCode: ownerError?.code || null,
        staffCode: staffError?.code || null,
      });
      return noStoreJson({ error: "Unable to verify clinic membership" }, 503);
    }
    if (!clinic) return noStoreJson({ error: "Center is unavailable" }, 403);

    const activeStaff = Boolean(staff && !INACTIVE_STAFF_STATUSES.has(String(staff.status || "").trim().toLowerCase()));
    if (!owner && !activeStaff) return noStoreJson({ error: "Access denied" }, 403);

    const parsedExpiry = Date.parse(session.expires || "");
    if (!Number.isFinite(parsedExpiry) || parsedExpiry <= Date.now()) {
      return noStoreJson({ error: "The login session has expired" }, 401);
    }
    const nextAuthExpiresAt = Math.floor(parsedExpiry / 1000);

    // A deterministic, non-human sign-in identity is created for each (canonical
    // account, clinic) pair. It is never used as the clinic's business email.
    const identityDigest = createHmac("sha256", secret)
      .update("prime-physio-clinic-identity:v1:")
      .update(canonicalEmail)
      .update(":")
      .update(clinicId)
      .digest("hex");
    const shadowEmail = `clinic-${identityDigest.slice(0, 48)}@shadow.primephysio.app`;
    const shadowPassword = createHmac("sha256", secret)
      .update("prime-physio-clinic-password:v1:")
      .update(canonicalEmail)
      .update(":")
      .update(clinicId)
      .digest("hex");

    const expectedMetadata = {
      auth_source: "clinic-scoped-shadow",
      canonical_email: canonicalEmail,
      clinic_id: clinicId,
      nextauth_expires_at: nextAuthExpiresAt,
    };

    const { data: identityMap, error: identityMapError } = await admin
      .from("clinic_auth_identities")
      .select("shadow_user_id,shadow_email")
      .eq("clinic_id", clinicId)
      .eq("canonical_email", canonicalEmail)
      .maybeSingle();
    if (identityMapError) throw identityMapError;

    const resolvedShadowEmail = identityMap?.shadow_email || shadowEmail;

    let shadowUser: SupabaseAuthUser | null = null;
    if (identityMap?.shadow_user_id) {
      const { data, error } = await admin.auth.admin.getUserById(identityMap.shadow_user_id);
      if (error) throw error;
      shadowUser = data.user;
    }
    if (!shadowUser) shadowUser = await findAuthUserByEmail(admin, resolvedShadowEmail);
    if (!shadowUser) {
      const { data, error } = await admin.auth.admin.createUser({
        email: resolvedShadowEmail,
        password: shadowPassword,
        email_confirm: true,
        app_metadata: expectedMetadata,
        user_metadata: { identity_kind: "clinic_session" },
      });
      if (error) {
        // Another request may have created the same deterministic identity.
        shadowUser = await findAuthUserByEmail(admin, resolvedShadowEmail);
        if (!shadowUser) throw error;
      } else {
        shadowUser = data.user;
      }
    }

    if (identityMap?.shadow_user_id && identityMap.shadow_user_id !== shadowUser.id) {
      return noStoreJson({ error: "Clinic identity mapping mismatch" }, 409);
    }

    if (!identityMap) {
      const { error: mapInsertError } = await admin
        .from("clinic_auth_identities")
        .insert({
          clinic_id: clinicId,
          canonical_email: canonicalEmail,
          shadow_email: resolvedShadowEmail,
          shadow_user_id: shadowUser.id,
        });
      if (mapInsertError) {
        // A concurrent exchange may have inserted the same mapping. Accept it
        // only when it resolves to this exact Auth user.
        const { data: concurrentMap, error: concurrentMapError } = await admin
          .from("clinic_auth_identities")
          .select("shadow_user_id")
          .eq("clinic_id", clinicId)
          .eq("canonical_email", canonicalEmail)
          .maybeSingle();
        if (concurrentMapError || concurrentMap?.shadow_user_id !== shadowUser.id) {
          throw mapInsertError;
        }
      }
    } else if (!identityMap.shadow_user_id) {
      const { error: mapUpdateError } = await admin
        .from("clinic_auth_identities")
        .update({ shadow_user_id: shadowUser.id })
        .eq("clinic_id", clinicId)
        .eq("canonical_email", canonicalEmail)
        .is("shadow_user_id", null);
      if (mapUpdateError) throw mapUpdateError;
    }

    const existingMetadata = shadowUser.app_metadata || {};
    if (
      existingMetadata.auth_source !== "clinic-scoped-shadow" ||
      existingMetadata.canonical_email !== canonicalEmail ||
      existingMetadata.clinic_id !== clinicId
    ) {
      return noStoreJson({ error: "Clinic identity metadata mismatch" }, 409);
    }

    const { error: updateError } = await admin.auth.admin.updateUserById(shadowUser.id, {
      email: resolvedShadowEmail,
      email_confirm: true,
      password: shadowPassword,
      app_metadata: { ...existingMetadata, ...expectedMetadata },
    });
    if (updateError) throw updateError;

    const { data: authResult, error: signInError } = await admin.auth.signInWithPassword({
      email: resolvedShadowEmail,
      password: shadowPassword,
    });
    if (signInError || !authResult.session || !authResult.user) {
      console.error("[ClinicSession] Scoped sign-in failed", { code: signInError?.code || null });
      return noStoreJson({ error: "Failed to establish clinic session" }, 503);
    }

    return noStoreJson({
      session: authResult.session,
      clinic_id: clinicId,
      canonical_email: canonicalEmail,
    });
  } catch (error) {
    console.error("[ClinicSession] Provisioning failed:", error);
    return noStoreJson({ error: "Failed to establish clinic session" }, 503);
  }
}
