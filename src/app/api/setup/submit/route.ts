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

    if (existingStaff?.clinic_id) {
      // Prevent creating another clinic if one already exists
      return NextResponse.json(
        { error: "User already has a clinic", clinicId: existingStaff.clinic_id },
        { status: 400 }
      );
    }

    // Call the RPC function for a true Postgres transaction
    const { data: transactionData, error: transactionError } = await admin.rpc("setup_clinic_transaction", {
      p_email: email,
      p_name: name || "Clinic Admin",
      p_branches: centers // without logo
    });

    if (transactionError || !transactionData || transactionData?.error) {
      console.error("[Setup Submit] Transaction error details:", transactionError);
      return NextResponse.json(
        { 
          error: transactionData?.error || "Failed to setup clinic transaction",
          details: transactionData?.message || transactionError?.message || "Unknown error",
          hint: transactionData?.hint || transactionError?.hint || "",
          code: transactionData?.code || transactionError?.code || ""
        }, 
        { status: 500 }
      );
    }

    const clinicId = transactionData.clinicId;
    const createdBranches = transactionData.branches;
    const createdSlugs = createdBranches.map((b: any) => b.slug);

    return NextResponse.json({
      success: true,
      clinicId,
      createdSlugs,
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
