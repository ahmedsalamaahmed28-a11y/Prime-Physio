import { NextRequest, NextResponse } from "next/server";
import { getAdminClient } from "@/lib/supabase";
import { requireAuth } from "../../utils/auth";

export async function GET(req: NextRequest) {
  try {
    const sessionUser = await requireAuth(req);
    if (!sessionUser?.email) {
      return NextResponse.json({ user: null, subscription: null });
    }

    const admin = getAdminClient();
    const email = sessionUser.email.toLowerCase().trim();

    // Get staff info
    const { data: staff } = await admin
      .from("staff")
      .select("clinic_id, role, name")
      .eq("email", email)
      .maybeSingle();

    if (!staff?.clinic_id) {
      return NextResponse.json({
        user: { email, name: staff?.name || "" },
        subscription: null,
        hasClinic: false,
      });
    }

    // Get subscription
    const { data: subscription } = await admin
      .from("subscriptions")
      .select("plan_name, status, start_date, end_date")
      .eq("clinic_id", staff.clinic_id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    // Get user's branches
    const { data: branches } = await admin
      .from("branches")
      .select("id, short_name, full_name, slug, logo_url")
      .eq("clinic_id", staff.clinic_id);

    return NextResponse.json({
      user: { email, name: staff?.name || "" },
      subscription: subscription || null,
      clinicId: staff.clinic_id,
      branches: branches || [],
      hasClinic: true,
    });
  } catch {
    return NextResponse.json({ user: null, subscription: null }, { status: 500 });
  }
}
