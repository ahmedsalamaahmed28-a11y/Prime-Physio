"use client";

import { useEffect, useState } from "react";
import { useAuth } from "./auth";
import { supabase } from "./supabase";

const PERMISSION_KEYS = [
  "view_patients",
  "view_appointments",
  "view_invoices",
  "create_invoice",
  "edit_patient",
  "edit_emr",
  "view_patient_history",
  "manage_staff",
  "view_analytics",
  "manage_settings",
  "edit_appointments",
  "apply_discount",
  "refund_invoice",
  "delete_invoice",
  "delete_patient",
  "delete_emr",
] as const;

export function usePermissions() {
  const { user } = useAuth();
  const [customPerms, setCustomPerms] = useState<string[]>([]);
  const [hasOverride, setHasOverride] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function loadPermissions() {
      if (!user?.email || !user.clinicId) {
        setCustomPerms([]);
        setHasOverride(false);
        return;
      }

      // Resolve permissions through the server-side clinic-scoped RPC for every role.
      // This is authoritative for both owners (all clinic permissions) and staff
      // (their explicit permission list / role defaults), and avoids a direct staff
      // table read failing during auth hydration or incorrectly hiding owner items.
      setCustomPerms([]);
      setHasOverride(true);

      const resolved = await Promise.all(PERMISSION_KEYS.map(async (permission) => {
        try {
          const { data, error } = await supabase.rpc("has_staff_permission", {
            permission_key: permission,
          });
          return [permission, !error && data === true] as const;
        } catch {
          return [permission, false] as const;
        }
      }));

      if (cancelled) return;
      setCustomPerms(resolved
        .filter(([, allowed]) => allowed)
        .map(([permission]) => permission));
      setHasOverride(true);
    }

    void loadPermissions();
    return () => { cancelled = true; };
  }, [user?.email, user?.clinicId]);

  const hasPermission = (action: string) => {
    // Explicit permissions returned by the tenant-scoped RPC always win.
    if (hasOverride) return customPerms.includes(action) || customPerms.includes("*");

    if (user?.roleKey === "admin") return true;
    if (user?.roleKey === "doctor") {
      return ["view_patients", "view_appointments", "edit_emr", "edit_patient", "view_patient_history"].includes(action);
    }
    if (user?.roleKey === "receptionist") {
      return ["view_patients", "view_appointments", "view_invoices", "create_invoice", "edit_patient"].includes(action);
    }
    return false;
  };

  return {
    hasPermission,
    isAdmin: user?.roleKey === "admin",
  };
}
