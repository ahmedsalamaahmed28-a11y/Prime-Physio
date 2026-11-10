import { redirect } from "next/navigation";

// Keep the My Centers URL aligned with the canonical center-management screen.
export default function MyCentersRedirect() {
  redirect("/center-management");
}
