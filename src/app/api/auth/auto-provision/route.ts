import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/pages/api/auth/[...nextauth]";
import { getAdminClient } from "@/lib/supabase";

export async function POST(req: NextRequest) {
  try {
    // Never allow an unauthenticated caller to create a clinic or an admin staff record.
    const session = await getServerSession(authOptions);
    const sessionEmail = session?.user?.email?.toLowerCase().trim();
    if (!sessionEmail) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json().catch(() => null);
    const requestedEmail = typeof body?.email === "string" ? body.email.toLowerCase().trim() : "";
    if (!requestedEmail || requestedEmail !== sessionEmail) {
      return NextResponse.json({ error: "The requested email must match the signed-in account" }, { status: 403 });
    }

    const requestedName = typeof body?.name === "string" ? body.name.trim() : "";
    const clinicName = (requestedName || sessionEmail.split("@")[0]).slice(0, 120);
    const admin = getAdminClient();

    // Existing staff membership is authoritative; do not create a second clinic.
    const { data: existingStaff, error: staffLookupError } = await admin
      .from("staff")
      .select("clinic_id")
      .eq("email", sessionEmail)
      .limit(1)
      .maybeSingle();

    if (staffLookupError) {
      console.error("[AutoProvision] Staff lookup failed:", staffLookupError.message);
      return NextResponse.json({ error: "Unable to verify account" }, { status: 500 });
    }

    if (existingStaff?.clinic_id) {
      return NextResponse.json({ clinicId: existingStaff.clinic_id, clinicName });
    }

    const { data: existingClinic, error: clinicLookupError } = await admin
      .from("clinics")
      .select("id")
      .eq("admin_email", sessionEmail)
      .limit(1)
      .maybeSingle();

    if (clinicLookupError) {
      console.error("[AutoProvision] Clinic lookup failed:", clinicLookupError.message);
      return NextResponse.json({ error: "Unable to verify clinic" }, { status: 500 });
    }

    let clinicId = existingClinic?.id;

    if (!clinicId) {
      const { data: createdClinic, error: clinicError } = await admin
        .from("clinics")
        .insert({
          name: clinicName,
          admin_email: sessionEmail,
          status: "active",
        })
        .select("id")
        .single();

      if (clinicError || !createdClinic) {
        console.error("[AutoProvision] Clinic creation failed:", clinicError?.message);
        return NextResponse.json({ error: "Failed to create clinic" }, { status: 500 });
      }
      clinicId = createdClinic.id;
    }

    const { error: staffError } = await admin.from("staff").upsert({
      clinic_id: clinicId,
      name: clinicName,
      email: sessionEmail,
      role: "admin",
      status: "نشط",
    }, { onConflict: "email" });

    if (staffError) {
      console.error("[AutoProvision] Staff creation failed:", staffError.message);
      return NextResponse.json({ error: "Failed to create staff record" }, { status: 500 });
    }

    const { error: settingsError } = await admin.from("clinic_settings").upsert({
      clinic_id: clinicId,
      clinic_name: clinicName,
    }, { onConflict: "clinic_id" });

    if (settingsError) {
      console.error("[AutoProvision] Settings creation failed:", settingsError.message);
    }

    const { error: subscriptionError } = await admin
      .from("subscriptions")
      .update({ clinic_id: clinicId })
      .eq("user_email", sessionEmail)
      .is("clinic_id", null);

    if (subscriptionError) {
      console.error("[AutoProvision] Subscription linking failed:", subscriptionError.message);
    }

    return NextResponse.json({ clinicId, clinicName });
  } catch (err) {
    console.error("[AutoProvision] Unhandled error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
