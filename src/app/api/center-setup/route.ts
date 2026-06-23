import { NextRequest, NextResponse } from "next/server";
import { getAdminClient } from "@/lib/supabase";

export async function POST(req: NextRequest) {
  try {
    const { email, planId, shortName, fullName, slug, specializations, logoUrl } = await req.json();

    if (!email || !shortName || !slug) {
      return NextResponse.json({ error: "الحقول المطلوبة: البريد الإلكتروني، اسم المركز، والرمز التعريفي" }, { status: 400 });
    }

    const admin = getAdminClient();
    const cleanEmail = email.toLowerCase().trim();

    // Call the create_center SQL function
    const { data, error } = await admin.rpc("create_center", {
      p_email: cleanEmail,
      p_plan_id: planId || "basic",
      p_short_name: shortName.trim(),
      p_full_name: (fullName || shortName).trim(),
      p_slug: slug.trim().toLowerCase(),
      p_specializations: specializations || [],
      p_logo_url: logoUrl || null,
    });

    if (error) {
      console.error("[CenterSetup] RPC error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (data?.error) {
      return NextResponse.json({ error: data.error }, { status: 400 });
    }

    return NextResponse.json({ clinicId: data.clinic_id, branchId: data.branch_id });
  } catch (err) {
    console.error("[CenterSetup] Error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
