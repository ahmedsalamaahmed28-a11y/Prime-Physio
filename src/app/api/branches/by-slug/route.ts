import { NextRequest, NextResponse } from "next/server";
import { getAdminClient } from "@/lib/supabase-admin";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const slug = searchParams.get("slug");

    if (!slug || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) || slug.length > 50) {
      return NextResponse.json({ error: "Slug is required" }, { status: 400 });
    }

    const admin = getAdminClient();
    const { data: branch, error } = await admin
      .from("branches")
      .select("id, short_name, full_name, slug, logo_url, clinic_id")
      .eq("slug", slug)
      .maybeSingle();

    if (error || !branch) {
      return NextResponse.json({ error: "Branch not found" }, { status: 404 });
    }

    const { data: clinic, error: clinicError } = await admin
      .from("clinics")
      .select("id")
      .eq("id", branch.clinic_id)
      .eq("is_active", true)
      .eq("status", "active")
      .maybeSingle();

    if (clinicError || !clinic) {
      return NextResponse.json({ error: "Center is unavailable" }, { status: 404 });
    }

    return NextResponse.json({ branch }, { headers: { "Cache-Control": "no-store" } });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal server error" },
      { status: 500 }
    );
  }
}
