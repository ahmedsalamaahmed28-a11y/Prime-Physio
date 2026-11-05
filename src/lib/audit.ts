import { supabase } from "./supabase";

export interface AuditLog {
  id: string;
  user_email: string;
  user_name: string;
  action: string;
  module: string;
  details: string | Record<string, unknown>;
  created_at: string;
}

/**
 * Logs a critical user action to the Audit Trail.
 * The actor and clinic are resolved from the authenticated session and staff row;
 * the browser never supplies an arbitrary clinic_id or audit actor identity.
 */
export async function logAuditAction(action: string, module: string, details: string) {
  try {
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError) throw userError;
    if (!user?.email) {
      console.warn("Audit Log: skipped because there is no authenticated user.");
      return;
    }

    const userEmail = user.email.trim().toLowerCase();
    const { data: staff, error: staffError } = await supabase
      .from("staff")
      .select("clinic_id,name")
      .eq("email", userEmail)
      .maybeSingle();

    if (staffError) throw staffError;

    const logEntry = {
      user_email: userEmail,
      user_name: staff?.name || user.user_metadata?.full_name || userEmail,
      action,
      module,
      entity: module,
      details: { message: details },
      clinic_id: staff?.clinic_id ?? null,
    };

    const { error } = await supabase.from("audit_logs").insert(logEntry);
    if (error) {
      console.warn("Audit Log: Supabase insert failed.", error);
    }
  } catch (err) {
    console.error("Failed to log audit action", err);
  }
}
