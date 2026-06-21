import { NextRequest, NextResponse } from "next/server";
import { getAdminClient } from "@/lib/supabase";
import { getServerSession } from "next-auth";
import { authOptions } from "@/pages/api/auth/[...nextauth]";

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    let centers = body.centers;
    if (!Array.isArray(centers)) {
      const { short_name, full_name, slug, logo_url } = body;
      if (!short_name || !slug) {
        return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
      }
      centers = [{ short_name, full_name, slug, logo_url }];
    }
    if (centers.length === 0) {
      return NextResponse.json({ error: "At least one center is required" }, { status: 400 });
    }

    const admin = getAdminClient();
    const email = session.user.email;

    let clinicId: string;
    let isNewClinic = false;

    const { data: existingClinic } = await admin
      .from("clinics")
      .select("id")
      .eq("admin_email", email)
      .maybeSingle();

    if (existingClinic) {
      clinicId = existingClinic.id;
    } else {
      isNewClinic = true;
      clinicId = crypto.randomUUID();

      const { error: clinicErr } = await admin.from("clinics").insert({
        id: clinicId,
        name: centers[0].full_name || centers[0].short_name,
        admin_email: email,
        status: "active",
      });
      if (clinicErr) {
        return NextResponse.json({ error: clinicErr.message }, { status: 500 });
      }

      const displayName = session.user.name || centers[0].short_name;
      const { error: staffErr } = await admin.from("staff").insert({
        clinic_id: clinicId,
        name: displayName,
        email,
        role: "admin",
        status: "نشط",
      });
      if (staffErr) {
        await admin.from("clinics").delete().eq("id", clinicId);
        return NextResponse.json({ error: staffErr.message }, { status: 500 });
      }
    }

    const branches = [];
    for (const center of centers) {
      const cleanSlug = center.slug.toLowerCase().replace(/[^a-z0-9-]/g, "");
      const { data: branch, error: branchErr } = await admin
        .from("branches")
        .insert({
          clinic_id: clinicId,
          short_name: center.short_name,
          full_name: center.full_name || center.short_name,
          slug: cleanSlug,
          logo_url: center.logo_url || null,
        })
        .select()
        .single();

      if (branchErr) {
        if (isNewClinic) {
          await admin.from("clinics").delete().eq("id", clinicId);
          await admin.from("staff").delete().eq("clinic_id", clinicId);
        }
        return NextResponse.json({ error: branchErr.message }, { status: 500 });
      }
      branches.push(branch);
    }

    return NextResponse.json({ clinicId, branches, isNewClinic });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
