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

      try {
        const { data, error } = await supabase.rpc("has_staff_permission", {
          permission_key: "manage_staff",
        });
        if (!cancelled) setServerManageStaff(!error && data === true);
      } catch {
        if (!cancelled) setServerManageStaff(false);
      }

      try {
        const { data, error } = await supabase
          .from("staff")
          .select("permissions")
          .eq("clinic_id", user.clinicId)
          .ilike("email", user.email)
          .maybeSingle();

        if (error) throw error;
        if (cancelled) return;

        const parsed = parsePermissionList(data?.permissions);
        setCustomPerms(parsed.defined ? parsed.permissions : []);
        setHasOverride(parsed.defined);
      } catch (error) {
        if (!cancelled) {
          console.error("Failed to load permissions", error);
          // If permission data cannot be loaded, do not grant role-default privileges.
          setCustomPerms([]);
          setHasOverride(true);
        }
      }
    }

    loadPermissions();
    return () => { cancelled = true; };
  }, [user?.email, user?.clinicId]);

  const hasPermission = (action: string) => {
    // The database permission function is authoritative for staff administration,
    // including the owner account which may not have a staff row.
    if (action === "manage_staff" && serverManageStaff) return true;

    // A saved explicit list always takes precedence for all other permissions.
    if (hasOverride) return customPerms.includes(action) || customPerms.includes("*");

    const defaults = defaultPermissions(user?.roleKey);
    return defaults.includes(action) || defaults.includes("*");
  };

  return {
    hasPermission,
    isAdmin: user?.roleKey === "admin" && !hasOverride,
  };
}
