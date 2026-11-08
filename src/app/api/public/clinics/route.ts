import { NextRequest, NextResponse } from "next/server";
import { getAdminClient } from "@/lib/supabase-admin";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(request: NextRequest) {
  const slug = (request.nextUrl.searchParams.get("slug") || "").trim().toLowerCase();
  const query = (request.nextUrl.searchParams.get("q") || "").trim().slice(0, 80);

  if (slug && (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) || slug.length > 80)) {
    return NextResponse.json({ error: "Invalid clinic slug" }, { status: 400, headers: { "Cache-Control": "no-store" } });
  }
  if (!slug && query.length < 2) {
    return NextResponse.json({ clinics: [] }, { headers: { "Cache-Control": "no-store" } });
  }

  try {
    const admin = getAdminClient();
    const baseQuery = admin
      .from("clinics")
      .select("id, name, name_en, slug, city, logo_url")
      .eq("is_active", true)
      .eq("status", "active")
      .not("slug", "is", null);

    if (slug) {
      const { data, error } = await baseQuery.eq("slug", slug).maybeSingle();
      if (error) throw error;
      if (!data) return NextResponse.json({ error: "Clinic not found" }, { status: 404, headers: { "Cache-Control": "no-store" } });
      return NextResponse.json({ clinic: data }, { headers: { "Cache-Control": "no-store, private" } });
    }

    const pattern = query.replace(/[,%()_]/g, " ").replace(/\s+/g, " ").trim();
    const { data, error } = await baseQuery
      .or(`name.ilike.%${pattern}%,name_en.ilike.%${pattern}%,city.ilike.%${pattern}%`)
      .order("name", { ascending: true })
      .limit(8);
    if (error) throw error;
    return NextResponse.json({ clinics: data || [] }, { headers: { "Cache-Control": "no-store, private" } });
  } catch (error) {
    console.error("Public clinic lookup failed:", error);
    return NextResponse.json({ error: "Clinic lookup is temporarily unavailable" }, { status: 503, headers: { "Cache-Control": "no-store" } });
  }
}
