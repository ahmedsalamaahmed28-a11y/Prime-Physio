import { NextResponse } from "next/server";
import { getAdminClient } from "@/lib/supabase-admin";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  try {
    const admin = getAdminClient();
    const { data: activeClinics, error: clinicsError } = await admin
      .from("clinics")
      .select("id")
      .eq("is_active", true)
      .eq("status", "active");

    if (clinicsError) throw clinicsError;
    const clinicIds = (activeClinics || []).map((clinic) => clinic.id);
    if (!clinicIds.length) {
      return NextResponse.json({ branches: [] }, { headers: { "Cache-Control": "no-store, private" } });
    }

    const { data: branches, error } = await admin
      .from("branches")
      .select("id, short_name, full_name, slug, logo_url")
      .in("clinic_id", clinicIds)
      .eq("status", "active")
      .order("created_at", { ascending: false })
      .limit(200);

    if (error) throw error;
    return NextResponse.json({ branches: branches || [] }, { headers: { "Cache-Control": "no-store, private" } });
  } catch (error) {
    console.error("[PublicBranches] Lookup failed:", error);
    return NextResponse.json(
      { error: "Unable to load active branches" },
      { status: 503, headers: { "Cache-Control": "no-store, private" } }
    );
  }
}
