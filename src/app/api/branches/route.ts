import { NextRequest, NextResponse } from "next/server";
import { getAdminClient } from "@/lib/supabase";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const clinicId = searchParams.get("clinicId");

    if (!clinicId) {
      return NextResponse.json({ error: "Clinic ID is required" }, { status: 400 });
    }

    const admin = getAdminClient();

    const { data: branches, error } = await admin
      .from("branches")
      .select("id, short_name, full_name, slug, logo_url")
      .eq("clinic_id", clinicId)
      .order("created_at", { ascending: true });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ branches: branches });
  } catch (err) {
    console.error("[Branches GET] Error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const { clinicId, shortName, fullName, slug, logoUrl } = await req.json();

    if (!clinicId || !shortName || !fullName || !slug) {
      return NextResponse.json(
        { error: "Clinic ID, short name, full name, and slug are required" },
        { status: 400 }
      );
    }

    const admin = getAdminClient();

    // Check if slug already exists for this clinic
    const { data: existingBranch } = await admin
      .from("branches")
      .select("id")
      .eq("clinic_id", clinicId)
      .eq("slug", slug)
      .single();

    if (existingBranch) {
      return NextResponse.json(
        { error: "A branch with this slug already exists for this clinic" },
        { status: 400 }
      );
    }

    const { data: branch, error } = await admin
      .from("branches")
      .insert({
        clinic_id: clinicId,
        short_name: shortName,
        full_name: fullName,
        slug,
        logo_url: logoUrl || null,
      })
      .select("id, short_name, full_name, slug, logo_url")
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ branch }, { status: 201 });
  } catch (err) {
    console.error("[Branches POST] Error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal server error" },
      { status: 500 }
    );
  }
}
