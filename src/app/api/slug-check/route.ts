import { NextRequest, NextResponse } from "next/server";
import { getAdminClient } from "@/lib/supabase-admin";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(req: NextRequest) {
  const slug = (req.nextUrl.searchParams.get("slug") || "").trim().toLowerCase();
  if (!/^[a-z0-9-]{3,50}$/.test(slug)) {
    return NextResponse.json({ error: "Invalid slug" }, { status: 400 });
  }

  try {
    const { data, error } = await getAdminClient().rpc("is_slug_available", { check_slug: slug });
    if (error) {
      console.error("[SlugCheck] Availability lookup failed:", error);
      return NextResponse.json({ error: "Unable to verify slug availability" }, { status: 503 });
    }
    return NextResponse.json({ available: data === true }, {
      headers: { "Cache-Control": "no-store, private" },
    });
  } catch {
    return NextResponse.json({ error: "Unable to verify slug availability" }, { status: 503 });
  }
}
