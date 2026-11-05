import { NextRequest, NextResponse } from "next/server";
import { getAdminClient } from "@/lib/supabase";
import { requireRole } from "@/app/api/utils/auth";

export async function GET(req: NextRequest) {
  try {
    const clinicId = new URL(req.url).searchParams.get("clinicId");
    if (!clinicId) return NextResponse.json({ error: "Clinic ID is required" }, { status: 400 });
    const admin = getAdminClient();
    const { data: branches, error } = await admin.from("branches")
      .select("id, short_name, full_name, slug, logo_url").eq("clinic_id", clinicId)
      .order("created_at", { ascending: true });
    if (error) return NextResponse.json({ error: "Unable to load branches" }, { status: 500 });
    return NextResponse.json({ branches: branches || [] });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireRole(req, ["admin"]);
    const { clinicId, shortName, fullName, slug, logoUrl } = await req.json();
    if (!clinicId || !shortName || !fullName || !slug) {
      return NextResponse.json({ error: "Clinic ID, short name, full name, and slug are required" }, { status: 400 });
    }
    if (clinicId !== user.clinicId) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    const admin = getAdminClient();
    const { data: existingBranch } = await admin.from("branches").select("id")
      .eq("clinic_id", user.clinicId).eq("slug", slug).maybeSingle();
    if (existingBranch) return NextResponse.json({ error: "A branch with this slug already exists for this clinic" }, { status: 409 });
    const { data: branch, error } = await admin.from("branches").insert({
      clinic_id: user.clinicId, short_name: shortName, full_name: fullName, slug, logo_url: logoUrl || null,
    }).select("id, short_name, full_name, slug, logo_url").single();
    if (error) return NextResponse.json({ error: "Unable to create branch" }, { status: 500 });
    return NextResponse.json({ branch }, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "";
    const status = message === "Unauthorized" ? 401 : /forbidden|insufficient|membership/i.test(message) ? 403 : 500;
    return NextResponse.json({ error: status === 401 ? "Unauthorized" : status === 403 ? "Forbidden" : "Internal server error" }, { status });
  }
}
