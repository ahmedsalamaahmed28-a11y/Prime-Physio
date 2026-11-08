import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/pages/api/auth/[...nextauth]";
import { getAdminClient } from "@/lib/supabase-admin";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function mapStaffRoleToRoleKey(role: string): string {
  const lower = role?.toLowerCase().trim();
  if (lower === "مدير العياده" || lower === "مدير العيادة" || lower === "admin" || lower === "clinic_admin") return "admin";
  if (lower === "استشاري" || lower === "أخصائي" || lower === "ممارس" || lower === "doctor") return "doctor";
  if (lower === "موظف استقبال" || lower === "receptionist") return "receptionist";
  if (lower === "platform_admin" || lower === "مدير المنصة") return "platform_admin";
  if (lower === "استشاري علاج طبيعي" || lower === "أخصائي علاج طبيعي" || lower === "ممارس علاج طبيعي" || lower === "doctor") return "doctor";
  return "unknown";
}

function getArabicRoleLabel(roleKey: string) {
  if (roleKey === "platform_admin") return "مدير المنصة";
  if (roleKey === "admin") return "مدير العيادة";
  if (roleKey === "doctor") return "طبيب معالج";
  return "موظف استقبال";
}

function getEnglishRoleLabel(roleKey: string) {
  if (roleKey === "platform_admin") return "Platform Admin";
  if (roleKey === "admin") return "Clinic Admin";
  if (roleKey === "doctor") return "Therapist";
  return "Receptionist";
}

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ clinicId: null, role: null }, { headers: { "Cache-Control": "no-store, private" } });
    }

    const { searchParams } = new URL(req.url);
    const preferredClinicId = searchParams.get("preferred_clinic_id");
    // A clinic ID attached to the signed NextAuth session is authoritative.
    // A browser-supplied preferred_clinic_id may not switch a scoped session.
    const sessionClinicId = typeof (session.user as any).clinicId === "string"
      ? (session.user as any).clinicId as string
      : null;

    if (sessionClinicId && preferredClinicId && preferredClinicId !== sessionClinicId) {
      return NextResponse.json({ clinicId: null, role: null, error: "Access denied" }, {
        status: 403,
        headers: { "Cache-Control": "no-store, private" },
      });
    }

    const admin = getAdminClient();

    const { data: pa, error: platformAdminError } = await admin
      .from("platform_admins")
      .select("id")
      .eq("email", session.user.email.toLowerCase().trim())
      .limit(1)
      .maybeSingle();

    if (platformAdminError) {
      return NextResponse.json({ error: "Unable to verify account role" }, { status: 503, headers: { "Cache-Control": "no-store, private" } });
    }

    if (pa) {
      return NextResponse.json({
        clinicId: null,
        role: "مدير المنصة",
        roleKey: "platform_admin",
        roleAr: "مدير المنصة",
        roleEn: "Platform Admin",
        shortName: null,
        logoUrl: null,
      });
    }

    let staffQuery = admin
      .from("staff")
      .select("clinic_id, role")
      .eq("email", session.user.email.toLowerCase().trim());

    if (sessionClinicId) staffQuery = staffQuery.eq("clinic_id", sessionClinicId);

    const { data: staff, error } = await staffQuery
      .limit(1)
      .maybeSingle();

    if (error) {
      return NextResponse.json({ error: "Unable to load clinic membership" }, { status: 503, headers: { "Cache-Control": "no-store, private" } });
    }

    // A confirmed missing membership or clinic is an onboarding state; a query error is not.
    if (!staff?.clinic_id) {
      return NextResponse.json({ clinicId: null, role: null }, { headers: { "Cache-Control": "no-store, private" } });
    }

    const targetClinicId = sessionClinicId || preferredClinicId || staff.clinic_id;

    if (preferredClinicId) {
      const { data: staffCheck, error: staffCheckError } = await admin
        .from("staff")
        .select("clinic_id")
        .eq("email", session.user.email.toLowerCase().trim())
        .eq("clinic_id", preferredClinicId)
        .limit(1)
        .maybeSingle();

      if (staffCheckError) {
        return NextResponse.json({ error: "Unable to verify clinic access" }, { status: 503, headers: { "Cache-Control": "no-store, private" } });
      }

      if (!staffCheck) {
        return NextResponse.json({ clinicId: null, role: null, error: "Access denied" }, { status: 403, headers: { "Cache-Control": "no-store, private" } });
      }
    }

    const { data: branch } = await admin
      .from("branches")
      .select("short_name, logo_url")
      .eq("clinic_id", targetClinicId)
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();

    const roleKey = mapStaffRoleToRoleKey(staff.role);
    if (roleKey === "unknown") {
      return NextResponse.json({ error: "Unrecognized staff role" }, { status: 403, headers: { "Cache-Control": "no-store, private" } });
    }
    return NextResponse.json({
      clinicId: targetClinicId,
      role: staff.role,
      roleKey,
      roleAr: getArabicRoleLabel(roleKey),
      roleEn: getEnglishRoleLabel(roleKey),
      shortName: branch?.short_name || null,
      logoUrl: branch?.logo_url || null,
    }, { headers: { "Cache-Control": "no-store, private" } });
  } catch {
    return NextResponse.json({ error: "Clinic membership lookup failed" }, { status: 503, headers: { "Cache-Control": "no-store, private" } });
  }
}

