import { NextResponse, NextRequest } from "next/server";
import { getAdminClient } from "@/lib/supabase";
import { requireRole } from "@/app/api/utils/auth";

// GET /api/admin/content
// Fetch all platform content keys
export async function GET(req: NextRequest) {
  try {
    const supabase = getAdminClient();
    
    // Check if user is platform admin for CMS usage, but allow public read if needed.
    // Actually, we can just let anyone read the content as it's for the public landing page.
    
    const { data, error } = await supabase
      .from("platform_content")
      .select("*");
      
    if (error) throw error;
    
    // Convert array to object { hero: {...}, pricing: {...} }
    const contentMap: Record<string, any> = {};
    if (data) {
      data.forEach((row) => {
        contentMap[row.key] = row.content;
      });
    }

    return NextResponse.json({ content: contentMap });
  } catch (error: any) {
    console.error("Error fetching platform content:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// PATCH /api/admin/content
// Update specific content keys
export async function PATCH(req: NextRequest) {
  try {
    // Only platform admins can edit platform content
    await requireRole(req, ["platform_admin"]);
    
    const body = await req.json();
    const { updates } = body; // Expects { updates: { hero: {...}, pricing: {...} } }
    
    if (!updates || typeof updates !== "object") {
      return NextResponse.json({ error: "Invalid updates payload" }, { status: 400 });
    }

    const supabase = getAdminClient();
    const promises = [];
    
    for (const [key, content] of Object.entries(updates)) {
      promises.push(
        supabase
          .from("platform_content")
          .upsert({ key, content })
      );
    }
    
    const results = await Promise.all(promises);
    
    const errors = results.filter(r => r.error).map(r => r.error);
    if (errors.length > 0) {
      console.error("Errors updating content:", errors);
      return NextResponse.json({ error: "Failed to update some content" }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    if (error.message === "Unauthorized" || error.message === "Forbidden") {
      return NextResponse.json({ error: error.message }, { status: error.message === "Unauthorized" ? 401 : 403 });
    }
    console.error("Error updating platform content:", error);
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
  }
}
