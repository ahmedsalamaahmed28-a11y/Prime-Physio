import { NextRequest, NextResponse } from "next/server";
import { getAdminClient } from "@/lib/supabase";
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

    const { data: staff, error: staffError } = await admin
      .from("staff")
      .select("id, name, email, role, clinic_id, created_at")
      .order("created_at", { ascending: false });

    if (staffError) {
      return NextResponse.json({ error: staffError.message }, { status: 500 });
    }

    const { data: clinics, error: clinicsError } = await admin
      .from("clinics")
      .select("id, name");

    if (clinicsError) {
      return NextResponse.json({ error: clinicsError.message }, { status: 500 });
    }

    const clinicsMap = new Map(clinics?.map((c: any) => [c.id, c.name]));

    const enrichedStaff = staff?.map((member: any) => ({
      ...member,
      clinicName: clinicsMap.get(member.clinic_id) || "عيادة غير معروفة"
    }));

    return NextResponse.json({ users: enrichedStaff });
  } catch (err: any) {
    const status = err.message === "Unauthorized" ? 401 : err.message === "Forbidden" ? 403 : 500;
    return NextResponse.json({ error: err.message }, { status });
  }
}

export async function PATCH(req: NextRequest) {
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

    const { email, action } = await req.json();
    if (!email || action !== 'delete') {
      return NextResponse.json({ error: "Invalid request payload" }, { status: 400 });
    }

    const { error: staffError } = await admin
      .from("staff")
      .delete()
      .eq("email", email);

    if (staffError) {
      return NextResponse.json({ error: staffError.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    const status = err.message === "Unauthorized" ? 401 : err.message === "Forbidden" ? 403 : 500;
    return NextResponse.json({ error: err.message }, { status });
  }
}
