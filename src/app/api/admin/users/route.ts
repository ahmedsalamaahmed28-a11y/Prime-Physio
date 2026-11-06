import { NextRequest, NextResponse } from "next/server";
import { getAdminClient } from "@/lib/supabase-admin";
import { requireRole } from "../../utils/auth";

export async function GET(req: NextRequest) {
  try {
    await requireRole(req, ["platform_admin"]);

    const admin = getAdminClient();
    const { data: staff, error: staffError } = await admin
      .from("staff")
      .select("id, name, email, role, clinic_id, created_at, status")
      .not("status", "in", '("محذوف","deleted")')
      .order("created_at", { ascending: false });

    if (staffError) {
      console.error("[AdminUsers] Staff listing failed:", staffError);
      return NextResponse.json({ error: "Failed to load users" }, { status: 500 });
    }

    const { data: clinics, error: clinicsError } = await admin
      .from("clinics")
      .select("id, name");

    if (clinicsError) {
      console.error("[AdminUsers] Clinic listing failed:", clinicsError);
      return NextResponse.json({ error: "Failed to load clinics" }, { status: 500 });
    }

    const clinicsMap = new Map<string, string>((clinics || []).map((clinic) => [clinic.id, clinic.name] as const));
    const enrichedStaff = (staff || []).map((member) => ({
      ...member,
      clinicName: clinicsMap.get(member.clinic_id) || "عيادة غير معروفة",
    }));

    return NextResponse.json({ users: enrichedStaff }, {
      headers: { "Cache-Control": "no-store, private" },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unexpected error";
    const status = message === "Unauthorized" ? 401 : message.includes("غير مصرح") || message.includes("platform admin") ? 403 : 500;
    return NextResponse.json({ error: status === 500 ? "Unable to verify administrator access" : message }, { status });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const user = await requireRole(req, ["platform_admin"]);
    const body = await req.json().catch(() => null);
    const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";

    if (
      !email ||
      email.length > 254 ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ||
      body?.action !== "delete"
    ) {
      return NextResponse.json({ error: "Invalid request payload" }, { status: 400 });
    }

    if (email === user.email.trim().toLowerCase()) {
      return NextResponse.json({ error: "You cannot remove your own account" }, { status: 400 });
    }

    // This RPC soft-disables the staff row (preserving clinical/HR history) and
    // removes the custom password credential in one transaction.
    const admin = getAdminClient();
    const { data: deletion, error: deleteError } = await admin.rpc("delete_staff_account", {
      p_email: email,
    });

    if (deleteError) {
      console.error("[AdminUsers] Account removal failed:", deleteError);
      const status = deleteError.code === "42501" ? 403 : deleteError.code === "22023" ? 400 : 500;
      return NextResponse.json({
        error: status === 403 ? "Protected account cannot be removed" : status === 400 ? "Invalid email address" : "Failed to remove account",
      }, { status });
    }

    const staffDisabled = Number(deletion?.staff_disabled || 0);
    const authAccountDeleted = Number(deletion?.auth_account_deleted || 0);
    if (staffDisabled === 0 && authAccountDeleted === 0) {
      return NextResponse.json({ error: "User account not found" }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      removed: { staffAccessDisabled: staffDisabled, credentialsDeleted: authAccountDeleted },
    }, { headers: { "Cache-Control": "no-store, private" } });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unexpected error";
    const status = message === "Unauthorized" ? 401 : message.includes("غير مصرح") || message.includes("platform admin") ? 403 : 500;
    return NextResponse.json({ error: status === 500 ? "Unable to verify administrator access" : message }, { status });
  }
}
