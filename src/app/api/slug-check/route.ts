import { NextRequest, NextResponse } from "next/server";
import { getAdminClient } from "@/lib/supabase";

export async function GET(req: NextRequest) {
  const slug = req.nextUrl.searchParams.get("slug");
  if (!slug) {
    return NextResponse.json({ error: "Slug is required" }, { status: 400 });
  }

  try {
    const admin = getAdminClient();
    const { data, error } = await admin.rpc("is_slug_available", { check_slug: slug.toLowerCase().trim() });

    if (error) {
      return NextResponse.json({ available: true });
    }

    return NextResponse.json({ available: data });
  } catch {
    return NextResponse.json({ available: true });
  }
}
