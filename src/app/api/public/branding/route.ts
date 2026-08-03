import { NextResponse } from "next/server";
import { getAdminClient } from "@/lib/supabase";

export const revalidate = 0; // Ensure fresh data on every fetch, or set to 60 for edge caching

export async function GET() {
  try {
    const supabase = getAdminClient();
    
    const { data, error } = await supabase
      .from("platform_content")
      .select("content")
      .eq("key", "branding")
      .maybeSingle();
      
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    
    // Default fallback
    const branding = data?.content || {
      brandName: "PRIME PHYSIO",
      sidebarTitle: "Clinic Management"
    };

    return NextResponse.json({ branding });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
