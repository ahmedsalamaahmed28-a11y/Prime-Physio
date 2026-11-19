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

type PermissionOverride = { defined: false } | { defined: true; permissions: string[] };

function parsePermissionOverride(value: unknown): PermissionOverride {
  if (value === null || value === undefined || (typeof value === "string" && !value.trim())) {
    return { defined: false };
  }

  if (Array.isArray(value)) {
    if (!value.every((item) => typeof item === "string")) {
      return { defined: true, permissions: [] };
    }
    return { defined: true, permissions: value };
  }

  if (typeof value !== "string") return { defined: true, permissions: [] };

  try {
    const parsed: unknown = JSON.parse(value);
    if (!Array.isArray(parsed) || !parsed.every((item) => typeof item === "string")) {
      return { defined: true, permissions: [] };
    }
    return { defined: true, permissions: parsed };
  } catch {
    // A malformed explicit override must never restore role-default privileges.
    return { defined: true, permissions: [] };
  }
}

function defaultPermissionsForRole(role: string): readonly string[] {
  if (ADMIN_ROLES.has(role)) return ["*"];
  if (DOCTOR_ROLES.has(role)) {
    return ["view_patients", "view_appointments", "edit_emr", "edit_patient", "view_patient_history"];
  }
  if (RECEPTION_ROLES.has(role)) {
    return ["view_patients", "view_appointments", "view_invoices", "create_invoice", "edit_patient"];
  }
  return [];
}

export function hasStaffPermission(
  staff: StaffPermissionRecord | null | undefined,
  permission: string,
): boolean {
  if (!staff) return false;
  const status = String(staff.status || "").trim().toLowerCase();
  if (["محذوف", "deleted", "inactive", "غير نشط"].includes(status)) return false;

  const role = String(staff.role || "").trim().toLowerCase();
  const override = parsePermissionOverride(staff.permissions);
  const permissions = override.defined
    ? override.permissions
    : defaultPermissionsForRole(role);

  return permissions.includes(permission) || permissions.includes("*");
}

export function canViewPatientHistory(staff: StaffPermissionRecord | null | undefined) {
  // Editing clinical records necessarily requires reading the existing history.
  return hasStaffPermission(staff, "view_patient_history")
    || hasStaffPermission(staff, "edit_emr");
}
