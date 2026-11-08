export interface StaffPermissionRecord {
  role?: string | null;
  permissions?: unknown;
  status?: string | null;
}

const ADMIN_ROLES = new Set([
  "admin",
  "clinic_admin",
  "مدير العيادة",
  "مدير العياده",
  "مدير العياره",
  "مدير النظام",
]);

const DOCTOR_ROLES = new Set([
  "doctor",
  "استشاري علاج طبيعي",
  "أخصائي علاج طبيعي",
  "ممارس علاج طبيعي",
]);

const RECEPTION_ROLES = new Set([
  "receptionist",
  "موظف استقبال",
  "موظفة استقبال رئيسية",
]);

function parsePermissionOverride(value: unknown): string[] | null {
  if (Array.isArray(value)) {
    return value.filter((item): item is string => typeof item === "string");
  }
  if (typeof value !== "string" || !value.trim()) return null;
  try {
    const parsed: unknown = JSON.parse(value);
    return Array.isArray(parsed)
      ? parsed.filter((item): item is string => typeof item === "string")
      : null;
  } catch {
    return null;
  }
}

export function hasStaffPermission(
  staff: StaffPermissionRecord | null | undefined,
  permission: string,
): boolean {
  if (!staff || staff.status === "محذوف") return false;
  const role = staff.role || "";
  if (ADMIN_ROLES.has(role)) return true;

  const override = parsePermissionOverride(staff.permissions);
  if (override !== null) return override.includes(permission);

  if (DOCTOR_ROLES.has(role)) {
    return ["edit_emr", "edit_patient", "view_patient_history"].includes(permission);
  }
  if (RECEPTION_ROLES.has(role)) {
    return ["create_invoice", "edit_patient"].includes(permission);
  }
  return false;
}

export function canViewPatientHistory(staff: StaffPermissionRecord | null | undefined) {
  return hasStaffPermission(staff, "view_patient_history")
    || hasStaffPermission(staff, "edit_emr");
}
