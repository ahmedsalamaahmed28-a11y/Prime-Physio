import { NextRequest, NextResponse } from "next/server";
import { getAdminClient } from "@/lib/supabase-admin";
import { requireAuthOnly } from "../../utils/auth";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(req: NextRequest) {
  try {
    const session = await requireAuthOnly(req);
    const email = session.email.toLowerCase().trim();
    const admin = getAdminClient();

    const { data: ownerships, error: ownershipError } = await admin
      .from("clinic_owners")
      .select("clinic_id, created_at")
      .eq("owner_email", email)
      .order("created_at", { ascending: true });

    if (ownershipError) throw ownershipError;
    const clinicIds = [...new Set((ownerships || []).map((item) => item.clinic_id).filter(Boolean))];

    if (clinicIds.length === 0) {
      return NextResponse.json({ centers: [] }, { headers: { "Cache-Control": "no-store, private" } });
    }

    const [{ data: clinics, error: clinicsError }, { data: branches, error: branchesError }, { data: subscriptions, error: subscriptionsError }] = await Promise.all([
      admin.from("clinics").select("id, name, slug, status, created_at").in("id", clinicIds),
      admin.from("branches").select("id, clinic_id, short_name, full_name, slug, logo_url, status").in("clinic_id", clinicIds),
      admin.from("subscriptions").select("clinic_id, plan_name, status, end_date, created_at").in("clinic_id", clinicIds).order("created_at", { ascending: false }),
    ]);

    if (clinicsError || branchesError || subscriptionsError) {
      throw clinicsError || branchesError || subscriptionsError;
    }

    const centers = (clinics || []).map((clinic) => {
      const branch = (branches || []).find((item) => item.clinic_id === clinic.id) || null;
      const subscription = (subscriptions || []).find((item) => item.clinic_id === clinic.id) || null;
      return {
        id: clinic.id,
        name: clinic.name,
        slug: clinic.slug,
        loginUrl: clinic.slug ? `/clinic/${clinic.slug}` : null,
        status: clinic.status,
        createdAt: clinic.created_at,
        logoUrl: branch?.logo_url || null,
        planName: subscription?.plan_name || null,
        subscriptionStatus: subscription?.status || "pending",
        subscriptionEndDate: subscription?.end_date || null,
      };
    });

    return NextResponse.json({ centers }, { headers: { "Cache-Control": "no-store, private" } });
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (/unauthorized/i.test(message)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    console.error("[CenterManagement] Center list failed:", error);
    return NextResponse.json({ error: "تعذر تحميل المراكز حاليًا." }, { status: 500 });
  }
}
