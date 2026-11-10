import { redirect } from "next/navigation";

// Keep existing bookmarks and internal links working after the dashboard route rename.
export default function LegacyHomeRedirect() {
  redirect("/dashboard");
}
