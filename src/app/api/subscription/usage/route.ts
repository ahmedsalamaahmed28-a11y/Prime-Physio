import { NextRequest, NextResponse } from "next/server";
import { getClinicContext } from "@/lib/server/clinic-context";
import { checkSubscriptionLimit } from "@/lib/subscriptionCheck";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(request: NextRequest) {
  try {
    const auth = await getClinicContext(request);
    if ("response" in auth) return auth.response;

    const [patients, storage] = await Promise.all([
      checkSubscriptionLimit(auth.clinicId, "patients"),
      checkSubscriptionLimit(auth.clinicId, "storage"),
    ]);

    return NextResponse.json(
      { patients, storage },
      { headers: { "Cache-Control": "no-store, private" } }
    );
  } catch (error) {
    console.error("[Subscription Usage] Failed to load clinic quota usage:", error);
    return NextResponse.json(
      { error: "تعذر تحميل استهلاك حدود الاشتراك حاليًا." },
      { status: 500, headers: { "Cache-Control": "no-store, private" } }
    );
  }
}
