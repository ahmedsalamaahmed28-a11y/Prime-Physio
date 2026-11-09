import { NextRequest, NextResponse } from "next/server";
import { getAdminClient } from "@/lib/supabase-admin";
import { requireAuth } from "../../utils/auth";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(req: NextRequest) {
  try {
    const sessionUser = await requireAuth(req);
    if (!sessionUser?.email) return NextResponse.json({ user: null, subscription: null });

    const admin = getAdminClient();
    const email = sessionUser.email.toLowerCase().trim();
    let clinicId = sessionUser.clinicId || null;

    if (!clinicId) {
      const { data: ownedCenters, error: ownerError } = await admin
        .from("clinic_owners")
        .select("clinic_id")
        .eq("owner_email", email);
      if (ownerError) throw ownerError;
      const ownerClinicIds = [...new Set((ownedCenters || []).map((row) => row.clinic_id).filter(Boolean))];
      if (ownerClinicIds.length > 0) {
        const { data: account } = await admin.from("auth_accounts").select("name").eq("email", email).maybeSingle();
        return NextResponse.json({
          user: { email, name: account?.name || email.split("@")[0] },
          subscription: null,
          hasClinic: true,
          isCenterManager: true,
          centerCount: ownerClinicIds.length,
        }, { headers: { "Cache-Control": "no-store, private" } });
      }

      const { data: staffRows, error: staffError } = await admin
        .from("staff")
        .select("clinic_id")
        .eq("email", email)
        .not("clinic_id", "is", null)
        .neq("status", "محذوف")
        .neq("status", "deleted")
        .neq("status", "inactive")
        .neq("status", "غير نشط");
      if (staffError) throw staffError;
      const staffClinicIds = [...new Set((staffRows || []).map((row) => row.clinic_id).filter(Boolean))];
      if (staffClinicIds.length !== 1) {
        return NextResponse.json({
          user: { email, name: email.split("@")[0] },
          subscription: null,
          hasClinic: staffClinicIds.length > 1,
          isCenterManager: staffClinicIds.length > 1,
          centerCount: staffClinicIds.length,
        }, { headers: { "Cache-Control": "no-store, private" } });
      }
      clinicId = staffClinicIds[0];
    }

    const { data: staff, error: staffLookupError } = await admin
      .from("staff")
      .select("clinic_id, role, name")
      .eq("email", email)
      .eq("clinic_id", clinicId)
      .maybeSingle();

    const { data: ownerMembership, error: membershipError } = await admin
      .from("clinic_owners")
      .select("clinic_id")
      .eq("owner_email", email)
      .eq("clinic_id", clinicId)
      .maybeSingle();

    if (staffLookupError || membershipError) throw staffLookupError || membershipError;
    if (!staff?.clinic_id && !ownerMembership) {
      return NextResponse.json({
        user: { email, name: email.split("@")[0] },
        subscription: null,
        hasClinic: false,
      }, { headers: { "Cache-Control": "no-store, private" } });
    }

    const [{ data: subscription }, { data: branches }, { data: clinic }] = await Promise.all([
      admin.from("subscriptions").select("plan_name, status, start_date, end_date").eq("clinic_id", clinicId).order("created_at", { ascending: false }).limit(1).maybeSingle(),
      admin.from("branches").select("id, short_name, full_name, slug, logo_url").eq("clinic_id", clinicId),
      admin.from("clinics").select("name").eq("id", clinicId).maybeSingle(),
    ]);

    return NextResponse.json({
      user: { email, name: staff?.name || clinic?.name || email.split("@")[0] },
      subscription: subscription || null,
      clinicId,
      branches: branches || [],
      hasClinic: true,
      role: ownerMembership ? "admin" : staff?.role,
    }, { headers: { "Cache-Control": "no-store, private" } });
  } catch (error) {
    console.error("[AuthMe] Failed to resolve current tenant:", error);
    return NextResponse.json({ user: null, subscription: null, hasClinic: false }, { status: 503, headers: { "Cache-Control": "no-store, private" } });
  }
}
