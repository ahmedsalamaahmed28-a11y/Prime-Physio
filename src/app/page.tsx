import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/pages/api/auth/[...nextauth]";
import { getAdminClient } from "@/lib/supabase";

export default async function RootPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.email) {
    redirect("/login");
  }

  const admin = getAdminClient();
  const email = session.user.email;

  // Check if account still exists in DB — stale JWT (e.g., after DB reset)
  try {
    const { data: account } = await admin
      .from("auth_accounts")
      .select("email")
      .eq("email", email)
      .maybeSingle();
    if (!account) {
      redirect("/api/auth/signout?callbackUrl=/login");
    }
  } catch {
    // If query fails, fall through and check staff
  }

  // Check if user has a clinic (server-side, no race conditions)
  try {
    const { data: staff } = await admin
      .from("staff")
      .select("clinic_id")
      .eq("email", email)
      .maybeSingle();

    if (staff?.clinic_id) {
      redirect("/home");
    }
  } catch {
    // If DB query fails, redirect to setup (safe fallback)
  }

  redirect("/setup/center");
}
