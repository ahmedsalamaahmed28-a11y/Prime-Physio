import { NextRequest, NextResponse } from "next/server";
import { getAdminClient } from "@/lib/supabase-admin";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/pages/api/auth/[...nextauth]";

export async function POST(req: NextRequest) {
  try {
    // Never trust an email supplied by the browser for privileged provisioning.
    // The caller must have a valid NextAuth session for that exact email.
    const session = await getServerSession(authOptions);
    const sessionEmail = session?.user?.email?.toLowerCase().trim();

    if (!sessionEmail) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const requestedEmail =
      typeof body?.email === "string" ? body.email.toLowerCase().trim() : "";

    if (!requestedEmail || requestedEmail !== sessionEmail) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const email = sessionEmail;
    const sessionName =
      typeof session?.user?.name === "string" ? session.user.name.trim() : "";
    const clinicName = sessionName || email.split("@")[0];

    const admin = getAdminClient();

    // 1. Check if user is already in staff
    const { data: existingStaff, error: staffLookupError } = await admin
      .from("staff")
      .select("clinic_id, role, status")
      .eq("email", email)
      .limit(1)
      .maybeSingle();

    if (staffLookupError) {
      console.error("[AutoProvision] Staff lookup failed:", staffLookupError);
      return NextResponse.json({ error: "Unable to verify account" }, { status: 500 });
    }

    if (existingStaff?.status === "محذوف" || existingStaff?.status === "deleted") {\n      return NextResponse.json({ error: "This account has been removed from the clinic" }, { status: 403 });\n    }\n\n    if (existingStaff?.clinic_id) {
      return NextResponse.json(
        { clinicId: existingStaff.clinic_id, clinicName },
        { headers: { "Cache-Control": "no-store, private" } }
      );
    }

    if (
      existingStaff &&
      !["admin", "clinic_admin", "مدير العياده", "مدير العيادة"].includes(
        String(existingStaff.role || "").toLowerCase().trim()
      )
    ) {
      return NextResponse.json(
        { error: "Only an unassigned clinic administrator can create a clinic" },
        { status: 403, headers: { "Cache-Control": "no-store, private" } }
      );
    }

    // 2. Check if clinic already exists for this authenticated email
    const { data: existingClinic, error: clinicLookupError } = await admin
      .from("clinics")
      .select("id")
      .eq("admin_email", email)
      .limit(1)
      .maybeSingle();

    if (clinicLookupError) {
      console.error("[AutoProvision] Clinic lookup failed:", clinicLookupError);
      return NextResponse.json({ error: "Unable to verify clinic" }, { status: 500 });
    }

    let clinicId = existingClinic?.id;

    // 3. Create clinic if it doesn't exist
    if (!clinicId) {
      clinicId = crypto.randomUUID();
      const { error: clinicError } = await admin.from("clinics").insert({
        id: clinicId,
        name: clinicName,
        admin_email: email,
        status: "active",
      });

      if (clinicError) {
        console.error("[AutoProvision] Clinic creation failed:", clinicError);
        return NextResponse.json({ error: "Failed to create clinic" }, { status: 500 });
      }
    }

    // 4. Create or link the staff record for the authenticated account only
    const { data: linkedStaff, error: linkedStaffError } = await admin
      .from("staff")
      .select("id")
      .eq("email", email)
      .limit(1)
      .maybeSingle();

    if (linkedStaffError) {
      console.error("[AutoProvision] Staff recheck failed:", linkedStaffError);
      return NextResponse.json({ error: "Unable to verify staff account" }, { status: 500 });
    }

    if (linkedStaff) {
      const { error: linkError } = await admin
        .from("staff")
        .update({ clinic_id: clinicId })
        .eq("email", email);

      if (linkError) {
        console.error("[AutoProvision] Staff linking failed:", linkError);
        return NextResponse.json({ error: "Failed to link staff record" }, { status: 500 });
      }
    } else {
      const { error: staffError } = await admin.from("staff").insert({
        clinic_id: clinicId,
        name: clinicName,
        email,
        role: "admin",
        status: "نشط",
      });

      if (staffError) {
        console.error("[AutoProvision] Staff creation failed:", staffError);
        return NextResponse.json({ error: "Failed to create staff record" }, { status: 500 });
      }
    }

    // 5. Create default clinic settings
    const { error: settingsError } = await admin.from("clinic_settings").upsert(
      { user_id: email, clinic_id: clinicId, clinic_name: clinicName },
      { onConflict: "clinic_id" }
    );

    if (settingsError) {
      console.error("[AutoProvision] Settings creation failed:", settingsError);
      // The clinic and staff already exist; do not hide the partial setup.
      return NextResponse.json({ error: "Clinic created but settings setup failed" }, { status: 500 });
    }

    // 6. Link orphaned subscriptions for this authenticated email
    const { error: subscriptionError } = await admin
      .from("subscriptions")
      .update({ clinic_id: clinicId })
      .eq("user_email", email)
      .is("clinic_id", null);

    if (subscriptionError) {
      console.error("[AutoProvision] Subscription linking failed:", subscriptionError);
      return NextResponse.json({ error: "Clinic created but subscription linking failed" }, { status: 500 });
    }

    return NextResponse.json(
      { clinicId, clinicName },
      { headers: { "Cache-Control": "no-store, private" } }
    );
  } catch (err) {
    console.error("[AutoProvision] Unhandled error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
