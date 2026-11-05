import { NextRequest, NextResponse } from "next/server";
import { getAdminClient } from "@/lib/supabase-admin";
import { requireRole } from "../../utils/auth";

export const dynamic = "force-dynamic";
export const revalidate = 0;

async function resolveOwnedBranch(req: NextRequest, id: string) {
  const user = await requireRole(req, ["admin"]);
  if (!user.clinicId) return { error: "Forbidden" as const, status: 403 as const };

  const admin = getAdminClient();
  const { data: branch, error } = await admin
    .from("branches")
    .select("id, clinic_id")
    .eq("id", id)
    .maybeSingle();

  if (error) throw error;
  if (!branch) return { error: "Not found" as const, status: 404 as const };
  if (branch.clinic_id !== user.clinicId) return { error: "Forbidden" as const, status: 403 as const };

  return { user, admin };
}

export async function PATCH(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const ownership = await resolveOwnedBranch(req, id);
    if ("error" in ownership) {
      return NextResponse.json({ error: ownership.error }, { status: ownership.status });
    }

    const body = await req.json().catch(() => null);
    if (!body || typeof body !== "object" || Array.isArray(body)) {
      return NextResponse.json({ error: "Invalid update payload" }, { status: 400 });
    }

    const updates: Record<string, unknown> = {};
    if (body.short_name !== undefined) {
      if (typeof body.short_name !== "string" || !body.short_name.trim() || body.short_name.trim().length > 120) {
        return NextResponse.json({ error: "Invalid short name" }, { status: 400 });
      }
      updates.short_name = body.short_name.trim();
    }
    if (body.full_name !== undefined) {
      if (typeof body.full_name !== "string" || body.full_name.length > 200) {
        return NextResponse.json({ error: "Invalid full name" }, { status: 400 });
      }
      updates.full_name = body.full_name.trim() || null;
    }
    if (body.slug !== undefined) {
      if (typeof body.slug !== "string" || !/^[a-z0-9-]{3,50}$/i.test(body.slug.trim())) {
        return NextResponse.json({ error: "Invalid slug" }, { status: 400 });
      }
      updates.slug = body.slug.trim().toLowerCase();
    }
    if (body.logo_url !== undefined) {
      if (body.logo_url !== null && (typeof body.logo_url !== "string" || body.logo_url.length > 2048)) {
        return NextResponse.json({ error: "Invalid logo URL" }, { status: 400 });
      }
      updates.logo_url = body.logo_url;
    }
    if (body.specializations !== undefined) {
      if (!Array.isArray(body.specializations) || body.specializations.length > 100) {
        return NextResponse.json({ error: "Invalid specializations" }, { status: 400 });
      }
      updates.specializations = body.specializations;
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: "No supported fields supplied" }, { status: 400 });
    }

    const { data: branch, error } = await ownership.admin
      .from("branches")
      .update(updates)
      .eq("id", id)
      .eq("clinic_id", ownership.user.clinicId)
      .select("id, short_name, full_name, slug, logo_url")
      .single();

    if (error) {
      const conflict = error.code === "23505";
      return NextResponse.json(
        { error: conflict ? "Slug already taken" : "Unable to update branch" },
        { status: conflict ? 409 : 500 }
      );
    }

    return NextResponse.json({ branch }, { headers: { "Cache-Control": "no-store, private" } });
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    const status = /unauthorized/i.test(message) ? 401 : 500;
    console.error("[Branches PATCH] Error:", error);
    return NextResponse.json({ error: status === 401 ? "Unauthorized" : "Unable to update branch" }, { status });
  }
}

export async function DELETE(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const ownership = await resolveOwnedBranch(req, id);
    if ("error" in ownership) {
      return NextResponse.json({ error: ownership.error }, { status: ownership.status });
    }

    const { error } = await ownership.admin
      .from("branches")
      .delete()
      .eq("id", id)
      .eq("clinic_id", ownership.user.clinicId);

    if (error) {
      console.error("[Branches DELETE] Delete failed:", error);
      return NextResponse.json({ error: "Unable to delete branch" }, { status: 500 });
    }

    return NextResponse.json({ success: true }, { headers: { "Cache-Control": "no-store, private" } });
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    const status = /unauthorized/i.test(message) ? 401 : 500;
    console.error("[Branches DELETE] Error:", error);
    return NextResponse.json({ error: status === 401 ? "Unauthorized" : "Unable to delete branch" }, { status });
  }
}
