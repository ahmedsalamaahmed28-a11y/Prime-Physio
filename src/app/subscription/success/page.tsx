import { redirect } from "next/navigation";

export default function LegacyPaymentRoute() {
  redirect("/plans.php");
}
