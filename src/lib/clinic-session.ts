import { supabase } from "@/lib/supabase";
import { setClinicApiAccessToken } from "@/lib/clinic-api-fetch";

const pendingExchanges = new Map<string, Promise<void>>();

async function clearTabClinicSession(): Promise<void> {
  setClinicApiAccessToken(null);
  if (typeof window !== "undefined") {
    sessionStorage.removeItem("preferred_clinic_id");
    sessionStorage.removeItem("prime-physio:active-clinic-id");
  }
  await supabase.auth.signOut({ scope: "local" }).catch((error) => {
    console.error("Failed to clear stale tab clinic session:", error);
  });
}

async function exchangeClinicSession(clinicId: string, expectedEmail: string): Promise<void> {
  let response: Response;
  try {
    response = await fetch("/api/auth/clinic-session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      cache: "no-store",
      credentials: "same-origin",
      body: JSON.stringify({ clinic_id: clinicId, expected_email: expectedEmail.trim().toLowerCase() }),
    });
  } catch (error) {
    await clearTabClinicSession();
    throw error;
  }
  const payload = await response.json().catch(() => ({}));
  if (!response.ok || !payload.session?.access_token || !payload.session?.refresh_token) {
    await clearTabClinicSession();
    throw new Error(payload.error || "Unable to activate the independent clinic session");
  }
  if (payload.clinic_id !== clinicId) {
    await clearTabClinicSession();
    throw new Error("The issued session does not match the selected clinic");
  }

  if (typeof window !== "undefined") {
    sessionStorage.removeItem("prime-physio:tab-logged-out");
    sessionStorage.setItem("preferred_clinic_id", clinicId);
    sessionStorage.setItem("prime-physio:active-clinic-id", clinicId);
  }

  const { data, error } = await supabase.auth.setSession({
    access_token: payload.session.access_token,
    refresh_token: payload.session.refresh_token,
  });
  if (error) {
    setClinicApiAccessToken(null);
    if (typeof window !== "undefined") {
      sessionStorage.removeItem("preferred_clinic_id");
      sessionStorage.removeItem("prime-physio:active-clinic-id");
    }
    throw error;
  }

  setClinicApiAccessToken(data.session?.access_token || null);
  const metadata = data.user?.app_metadata || {};
  if (
    metadata.auth_source !== "clinic-scoped-shadow" ||
    metadata.clinic_id !== clinicId ||
    metadata.canonical_email !== payload.canonical_email
  ) {
    await supabase.auth.signOut({ scope: "local" }).catch(() => {});
    if (typeof window !== "undefined") {
      sessionStorage.removeItem("preferred_clinic_id");
      sessionStorage.removeItem("prime-physio:active-clinic-id");
    }
    throw new Error("The clinic session identity could not be verified");
  }

}

export async function activateClinicSession(clinicId: string, expectedEmail: string): Promise<void> {
  const normalizedEmail = expectedEmail.trim().toLowerCase();
  if (!normalizedEmail) throw new Error("A verified login email is required");
  const exchangeKey = `${clinicId}:${normalizedEmail}`;
  const existing = pendingExchanges.get(exchangeKey);
  if (existing) return existing;

  const pending = exchangeClinicSession(clinicId, normalizedEmail);
  pendingExchanges.set(exchangeKey, pending);
  try {
    await pending;
  } finally {
    pendingExchanges.delete(exchangeKey);
  }
}
