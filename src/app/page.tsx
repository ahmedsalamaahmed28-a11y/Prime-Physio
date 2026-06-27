import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/pages/api/auth/[...nextauth]";
import { getAdminClient } from "@/lib/supabase";

export default async function RootPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.email) {
    redirect("/manage");
  }

  const admin = getAdminClient();
  const email = session.user.email.toLowerCase().trim();

  try {
    // Check if user is a platform admin first
    const { data: platformAdmin } = await admin
      .from("platform_admins")
      .select("id")
      .eq("email", email)
      .maybeSingle();

    if (platformAdmin) {
      redirect("/admin");
    }

    const { data: staff } = await admin
      .from("staff")
      .select("clinic_id")
      .eq("email", email)
      .limit(1)
      .maybeSingle();

    if (!staff) {
      redirect("/manage");
    }
    if (!staff.clinic_id) {
      redirect("/manage");
    }

    const { data: subscription } = await admin
      .from("subscriptions")
      .select("id")
      .eq("clinic_id", staff.clinic_id)
      .eq("status", "active")
      .maybeSingle();

    if (!subscription) {
      redirect("/home");
    }

    const { data: branch } = await admin
      .from("branches")
      .select("id")
      .eq("clinic_id", staff.clinic_id)
      .limit(1)
      .maybeSingle();

    if (!branch) {
      redirect("/manage");
    }
  } catch {
    redirect("/manage");
  }

  redirect("/home");
}
