import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/pages/api/auth/[...nextauth]";
import { getAdminClient } from "@/lib/supabase";

export default async function RootPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.email) {
    redirect("/login");
  }

  // Check if user has a clinic (server-side, no race conditions)
  try {
    const admin = getAdminClient();
    const { data: staff } = await admin
      .from("staff")
      .select("clinic_id")
      .eq("email", session.user.email)
      .maybeSingle();

    if (staff?.clinic_id) {
      redirect("/home");
    }
  } catch {
    // If DB query fails, redirect to setup (safe fallback)
  }

  redirect("/setup/center");
}
