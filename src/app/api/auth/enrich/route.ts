import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/pages/api/auth/[...nextauth]";
import { getAdminClient } from "@/lib/supabase-admin";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function mapStaffRoleToRoleKey(role: string): string {
  const lower = role?.toLowerCase().trim();
  if (["مدير العياده", "مدير العيادة", "admin", "clinic_admin"].includes(lower)) return "admin";
  if (["استشاري", "أخصائي", "ممارس", "doctor", "استشاري علاج طبيعي", "أخصائي علاج طبيعي", "ممارس علاج طبيعي"].includes(lower)) return "doctor";
  if (["موظف استقبال", "receptionist"].includes(lower)) return "receptionist";
  if (["platform_admin", "مدير المنصة"].includes(lower)) return "platform_admin";
  return "unknown";
}

function roleLabels(roleKey: string) {
  if (roleKey === "platform_admin") return { roleAr: "مدير المنصة", roleEn: "Platform Admin" };
  if (roleKey === "admin") return { roleAr: "مدير العيادة", roleEn: "Clinic Admin" };
  if (roleKey === "doctor") return { roleAr: "طبيب معالج", roleEn: "Therapist" };
  return { roleAr: "موظف استقبال", roleEn: "Receptionist" };
}

async function clinicPresentation(admin: ReturnType<typeof getAdminClient>, clinicId: string) {
  const [{ data: branch, error: branchError }, { data: clinic, error: clinicError }] = await Promise.all([
    admin
      .from("branches")
      .select("short_name, logo_url")
      .eq("clinic_id", clinicId)
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle(),
    admin
      .from("clinics")
      .select("slug")
      .eq("id", clinicId)
      .maybeSingle(),
  ]);
  if (branchError || clinicError) throw branchError || clinicError;
  return {
    shortName: branch?.short_name || null,
    logoUrl: branch?.logo_url || null,
    clinicSlug: clinic?.slug || null,
  };
}

export async function GET(req: NextRequest) {
  try {
    const admin = getAdminClient();
    const bearer = req.headers.get("authorization")?.match(/^Bearer\\s+(.+)$/i)?.[1]?.trim();
    let email: string | null = null;
    let scopedClinicId: string | null = null;

    if (bearer) {
      const { data, error } = await admin.auth.getUser(bearer);
      const metadata = data.user?.app_metadata || {};
      if (error || !data.user || metadata.auth_source !== "clinic-scoped-shadow") {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers: { "Cache-Control": "no-store, private" } });
      }
      email = typeof metadata.canonical_email === "string" ? metadata.canonical_email.trim().toLowerCase() : null;
      scopedClinicId = typeof metadata.clinic_id === "string" ? metadata.clinic_id : null;
      const expiresAt = Number(metadata.nextauth_expires_at || 0);
      if (
        !email ||
        !scopedClinicId ||
        !Number.isSafeInteger(expiresAt) ||
        expiresAt <= Math.floor(Date.now() / 1000)
      ) {
        return NextResponse.json({ error: "Invalid or expired clinic identity" }, { status: 401, headers: { "Cache-Control": "no-store, private" } });
      }
    } else {
      const session = await getServerSession(authOptions);
      email = session?.user?.email?.toLowerCase().trim() || null;
    }

    if (!email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers: { "Cache-Control": "no-store, private" } });
    }

    const requestedClinicId = new URL(req.url).searchParams.get("preferred_clinic_id");
    if (scopedClinicId && requestedClinicId && requestedClinicId !== scopedClinicId) {
      return NextResponse.json({ error: "Clinic scope mismatch" }, { status: 403, headers: { "Cache-Control": "no-store, private" } });
    }
    const preferredClinicId = scopedClinicId || requestedClinicId;
    let staffProfileQuery = admin.from("staff").select("name").eq("email", email).not("name", "is", null);
    if (scopedClinicId) staffProfileQuery = staffProfileQuery.eq("clinic_id", scopedClinicId);
    const [
      { data: profile, error: profileResultError },
      { data: accountProfile, error: accountProfileResultError },
    ] = await Promise.all([
      staffProfileQuery.limit(1).maybeSingle(),
      admin.from("auth_accounts").select("name").eq("email", email).maybeSingle(),
    ]);
    if (profileResultError || accountProfileResultError) {
      console.warn("[AuthEnrich] Optional profile lookup failed", {
        staffProfileCode: profileResultError?.code || null,
        accountProfileCode: accountProfileResultError?.code || null,
      });
    }
    const displayName =
      (typeof profile?.name === "string" && profile.name.trim()) ||
      (typeof accountProfile?.name === "string" && accountProfile.name.trim()) ||
      "";

    // Platform administration is granted only through the server-managed allowlist.
    // Platform administrators do not need to belong to a clinic.
    const { data: platformAdmin, error: platformAdminError } = await admin
      .from("platform_admins").select("email").eq("email", email).maybeSingle();
    if (platformAdminError) {
      console.error("[AuthEnrich] Platform-admin lookup failed", { code: platformAdminError.code });
      return NextResponse.json({ error: "Unable to verify platform permissions" }, { status: 503, headers: { "Cache-Control": "no-store, private" } });
    }
    if (platformAdmin && !scopedClinicId) {
      return NextResponse.json({
        clinicId: null, displayName, role: "platform_admin", roleKey: "platform_admin",
        roleAr: "مدير المنصة", roleEn: "Platform Admin",
        shortName: null, logoUrl: null, isPlatformAdmin: true,
      }, { headers: { "Cache-Control": "no-store, private" } });
    }

    if (preferredClinicId) {
      const { data: activeClinic, error: clinicError } = await admin
        .from("clinics")
        .select("id")
        .eq("id", preferredClinicId)
        .eq("is_active", true)
        .eq("status", "active")
        .maybeSingle();

      if (clinicError) {
        console.error("[AuthEnrich] Preferred-center status lookup failed", { code: clinicError.code, message: clinicError.message });
        return NextResponse.json({ error: "Unable to verify center status" }, { status: 503, headers: { "Cache-Control": "no-store, private" } });
      }
      if (!activeClinic) {
        return NextResponse.json({ clinicId: null, role: null, error: "Center is unavailable" }, { status: 403, headers: { "Cache-Control": "no-store, private" } });
      }

      const [{ data: ownerMembership, error: ownerError }, { data: staff, error: staffError }] = await Promise.all([
        admin.from("clinic_owners").select("clinic_id").eq("owner_email", email).eq("clinic_id", preferredClinicId).maybeSingle(),
        admin.from("staff").select("clinic_id, role, status").eq("email", email).eq("clinic_id", preferredClinicId).maybeSingle(),
      ]);

      if (ownerError || staffError) {
        console.error("[AuthEnrich] Preferred-center membership lookup failed", {
          ownerCode: ownerError?.code || null,
          ownerMessage: ownerError?.message || null,
          staffCode: staffError?.code || null,
          staffMessage: staffError?.message || null,
        });
        return NextResponse.json({ error: "Unable to verify clinic membership" }, { status: 503, headers: { "Cache-Control": "no-store, private" } });
      }
      if (!ownerMembership && (!staff || ["محذوف", "deleted", "inactive", "غير نشط"].includes(String(staff.status || "").toLowerCase()))) {
        return NextResponse.json({ clinicId: null, role: null, error: "Access denied" }, { status: 403, headers: { "Cache-Control": "no-store, private" } });
      }

      const roleKey = ownerMembership ? "admin" : mapStaffRoleToRoleKey(staff?.role || "");
      if (roleKey === "unknown") {
        return NextResponse.json({ error: "Unrecognized staff role" }, { status: 403, headers: { "Cache-Control": "no-store, private" } });
      }
      const labels = roleLabels(roleKey);
      const presentation = await clinicPresentation(admin, preferredClinicId);
      return NextResponse.json({
        clinicId: preferredClinicId,
        displayName,
        role: staff?.role || "admin",
        roleKey,
        ...labels,
        ...presentation,
      }, { headers: { "Cache-Control": "no-store, private" } });
    }

    // A manager without an active center stays in the central manager area.
    const { data: ownedCenters, error: ownershipError } = await admin
      .from("clinic_owners")
      .select("clinic_id")
      .eq("owner_email", email);
    if (ownershipError) {
      console.error("[AuthEnrich] Center ownership lookup failed", { code: ownershipError.code, message: ownershipError.message });
      return NextResponse.json({ error: "Unable to load center ownership" }, { status: 503, headers: { "Cache-Control": "no-store, private" } });
    }
    if ((ownedCenters || []).length > 0) {
      return NextResponse.json({
        clinicId: null,
        displayName,
        role: "مدير المراكز",
        roleKey: "admin",
        roleAr: "مدير المراكز",
        roleEn: "Center Manager",
        shortName: null,
        logoUrl: null,
      }, { headers: { "Cache-Control": "no-store, private" } });
    }

    const { data: staffRows, error: staffError } = await admin
      .from("staff")
      .select("clinic_id, role, status")
      .eq("email", email)
      .not("clinic_id", "is", null);

    if (staffError) {
      console.error("[AuthEnrich] Staff membership lookup failed", { code: staffError.code, message: staffError.message });
      return NextResponse.json({ error: "Unable to load clinic membership" }, { status: 503, headers: { "Cache-Control": "no-store, private" } });
    }

    const activeStaff = (staffRows || []).filter((row) => !["محذوف", "deleted", "inactive", "غير نشط"].includes(String(row.status || "").toLowerCase()));
    const clinicIds = [...new Set(activeStaff.map((row) => row.clinic_id).filter(Boolean))];
    if (clinicIds.length === 1) {
      const staff = activeStaff.find((row) => row.clinic_id === clinicIds[0]);
      const roleKey = mapStaffRoleToRoleKey(staff?.role || "");
      if (roleKey === "unknown") return NextResponse.json({ error: "Unrecognized staff role" }, { status: 403 });
      const labels = roleLabels(roleKey);
      const presentation = await clinicPresentation(admin, clinicIds[0]);
      return NextResponse.json({
        clinicId: clinicIds[0],
        displayName,
        role: staff?.role || "",
        roleKey,
        ...labels,
        ...presentation,
      }, { headers: { "Cache-Control": "no-store, private" } });
    }

    if (clinicIds.length > 1) {
      return NextResponse.json({
        clinicId: null,
        displayName,
        role: "مدير المراكز",
        roleKey: "admin",
        roleAr: "مدير المراكز",
        roleEn: "Center Manager",
        shortName: null,
        logoUrl: null,
      }, { headers: { "Cache-Control": "no-store, private" } });
    }

    console.info("[AuthEnrich] No clinic membership confirmed; onboarding required");
    return NextResponse.json({ clinicId: null, role: null, displayName }, { headers: { "Cache-Control": "no-store, private" } });
  } catch (error) {
    console.error("[AuthEnrich] Membership lookup failed:", error);
    return NextResponse.json({ error: "Clinic membership lookup failed" }, { status: 503, headers: { "Cache-Control": "no-store, private" } });
  }
}
