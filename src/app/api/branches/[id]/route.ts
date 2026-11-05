import { NextRequest, NextResponse } from "next/server";
import { getAdminClient } from "@/lib/supabase";
import { requireRole } from "@/app/api/utils/auth";

export async function PATCH(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireRole(req, ["admin"]);
    const { id } = await context.params;
    const body = await req.json();
    const updates: { short_name?: string; full_name?: string; slug?: string; logo_url?: string | null } = {};
    if (typeof body?.short_name === "string" && body.short_name.trim().length > 0 && body.short_name.length <= 120) updates.short_name = body.short_name.trim();
    if (typeof body?.full_name === "string" && body.full_name.trim().length > 0 && body.full_name.length <= 200) updates.full_name = body.full_name.trim();
    if (typeof body?.slug === "string" && /^[a-z0-9-]{3,50}$/.test(body.slug.trim().toLowerCase())) updates.slug = body.slug.trim().toLowerCase();
    if (body?.logo_url === null || typeof body?.logo_url === "string") updates.logo_url = body.logo_url;
    if (Object.keys(updates).length === 0) return NextResponse.json({ error: "No valid fields supplied" }, { status: 400 });

    const admin = getAdminClient();
    const { data: branch, error: lookupError } = await admin.from("branches").select("clinic_id").eq("id", id).maybeSingle();
    if (lookupError) return NextResponse.json({ error: "Unable to verify branch" }, { status: 500 });
    if (!branch) return NextResponse.json({ error: "Branch not found" }, { status: 404 });
    if (branch.clinic_id !== user.clinicId) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const { data, error } = await admin.from("branches").update(updates).eq("id", id).eq("clinic_id", user.clinicId)
      .select("id, short_name, full_name, slug, logo_url").single();
    if (error) return NextResponse.json({ error: "Unable to update branch" }, { status: 500 });
    return NextResponse.json({ branch: data });
  } catch (err) {
    const message = err instanceof Error ? err.message : "";
    const status = message === "Unauthorized" ? 401 : /forbidden|insufficient|membership/i.test(message) ? 403 : 500;
    return NextResponse.json({ error: status === 401 ? "Unauthorized" : status === 403 ? "Forbidden" : "Internal server error" }, { status });
  }
}

export async function DELETE(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireRole(req, ["admin"]);
    const { id } = await context.params;
    const admin = getAdminClient();
    const { data: branch, error: lookupError } = await admin.from("branches").select("clinic_id").eq("id", id).maybeSingle();
    if (lookupError) return NextResponse.json({ error: "Unable to verify branch" }, { status: 500 });
    if (!branch) return NextResponse.json({ error: "Branch not found" }, { status: 404 });
    if (branch.clinic_id !== user.clinicId) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    const { error } = await admin.from("branches").delete().eq("id", id).eq("clinic_id", user.clinicId);
    if (error) return NextResponse.json({ error: "Unable to delete branch" }, { status: 500 });
    return NextResponse.json({ success: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "";
    const status = message === "Unauthorized" ? 401 : /forbidden|insufficient|membership/i.test(message) ? 403 : 500;
    return NextResponse.json({ error: status === 401 ? "Unauthorized" : status === 403 ? "Forbidden" : "Internal server error" }, { status });
  }
}
