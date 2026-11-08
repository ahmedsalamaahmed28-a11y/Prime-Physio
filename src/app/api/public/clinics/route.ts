import { NextRequest, NextResponse } from "next/server";
import { getAdminClient } from "@/lib/supabase-admin";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(request: NextRequest) {
  const query = (request.nextUrl.searchParams.get("q") || "").trim().slice(0, 80);
  if (query.length < 2) return NextResponse.json({ clinics: [] }, { headers: { "Cache-Control": "no-store" } });

  try {
    const admin = getAdminClient();
    const pattern = query.replace(/[,%()_]/g, " ").replace(/\s+/g, " ").trim();
    const { data, error } = await admin
      .from("clinics")
      .select("id, name, name_en, slug, city, logo_url")
      .eq("is_active", true)
      .eq("status", "active")
      .not("slug", "is", null)
      .or(`name.ilike.%${pattern}%,name_en.ilike.%${pattern}%,city.ilike.%${pattern}%`)
      .order("name", { ascending: true })
      .limit(8);
    if (error) throw error;
    return NextResponse.json({ clinics: data || [] }, { headers: { "Cache-Control": "no-store, private" } });
  } catch (error) {
    console.error("Public clinic search failed:", error);
    return NextResponse.json({ error: "Clinic search is temporarily unavailable" }, { status: 503, headers: { "Cache-Control": "no-store" } });
  }
}
