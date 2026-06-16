"use client";

import { useEffect, useState } from "react";
import { useAuth } from "./auth";
import { getAppValue } from "./appStorage";

export function usePermissions() {
  const { user } = useAuth();
  const [customPerms, setCustomPerms] = useState<string[]>([]);
  const [hasOverride, setHasOverride] = useState(false);

  useEffect(() => {
    if (!user) return;
    getAppValue<Record<string, string[]>>("custom_permissions", {}).then((parsedMap) => {
      if (parsedMap[user.email] !== undefined) {
        setCustomPerms(parsedMap[user.email]);
        setHasOverride(true);
      } else {
        setHasOverride(false);
      }
    }).catch((e) => {
      console.error("Failed to load permissions", e);
    });
  }, [user]);

  const hasPermission = (action: string) => {
    // 1. Admins have all permissions automatically
    if (user?.roleKey === "admin") return true;
    
    // 2. Custom Individual Permissions override everything strictly
    if (hasOverride) {
      return customPerms.includes(action);
    }

    // 3. Default Role-based Permissions Fallback (if no override)
    if (user?.roleKey === "doctor") {
      if (["edit_emr", "edit_patient"].includes(action)) return true;
    }
    
    if (user?.roleKey === "receptionist") {
      if (["create_invoice"].includes(action)) return true;
    }

    // Otherwise, denied.
    return false;
  };

  return { hasPermission, isAdmin: user?.roleKey === "admin" };
}
