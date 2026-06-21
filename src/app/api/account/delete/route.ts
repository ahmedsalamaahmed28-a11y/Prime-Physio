import { NextRequest, NextResponse } from "next/server";
import { getAdminClient } from "@/lib/supabase";
import { requireRole } from "../../utils/auth";

export async function POST(req: NextRequest) {
  try {
    const user = await requireRole(req, ["admin", "doctor", "receptionist"]);
    
    const admin = getAdminClient();
    const clinicId = user.clinicId;
    
    if (!clinicId) {
      return NextResponse.json({ error: "No clinic found for user" }, { status: 400 });
    }
    
    // Start a transaction to delete all related data
    const { error: deleteError } = await admin
      .from("patients")
      .delete()
      .eq("clinic_id", clinicId);
    
    if (deleteError) {
      console.error("Failed to delete patients:", deleteError);
      return NextResponse.json({ error: "Failed to delete patient data" }, { status: 500 });
    }
    
    const { error: sessionsError } = await admin
      .from("sessions")
      .delete()
      .eq("clinic_id", clinicId);
    
    if (sessionsError) {
      console.error("Failed to delete sessions:", sessionsError);
      return NextResponse.json({ error: "Failed to delete session data" }, { status: 500 });
    }
    
    const { error: appointmentsError } = await admin
      .from("appointments")
      .delete()
      .eq("clinic_id", clinicId);
    
    if (appointmentsError) {
      console.error("Failed to delete appointments:", appointmentsError);
      return NextResponse.json({ error: "Failed to delete appointment data" }, { status: 500 });
    }
    
    const { error: invoicesError } = await admin
      .from("invoices")
      .delete()
      .eq("clinic_id", clinicId);
    
    if (invoicesError) {
      console.error("Failed to delete invoices:", invoicesError);
      return NextResponse.json({ error: "Failed to delete invoice data" }, { status: 500 });
    }
    
    const { error: clinicSettingsError } = await admin
      .from("clinic_settings")
      .delete()
      .eq("clinic_id", clinicId);
    
    if (clinicSettingsError) {
      console.error("Failed to delete clinic settings:", clinicSettingsError);
      return NextResponse.json({ error: "Failed to delete clinic settings" }, { status: 500 });
    }
    
    const { error: staffError } = await admin
      .from("staff")
      .delete()
      .eq("clinic_id", clinicId)
      .eq("email", user.email);
    
    if (staffError) {
      console.error("Failed to delete staff record:", staffError);
      return NextResponse.json({ error: "Failed to delete staff record" }, { status: 500 });
    }
    
    // For platform admins, also delete from platform_admins table
    if (user.roleKey === "platform_admin") {
      const { error: platformAdminError } = await admin
        .from("platform_admins")
        .delete()
        .eq("email", user.email);
      
      if (platformAdminError) {
        console.error("Failed to delete platform admin:", platformAdminError);
        return NextResponse.json({ error: "Failed to delete platform admin" }, { status: 500 });
      }
    }
    
    // Delete from auth_accounts table
    const { error: authAccountsError } = await admin
      .from("auth_accounts")
      .delete()
      .eq("email", user.email);
    
    if (authAccountsError) {
      console.error("Failed to delete auth account:", authAccountsError);
      return NextResponse.json({ error: "Failed to delete auth account" }, { status: 500 });
    }
    
    // If this is a clinic admin, also delete the clinic
    if (user.roleKey === "admin") {
      const { error: clinicError } = await admin
        .from("clinics")
        .delete()
        .eq("id", clinicId);
      
      if (clinicError) {
        console.error("Failed to delete clinic:", clinicError);
        return NextResponse.json({ error: "Failed to delete clinic" }, { status: 500 });
      }
    }
    
    // Sign out the user from NextAuth
    await fetch(`${process.env.NEXTAUTH_URL || "http://localhost:3000"}/api/auth/signout`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: user.email }),
    });
    
    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("Account deletion error:", err);
    const status = err.message === "Unauthorized" ? 401 : err.message === "Forbidden" ? 403 : 500;
    return NextResponse.json({ error: err.message }, { status });
  }
}