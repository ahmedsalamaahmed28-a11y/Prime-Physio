import { NextRequest, NextResponse } from "next/server";
import { getAdminClient } from "@/lib/supabase";
import { requireAuth } from "../../utils/auth";

export async function POST(req: NextRequest) {
  try {
    const session = await requireAuth(req);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const email = session.email;
    const { name, centers } = await req.json();

    if (!email) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    if (!centers || centers.length === 0) {
      return NextResponse.json({ error: "At least one center is required" }, { status: 400 });
    }

    const admin = getAdminClient();

    // 1. Check if user already has a clinic in staff
    const { data: existingStaff } = await admin
      .from("staff")
      .select("clinic_id")
      .eq("email", email)
      .limit(1)
      .maybeSingle();

    let clinicId = existingStaff?.clinic_id;

    if (!clinicId) {
      // Create new clinic
      clinicId = crypto.randomUUID();
      const { error: clinicError } = await admin.from("clinics").insert({
        id: clinicId,
        name: name || "Clinic Admin",
        admin_email: email,
        status: "active",
      });

      if (clinicError) {
        return NextResponse.json({ error: "Failed to create clinic" }, { status: 500 });
      }

      // Update staff
      await admin.from("staff").update({ clinic_id: clinicId }).eq("email", email);
      
      // Create settings
      await admin.from("clinic_settings").upsert({ clinic_id: clinicId, clinic_name: name || "Clinic Admin" });
    }

    // Check for duplicate slugs
    const slugs = centers.map((c: any) => c.slug.toLowerCase().trim());
    const { data: existingBranches } = await admin.from("branches").select("slug").in("slug", slugs);
    if (existingBranches && existingBranches.length > 0) {
       return NextResponse.json({ error: `Slug already taken: ${existingBranches[0].slug}` }, { status: 400 });
    }

    // Check branch limits for existing clinic
    if (existingStaff?.clinic_id) {
      const { data: sub } = await admin
        .from("subscriptions")
        .select("plan_name")
        .eq("clinic_id", clinicId)
        .eq("status", "active")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      const { count: branchCount } = await admin
        .from("branches")
        .select("*", { count: "exact", head: true })
        .eq("clinic_id", clinicId);

      const plan = sub?.plan_name || "basic";
      if (plan !== "gold" && branchCount && branchCount >= 1) {
        return NextResponse.json({ error: "الخطة الحالية لا تدعم أكثر من مركز واحد. يرجى الترقية للخطة الذهبية." }, { status: 403 });
      }
    }

    // Insert branches
    const createdBranches = [];
    for (const center of centers) {
       const slug = center.slug.toLowerCase().trim();
       const { data: branch, error: branchError } = await admin.from("branches").insert({
          clinic_id: clinicId,
          short_name: center.shortName,
          full_name: center.fullName || null,
          slug,
          status: "active"
       }).select("id, slug, short_name, full_name").single();

       if (!branchError && branch) {
          createdBranches.push({
             id: branch.id,
             slug: branch.slug,
             shortName: branch.short_name,
             fullName: branch.full_name
          });
       }
    }

    return NextResponse.json({
      success: true,
      clinicId,
      createdSlugs: createdBranches.map(b => b.slug),
      createdBranches,
    });
  } catch (err) {
    console.error("[Setup Submit] Unhandled Error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal server error" },
      { status: 500 }
    );
  }
}

