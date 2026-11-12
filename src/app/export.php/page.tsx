import { redirect } from "next/navigation";

// The dedicated export page will be designed later. For now, send users
// to their centers, where the existing per-center export action is available.
export default function ExportPhpPage() {
  redirect("/centers.php/");
}
