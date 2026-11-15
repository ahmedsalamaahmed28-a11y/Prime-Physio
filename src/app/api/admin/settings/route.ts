import { NextRequest, NextResponse } from "next/server";
import { getAdminClient } from "@/lib/supabase-admin";
import { requireAuth } from "../../utils/auth";

export async function GET(req: NextRequest) {
  try {
    const user = await requireAuth(req);

    const admin = getAdminClient();
    
    // Check if platform admin
    const { data: pa } = await admin
      .from("platform_admins")
      .select("email")
      .eq("email", user.email)
      .limit(1)
      .maybeSingle();

    if (!pa) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { data: settings, error } = await admin
      .from("platform_settings")
      .select("*")
      .eq("id", 1)
      .limit(1)
      .maybeSingle();

    if (error) {
      // If table doesn't exist, we return empty settings (could happen before migration)
      console.error("Error fetching platform settings:", error.message);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Default settings if no row exists yet (though SQL should insert it)
    const currentSettings = settings || {
      platform_name: 'برايم فيزيو',
      support_email: 'support@prime-physio.com',
      allow_signups: true,
      default_trial_days: 14
    };

    return NextResponse.json({ settings: currentSettings });
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

    const updates = await req.json();
    
    // Validate inputs (basic validation)
    if (updates.default_trial_days !== undefined && updates.default_trial_days < 0) {
      return NextResponse.json({ error: "Trial days cannot be negative" }, { status: 400 });
    }

    const { error } = await admin
      .from("platform_settings")
      .upsert({
        id: 1,
        ...(updates.platform_name !== undefined && { platform_name: updates.platform_name }),
        ...(updates.support_email !== undefined && { support_email: updates.support_email }),
        ...(updates.allow_signups !== undefined && { allow_signups: updates.allow_signups }),
        ...(updates.default_trial_days !== undefined && { default_trial_days: updates.default_trial_days }),
      })
      .eq("id", 1);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    const status = err.message === "Unauthorized" ? 401 : err.message === "Forbidden" ? 403 : 500;
    return NextResponse.json({ error: err.message }, { status });
  }
}
