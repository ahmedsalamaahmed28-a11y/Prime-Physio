import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/pages/api/auth/[...nextauth]";
import { getAdminClient } from "@/lib/supabase";

export default async function RootPage() {
  const session = await getServerSession(authOptions);
  const admin = getAdminClient();

  if (!session?.user?.email) {
    redirect("/login");
  }

  const email = session.user.email;

  // Check if auth_accounts exists
  let hasAccount = false;
  try {
    const { data: account } = await admin
      .from("auth_accounts")
      .select("email")
      .eq("email", email)
      .maybeSingle();
    hasAccount = !!account;
  } catch {}

  if (!hasAccount) {
    redirect("/signup?google=1");
  }

  // Check subscription
  let hasSubscription = false;
  try {
    const { data: sub } = await admin
      .from("subscriptions")
      .select("id")
      .eq("user_email", email)
      .eq("status", "active")
      .maybeSingle();
    hasSubscription = !!sub;
  } catch {}

  // Check staff/clinic
  try {
    const { data: staff } = await admin
      .from("staff")
      .select("clinic_id")
      .eq("email", email)
      .maybeSingle();

    if (staff?.clinic_id) {
      if (hasSubscription) {
        redirect("/home");
      } else {
        redirect("/subscribe");
      }
    }
  } catch {}

  redirect("/setup/center");
}
