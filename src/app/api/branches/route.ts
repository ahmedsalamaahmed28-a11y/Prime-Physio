import { NextRequest, NextResponse } from "next/server";
import { getAdminClient } from "@/lib/supabase-admin";
import { requireRole } from "../utils/auth";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(req: NextRequest) {
  try {
    const user = await requireRole(req, ["admin", "doctor", "receptionist"]);
    const clinicId = new URL(req.url).searchParams.get("clinicId");

    if (!clinicId || !user.clinicId || clinicId !== user.clinicId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403, headers: { "Cache-Control": "no-store, private" } });
    }

    const admin = getAdminClient();
    const { data: branches, error } = await admin
      .from("branches")
      .select("id, short_name, full_name, slug, logo_url")
      .eq("clinic_id", user.clinicId)
      .order("created_at", { ascending: true });

    if (error) {
      console.error("[Branches GET] Query failed:", error);
      return NextResponse.json({ error: "Unable to load branches" }, { status: 500 });
    }

    return NextResponse.json({ branches: branches || [] }, {
      headers: { "Cache-Control": "no-store, private" },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    const status = /unauthorized/i.test(message) ? 401 : 403;
    return NextResponse.json({ error: status === 401 ? "Unauthorized" : "Forbidden" }, { status });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireRole(req, ["admin"]);
    const body = await req.json().catch(() => null);
    const clinicId = typeof body?.clinicId === "string" ? body.clinicId : "";
    const shortName = typeof body?.shortName === "string" ? body.shortName.trim() : "";
    const fullName = typeof body?.fullName === "string" ? body.fullName.trim() : "";
    const slug = typeof body?.slug === "string" ? body.slug.trim().toLowerCase() : "";
    const logoUrl = typeof body?.logoUrl === "string" ? body.logoUrl : null;

    if (!user.clinicId || clinicId !== user.clinicId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    if (!shortName || shortName.length > 120 || fullName.length > 200 || !/^[a-z0-9-]{3,50}$/.test(slug)) {
      return NextResponse.json({ error: "Invalid branch details" }, { status: 400 });
    }

    const admin = getAdminClient();
    const { data: branch, error } = await admin
      .from("branches")
      .insert({
        clinic_id: user.clinicId,
        short_name: shortName,
        full_name: fullName || null,
        slug,
        logo_url: logoUrl,
      })
      .select("id, short_name, full_name, slug, logo_url")
      .single();

    if (error) {
      const conflict = error.code === "23505";
      return NextResponse.json(
        { error: conflict ? "Slug already taken" : "Unable to create branch" },
        { status: conflict ? 409 : 500 }
      );
    }

    return NextResponse.json({ branch }, { status: 201, headers: { "Cache-Control": "no-store, private" } });
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    const status = /unauthorized/i.test(message) ? 401 : 403;
    return NextResponse.json({ error: status === 401 ? "Unauthorized" : "Forbidden" }, { status });
  }
}
