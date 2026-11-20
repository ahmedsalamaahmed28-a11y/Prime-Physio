"use client";

import { useEffect, useState } from "react";
import { useAuth } from "./auth";
import { supabase } from "./supabase";

type ParsedPermissionList = { defined: false } | { defined: true; permissions: string[] };

function parsePermissionList(value: unknown): ParsedPermissionList {
  if (value === null || value === undefined || (typeof value === "string" && !value.trim())) {
    return { defined: false };
  }
  if (Array.isArray(value)) {
    return value.every((item) => typeof item === "string")
      ? { defined: true, permissions: value }
      : { defined: true, permissions: [] };
  }
  if (typeof value !== "string") return { defined: true, permissions: [] };

  try {
    const parsed: unknown = JSON.parse(value);
    return Array.isArray(parsed) && parsed.every((item) => typeof item === "string")
      ? { defined: true, permissions: parsed }
      : { defined: true, permissions: [] };
  } catch {
    // Invalid explicit permission data fails closed instead of restoring role defaults.
    return { defined: true, permissions: [] };
  }
}

function defaultPermissions(roleKey: string | undefined): string[] {
  if (roleKey === "admin") return ["*"];
  if (roleKey === "doctor") {
    return ["view_patients", "view_appointments", "edit_emr", "edit_patient", "view_patient_history"];
  }
  if (roleKey === "receptionist") {
    return ["view_patients", "view_appointments", "view_invoices", "create_invoice", "edit_patient"];
  }
  return [];
}

export function usePermissions() {
  const { user } = useAuth();
  const [customPerms, setCustomPerms] = useState<string[]>([]);
  const [hasOverride, setHasOverride] = useState(false);
  const [serverManageStaff, setServerManageStaff] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function loadPermissions() {
      if (!user?.email || !user.clinicId) {
        setCustomPerms([]);
        setHasOverride(false);
        setServerManageStaff(false);
        return;
      }

      // Resolve permissions through the server-side clinic-scoped RPC for every role.
      // This is authoritative for both owners (all clinic permissions) and staff
      // (their explicit permission list / role defaults), and avoids a direct staff
      // table read failing during auth hydration or incorrectly hiding owner items.
      const permissionKeys = [
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
      ];

      setCustomPerms([]);
      setHasOverride(true);
      setServerManageStaff(false);

      const resolved = await Promise.all(permissionKeys.map(async (permission) => {
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
      const serverPermissions = Object.fromEntries(resolved);
      setCustomPerms(Object.entries(serverPermissions)
        .filter(([, allowed]) => allowed)
        .map(([permission]) => permission));
      setServerManageStaff(serverPermissions.manage_staff === true);
      setHasOverride(true);
    }

    loadPermissions();
    return () => { cancelled = true; };
  }, [user?.email, user?.clinicId]);

  const hasPermission = (action: string) => {
    // A saved explicit list always takes precedence, including for admin-role staff.
    // Keep this ahead of the database fallback until the matching RLS migration is applied.
    if (hasOverride) return customPerms.includes(action) || customPerms.includes("*");

    // Owners without a staff row are recognized by the database permission function.
    if (action === "manage_staff" && serverManageStaff) return true;

    const defaults = defaultPermissions(user?.roleKey);
    return defaults.includes(action) || defaults.includes("*");
  };

  return {
    hasPermission,
    isAdmin: user?.roleKey === "admin" && !hasOverride,
  };
}
