import { NextRequest, NextResponse } from "next/server";
import { getAdminClient } from "@/lib/supabase-admin";
import { requireAuth } from "../../utils/auth";

export async function GET(req: NextRequest) {
  try {
    const user = await requireAuth(req);

    const admin = getAdminClient();
    const { data: pa } = await admin
      .from("platform_admins")
      .select("email")
      .eq("email", user.email)
      .limit(1)
      .maybeSingle();

    if (!pa) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { data: subs, error: subsError } = await admin
      .from("subscriptions")
      .select("*")
      .order("created_at", { ascending: false });

    if (subsError) {
      return NextResponse.json({ error: subsError.message }, { status: 500 });
    }

    const { data: clinics, error: clinicsError } = await admin
      .from("clinics")
      .select("id, name, email");

    if (clinicsError) {
      return NextResponse.json({ error: clinicsError.message }, { status: 500 });
    }

    const clinicsMap = new Map(clinics?.map((c: any) => [c.id, { name: c.name, email: c.email }]));

    const enrichedSubs = subs?.map((sub: any) => ({
      ...sub,
      clinicName: sub.clinic_id ? clinicsMap.get(sub.clinic_id)?.name || "عيادة غير معروفة" : "غير مرتبط",
      clinicEmail: sub.clinic_id ? clinicsMap.get(sub.clinic_id)?.email || sub.user_email : sub.user_email
    }));

    return NextResponse.json({ subscriptions: enrichedSubs || [] });
  } catch (err: any) {
    const status = err.message === "Unauthorized" ? 401 : err.message === "Forbidden" ? 403 : 500;
    return NextResponse.json({ error: err.message }, { status });
  }
}
