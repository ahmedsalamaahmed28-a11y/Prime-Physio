import { supabase } from "./supabase";

export interface AuditLog {
  id: string;
  user_email: string;
  user_name: string;
  action: string;
  module: string;
  details: string;
  created_at: string;
}

/**
 * Logs a critical user action to the Audit Trail.
 * @param action The action performed (e.g. "DELETE", "UPDATE", "CREATE")
 * @param module The part of the system (e.g. "INVOICES", "PATIENTS", "EMR")
 * @param details Additional context (e.g. "Deleted invoice #INV-123")
 */
export async function logAuditAction(action: string, module: string, details: string) {
  try {
    // 1. Get current logged in user from Supabase auth
    let userEmail = "system@primephysio.com";
    let userName = "System";

    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user) {
      userEmail = session.user.email || userEmail;
      userName = session.user.user_metadata?.full_name || userName;
    }

    const logEntry: Record<string, any> = {
      id: crypto.randomUUID(),
      user_email: userEmail,
      user_name: userName,
      action,
      details,
      created_at: new Date().toISOString()
    };

    const { error } = await supabase.from("audit_logs").insert([logEntry]);
    if (error) {
      console.warn("Audit Log: Supabase insert failed.", error);
    }

  } catch (err) {
    console.error("Failed to log audit action", err);
  }
}
