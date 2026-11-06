import { getAdminClient } from "@/lib/supabase";
import LandingContent from "@/components/landing/LandingContent";

export const revalidate = 0;

export default async function LandingPage() {
  const supabase = getAdminClient();
  const { data } = await supabase.from("platform_content").select("*");

  const contentMap: Record<string, any> = {};
  if (data) {
    data.forEach((row) => {
      contentMap[row.key] = row.content;
    });
  }

  return <LandingContent contentMap={contentMap} />;
}
