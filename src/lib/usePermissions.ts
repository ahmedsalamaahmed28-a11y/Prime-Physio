"use client";

import { useEffect, useState } from "react";
import { useAuth } from "./auth";
import { supabase } from "./supabase";

function parsePermissionList(value: unknown): string[] | null {
  if (Array.isArray(value)) return value.filter((item): item is string => typeof item === "string");
  if (typeof value !== "string" || !value.trim()) return null;
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed)
      ? parsed.filter((item): item is string => typeof item === "string")
      : null;
  } catch {
    return null;
  }
}

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
        setCustomPerms(parsed || []);
        setHasOverride(parsed !== null);
      } catch (error) {
        if (!cancelled) {
          console.error("Failed to load permissions", error);
          setCustomPerms([]);
          setHasOverride(false);
        }
      }
    }

    loadPermissions();
    return () => { cancelled = true; };
  }, [user?.email, user?.clinicId]);

  const hasPermission = (action: string) => {
    if (user?.roleKey === "admin") return true;

    if (hasOverride) return customPerms.includes(action);

    if (user?.roleKey === "doctor") {
      return ["edit_emr", "edit_patient"].includes(action);
    }

    if (user?.roleKey === "receptionist") {
      return ["create_invoice", "edit_patient"].includes(action);
    }

    return false;
  };

  return { hasPermission, isAdmin: user?.roleKey === "admin" };
}
