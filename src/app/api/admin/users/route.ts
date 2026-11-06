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
      .select("id, name, email, role, clinic_id, created_at, status")
      .neq("status", "محذوف")
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

    const body = await req.json().catch(() => null);
    const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
    if (!email || email.length > 254 || !/^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/.test(email) || body?.action !== "delete") {
      return NextResponse.json({ error: "Invalid request payload" }, { status: 400 });
    }

    if (email === user.email.toLowerCase().trim()) {
      return NextResponse.json({ error: "You cannot delete your own account" }, { status: 400 });
    }

    const { data: deletion, error: deleteError } = await admin.rpc("delete_staff_account", {
      p_email: email,
    });

    if (deleteError) {
      console.error("[AdminUsers] Atomic account deletion failed:", deleteError);
      const status = deleteError.code === "42501" ? 403 : deleteError.code === "22023" ? 400 : 500;
      return NextResponse.json({ error: status === 403 ? "Protected account cannot be deleted" : "Failed to delete account" }, { status });
    }

    const staffDisabled = Number(deletion?.staff_disabled || 0);
    const authAccountDeleted = Number(deletion?.auth_account_deleted || 0);
    if (staffDisabled === 0 && authAccountDeleted === 0) {
      return NextResponse.json({ error: "User account not found" }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      deleted: { staffAccessDisabled: staffDisabled, credentials: authAccountDeleted },
    });
  } catch (err: any) {
    const status = err.message === "Unauthorized" ? 401 : err.message === "Forbidden" ? 403 : 500;
    return NextResponse.json({ error: err.message }, { status });
  }
}
