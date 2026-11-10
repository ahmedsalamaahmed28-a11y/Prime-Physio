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
  const { data: branch, error } = await admin
    .from("branches")
    .select("short_name, logo_url")
    .eq("clinic_id", clinicId)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return { shortName: branch?.short_name || null, logoUrl: branch?.logo_url || null };
}

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const email = session?.user?.email?.toLowerCase().trim();
    if (!email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers: { "Cache-Control": "no-store, private" } });
    }

    const preferredClinicId = new URL(req.url).searchParams.get("preferred_clinic_id");
    const admin = getAdminClient();

    const { data: platformAdmin, error: platformAdminError } = await admin
      .from("platform_admins")
      .select("id")
      .eq("email", email)
      .limit(1)
      .maybeSingle();

    if (platformAdminError) {
      return NextResponse.json({ error: "Unable to verify account role" }, { status: 503, headers: { "Cache-Control": "no-store, private" } });
    }

    if (platformAdmin) {
      return NextResponse.json({
        clinicId: null,
        role: "مدير المنصة",
        roleKey: "platform_admin",
        roleAr: "مدير المنصة",
        roleEn: "Platform Admin",
        shortName: null,
        logoUrl: null,
      }, { headers: { "Cache-Control": "no-store, private" } });
    }

    if (preferredClinicId) {
      const [{ data: ownerMembership, error: ownerError }, { data: staff, error: staffError }] = await Promise.all([
        admin.from("clinic_owners").select("clinic_id").eq("owner_email", email).eq("clinic_id", preferredClinicId).maybeSingle(),
        admin.from("staff").select("clinic_id, role, status").eq("email", email).eq("clinic_id", preferredClinicId).maybeSingle(),
      ]);

      if (ownerError || staffError) {
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
      return NextResponse.json({ error: "Unable to load center ownership" }, { status: 503, headers: { "Cache-Control": "no-store, private" } });
    }
    if ((ownedCenters || []).length > 0) {
      return NextResponse.json({
        clinicId: null,
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
        role: staff?.role || "",
        roleKey,
        ...labels,
        ...presentation,
      }, { headers: { "Cache-Control": "no-store, private" } });
    }

    if (clinicIds.length > 1) {
      return NextResponse.json({
        clinicId: null,
        role: "مدير المراكز",
        roleKey: "admin",
        roleAr: "مدير المراكز",
        roleEn: "Center Manager",
        shortName: null,
        logoUrl: null,
      }, { headers: { "Cache-Control": "no-store, private" } });
    }

    return NextResponse.json({ clinicId: null, role: null }, { headers: { "Cache-Control": "no-store, private" } });
  } catch (error) {
    console.error("[AuthEnrich] Membership lookup failed:", error);
    return NextResponse.json({ error: "Clinic membership lookup failed" }, { status: 503, headers: { "Cache-Control": "no-store, private" } });
  }
}
