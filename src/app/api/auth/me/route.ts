import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/pages/api/auth/[...nextauth]";
import { getAdminClient } from "@/lib/supabase";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ user: null, subscription: null });
    }

    const admin = getAdminClient();
    const email = session.user.email;

    // Get staff info
    const { data: staff } = await admin
      .from("staff")
      .select("clinic_id, role")
      .eq("email", email)
      .maybeSingle();

    if (!staff?.clinic_id) {
      return NextResponse.json({
        user: { email, name: session.user.name },
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
      user: { email, name: session.user.name },
      subscription: subscription || null,
      clinicId: staff.clinic_id,
      branches: branches || [],
      hasClinic: true,
    });
  } catch {
    return NextResponse.json({ user: null, subscription: null }, { status: 500 });
  }
}
