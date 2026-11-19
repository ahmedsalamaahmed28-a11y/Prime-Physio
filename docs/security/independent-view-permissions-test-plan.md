# Independent View Permissions — Review & Test Plan

Status: review branch only. No production migration, deployment, or data mutation has been performed.

## Permission contract

- Clinic owners remain owner-level administrators.
- Staff with a non-empty explicit `permissions` array receive exactly the permissions in that array, regardless of their role name.
- Admin-role staff with no explicit list retain the legacy all-permissions default; an explicit list overrides that default.
- Empty/null permissions use the documented role defaults.
- Malformed JSON, non-array JSON, and arrays containing non-string values fail closed (no permissions).
- The independent read permissions are:
  - `view_patients`
  - `view_appointments`
  - `view_invoices`
  - `view_analytics`
- `manage_reports` is added for creating/updating daily and executive reports.
- No existing staff permission list is automatically expanded. This is intentional: adding read permissions to an explicit list would silently grant visibility the clinic manager may have intentionally withheld. Existing explicit lists must be reviewed and assigned the required `view_*` keys by an authorized clinic owner/manager after approval.

## API behavior

| Resource | Read permission | Write permission(s) |
|---|---|---|
| Patient directory/detail | `view_patients` | `edit_patient`, `edit_emr`, `delete_patient` |
| Appointment calendar | `view_appointments` | `edit_appointments`; clinical fields also require `edit_emr` |
| Invoice list | `view_invoices` | `create_invoice`, `apply_discount`, `refund_invoice`, `delete_invoice` |
| Analytics aggregates/reports | `view_analytics` | `manage_reports` |

Server routes using the service-role client must enforce these permissions and clinic scope themselves. The invoice and analytics APIs return only aggregate/authorized data; invoice mutation responses omit invoice details when the caller lacks `view_invoices`.

## Required verification matrix

| Scenario | Expected result |
|---|---|
| Explicit list contains only `view_patients` | Patient list/detail readable; patient writes denied |
| Explicit list contains only `edit_patient` | Patient GET denied; authorized PATCH succeeds through the server API and returns no patient data |
| Explicit list contains only `view_appointments` | Calendar readable; patient directory not returned |
| Explicit list contains only `edit_appointments` | Appointment PATCH is authorized by API; appointment GET remains denied. Booking POST also requires `create_invoice` because it creates an invoice |
| Explicit list contains only `view_invoices` | Invoice list readable; status/amount/delete mutations denied |
| Explicit list contains only `apply_discount` | Invoice PATCH can apply discount through API; invoice list remains denied and response contains no invoice data |
| Explicit list contains only `create_invoice` | Invoice creation allowed where supported; invoice list remains denied |
| Explicit list contains only `view_analytics` | Analytics aggregates/reports readable; patient and invoice detail endpoints remain denied |
| Admin role + explicit empty array | All staff permissions denied |
| Admin role + explicit restricted array | Only listed permissions allowed |
| Doctor/receptionist with null permissions | Only documented role defaults apply |
| Malformed permission JSON | All permissions denied; no fallback to role defaults |
| Inactive/deleted staff | All protected reads and writes denied |
| Staff member from Clinic A requests Clinic B patient/invoice/appointment IDs | 403/404; no data returned |
| Direct Data API request bypassing the UI | RLS denies rows without the matching read permission |
| Direct API request using a service-role-backed route | Server-side permission and clinic checks deny unauthorized access |
| Clinic owner without a staff row | Owner-level access remains available |
| Session expired | Existing restrictive auth-session guard continues to deny access |

## Current production permission inventory (read-only)

The current database inspection returned 2 staff rows and 0 non-empty explicit permission lists. Both rows currently rely on role defaults; one admin-role row has no clinic_id, so it is not treated as an ordinary clinic staff membership. No staff permission backfill is required for the current inventory. This count should be rechecked immediately before the eventual migration.

## Data preservation checks

Before migration:
1. Confirm backup row count equals the number of staff rows.
2. Confirm every targeted policy has a matching row in the policy backup table.
3. Confirm the previous `has_staff_permission(text)` function definition is stored.
4. Preview which explicit staff lists do not contain the new `view_*` permissions.
5. Confirm that the migration does not UPDATE or DELETE any patient, invoice, appointment, or staff row.

After migration in a non-production test database:
1. Run all permission matrix cases.
2. Verify cross-clinic isolation with two test clinics and test users.
3. Verify UPDATE paths through the server APIs, because PostgreSQL UPDATE via the Data API also requires a matching SELECT policy.
4. Run Supabase security advisors and inspect the resulting RLS policy inventory.
5. Verify that subscriptions, clinic bank details, payroll permissions, platform-admin policies, and auth-session expiry guards remain unchanged.

## Explicitly not done

- No migration has been applied.
- No staff permission values have been backfilled or changed.
- No patient, invoice, appointment, or employee records have been deleted or edited.
- No production deployment has been started.
- No paid services or paid test environments have been used.
