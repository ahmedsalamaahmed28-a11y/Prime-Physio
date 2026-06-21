import { NextRequest, NextResponse } from "next/server";
import { getAdminClient } from "@/lib/supabase";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const clinicId = searchParams.get("clinic_id");

  if (!clinicId) {
    return NextResponse.json({ error: "clinic_id is required" }, { status: 400 });
  }

  const admin = getAdminClient();
  const { data, error } = await admin
    .from("branches")
    .select("*")
    .eq("clinic_id", clinicId)
    .order("created_at", { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ branches: data || [] });
}

export async function POST(req: NextRequest) {
  try {
    const { clinic_id, short_name, full_name, slug, logo_url } = await req.json();

    if (!clinic_id || !short_name || !full_name || !slug) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const admin = getAdminClient();

    // Check plan limit for branches
    const { data: subs } = await admin
      .from("subscriptions")
      .select("plan_name")
      .eq("clinic_id", clinic_id)
      .eq("status", "active")
      .order("created_at", { ascending: false })
      .limit(1);
    const planName = (subs && subs[0]?.plan_name) || "basic";
    const maxBranches = planName === "gold" ? 2 : 1;

    const { count } = await admin
      .from("branches")
      .select("*", { count: "exact", head: true })
      .eq("clinic_id", clinic_id);

    if (count !== null && count >= maxBranches) {
      return NextResponse.json({
        error: `Plan limit reached. Max ${maxBranches} centers allowed on ${planName} plan.`,
      }, { status: 403 });
    }

    // Check slug uniqueness within clinic
    const { data: existing } = await admin
      .from("branches")
      .select("id")
      .eq("clinic_id", clinic_id)
      .eq("slug", slug)
      .maybeSingle();

    if (existing) {
      return NextResponse.json({ error: "Slug already exists in this clinic" }, { status: 400 });
    }

    const { data, error } = await admin
      .from("branches")
      .insert({ clinic_id, short_name, full_name, slug: slug.toLowerCase().replace(/[^a-z0-9-]/g, ""), logo_url })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ branch: data });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
