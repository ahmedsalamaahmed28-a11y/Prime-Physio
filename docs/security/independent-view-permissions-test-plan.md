# Independent View Permissions — Review & Test Plan

Status: database migrations applied to Supabase production on 2026-11-20. Application code remains on the review branch and has NOT been deployed. No patient, invoice, appointment, or staff business records were changed by the migrations or the transactional tests.

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
| Appointment calendar | `view_appointments`; patient names/IDs require `view_patients` | Insert requires `view_patients` + `edit_appointments` + `create_invoice`; update/cancel requires `view_appointments` + `view_patients` + `edit_appointments`; completing a session requires `view_appointments` + `view_patients` + `edit_emr` |
| Invoice list | `view_invoices` | `create_invoice`, `apply_discount`, `refund_invoice`, `delete_invoice` |
| Analytics aggregates/reports | `view_analytics`; report records are also readable to `manage_reports` users so they can edit them | `manage_reports` |
| Staff list and permission administration | Clinic-scoped staff listing; permission editor gated by `manage_staff` | `manage_staff` (also enforced by the staff RLS write policy) |
| Clinic settings, bank details, and branch logos | Clinic settings remain tenant-readable; sensitive bank details are restricted to settings managers | `manage_settings` (explicitly checked by clinic settings, bank-detail, and branch-logo RLS) |
| Clinical records, evaluations, plans, attachments, and patient-file storage | `view_patients` plus `view_patient_history` (or `edit_emr`, which must read the existing record to edit it) | Direct RLS writes also require `view_patients` plus `edit_emr` / `delete_emr`; server routes enforce the same scopes |
| Full clinic backup and attachment export | `export_data` | `export_data` (explicitly grants whole-clinic export scope) |

Server routes using the service-role client must enforce these permissions and clinic scope themselves. The invoice and analytics APIs return only aggregate/authorized data; invoice mutation responses omit invoice details when the caller lacks `view_invoices`.

## Required verification matrix

| Scenario | Expected result |
|---|---|
| Explicit list contains only `view_patients` | Patient list/detail readable; patient writes denied |
| Explicit list contains only `edit_patient` | Patient GET denied; authorized PATCH succeeds through the server API and returns no patient data |
| Explicit list contains only `edit_emr` | Patient/clinical APIs denied because `view_patients` is absent; no patient data is returned |
| Explicit list contains `view_patients` + `edit_emr`, but not `view_patient_history` | Clinical record read needed for editing is allowed; clinical writes are allowed; other history-only users remain read-only |
| Explicit list contains only `view_appointments` | Calendar API returns anonymized schedule; direct Data API SELECT on appointments is denied without `view_patients`; patient directory is not returned |
| Explicit list contains only `edit_appointments` | Appointment PATCH is authorized by API; appointment GET remains denied. Booking POST also requires `create_invoice` because it creates an invoice |

| Explicit list contains `edit_emr` but not `view_patients` | Patient detail clinical PATCH, initial clinical data during patient creation, attachment operations, clinical routes, and session completion are denied or skipped; no clinical write is made |
| Explicit list contains only `edit_appointments` | Calendar PATCH update/cancel denied because `view_appointments` and `view_patients` are missing; initial appointment creation is denied unless `view_patients` and `create_invoice` are also present |
| Explicit list contains `view_appointments` + `edit_appointments` but not `view_patients` | Calendar PATCH update/cancel denied; appointment DELETE RLS policy denies this permission combination |
| Explicit list contains only `view_invoices` | Invoice list readable; status/amount/delete mutations denied |
| Explicit list contains only `apply_discount` | Invoice PATCH can apply discount through API; invoice list remains denied and response contains no invoice data |
| Explicit list contains only `create_invoice` | Invoice creation allowed where supported; invoice list remains denied |
| Explicit list contains only `view_analytics` | Analytics aggregates/reports readable; patient and invoice detail endpoints remain denied |
| Admin role + explicit empty array | All staff permissions denied, including staff-management writes |
| Admin role + explicit list without `manage_staff` | Cannot open the permission editor or write staff rows |
| Admin role + explicit list without `manage_settings` | Cannot save clinic settings, view/manage bank details, or upload/delete branch logos |
| Admin role + explicit restricted array | Only listed permissions allowed |
| Doctor/receptionist with null permissions | Only documented role defaults apply |
| Malformed permission JSON | All permissions denied; no fallback to role defaults |
| Inactive/deleted staff | All protected reads and writes denied |
| Staff member from Clinic A requests Clinic B patient/invoice/appointment IDs | 403/404; no data returned |
| Direct Data API request bypassing the UI | RLS denies rows without the matching read permission |
| Direct query or write to clinical tables, waitlist, peer reviews, or patient-file Storage without `view_patients` | Denied even if the user has clinical-history/edit permission |
| Direct appointment SELECT without `view_patients` | Denied by RLS so the patient_id/patient_name columns cannot be read around the calendar API redaction |
| Direct appointment INSERT without `view_patients` or `create_invoice` | Denied by RLS; server booking API applies the same patient/invoice scopes |
| Direct insurance-claim write without `view_invoices` | Denied by RLS; invoice creation permission alone does not expose claim rows |
| Clinical read with `view_patients` + `edit_emr` but without `view_patient_history` | Allowed only because EMR editing requires reading the existing clinical record; `view_patients` is still mandatory |
| Patient-linked chat conversation/messages without `view_patients` | Patient conversations hidden/denied; team conversations remain participant-scoped |
| Backup or attachment export without `export_data` | 403; no backup rows or signed file URLs returned |
| Direct API request using a service-role-backed route | Server-side permission and clinic checks deny unauthorized access |
| Clinic owner without a staff row | Owner-level access remains available |
| Session expired | Existing restrictive auth-session guard continues to deny access |

## Production inventory after migration (read-only)

The database currently contains 1 clinic, 1 staff row with a clinic membership, 1 clinic-owner membership, and 2 Auth users. The one clinic staff row has no explicit permission override and therefore uses its role default. The other staff row has no `clinic_id` and is not an active clinic staff membership. Neither staff row currently matches an Auth user by normalized email, so real login-based staff-role tests cannot be performed against the existing staff records. No permission backfill was performed.

## Verification performed on 2026-11-20

### Database permission-function tests

The following tests ran inside separate database transactions. Test staff role/permission values were temporarily changed inside each transaction and rolled back; no persistent staff permission changes were made.

| Scenario | Result |
|---|---|
| Existing clinic staff role defaults | `view_patients`, `view_appointments`, and `view_invoices` allowed; `view_analytics` and `manage_staff` denied |
| Doctor role defaults | Patient/appointment viewing and EMR editing allowed; invoice viewing and staff management denied |
| Receptionist role defaults | Patient/appointment/invoice viewing and invoice creation allowed; EMR editing denied |
| Admin role with no explicit list | Admin defaults allowed the tested permissions |
| Admin role with explicit `[\"view_patients\"]` | Only patient viewing among the tested permissions allowed; invoice, staff, and settings permissions denied |
| Explicit empty list `[]` | All tested permissions denied; RLS patient rows invisible |
| Malformed explicit permission JSON | All tested permissions denied; no role-default fallback |
| Explicit array containing a non-string item | All tested permissions denied; no role-default fallback |
| Explicit wildcard `[\"*\"]` | Tested permissions allowed, including `manage_staff` |
| Inactive staff status | All tested permissions denied |
| Explicit `[\"view_patients\"]` RLS check | One patient row visible; invoice rows invisible |
| Explicit `[\"view_appointments\"]` direct Data API SELECT | Zero patient, appointment, or invoice rows; calendar API separately returns an anonymized schedule |
| Explicit `[\"view_invoices\"]` direct Data API SELECT | Invoice row visible; patient and appointment rows remain invisible |
| Explicit `[\"view_analytics\"]` direct Data API SELECT | Patient, appointment, and invoice table rows remain invisible; analytics access is handled by the permission-checked API |
| Wrong active clinic ID | Clinic context rejected; zero patient rows visible |
| Clinic owner membership | Owner-level permissions remained allowed |

These are database-level JWT-claim simulations, not end-to-end sign-ins through the application. No real staff account in the current Auth inventory maps to the existing staff row.

### Policy and backup checks

- 2 staff rows, 162 prior RLS policy records, and 1 prior permission-function definition were backed up.
- Staff backup comparison returned 0 mismatches.
- All backed-up policy names remained present after the migration (replaced policies retain their names).
- Authenticated users cannot use the `private` schema or read the backup tables.
- Patient and invoice SELECT policies contain their independent `view_*` permissions.
- Appointment SELECT and UPDATE policies require patient visibility as designed.
- An initial review found the appointment DELETE policy lacked `view_patients`; follow-up migration `20261120030350_require_patient_visibility_for_appointment_deletes` corrected it. The live policy was then verified to require `view_appointments`, `view_patients`, and `edit_appointments`.
- Static API review found the calendar PATCH handler, patient clinical PATCH handler, and patient-create subflows were not consistently enforcing the same combined permissions while using the service-role client. The review branch now requires `view_appointments` + `view_patients` for appointment update/cancel, additionally `edit_emr` for session completion, and `view_patients` + `edit_emr` for clinical writes. Initial appointment creation through the patient endpoint now also requires `view_patients` + `edit_appointments` + `create_invoice`.

### Cross-clinic isolation limitation

The production database currently has only one clinic. A true Clinic A → Clinic B read/write attempt cannot be completed without provisioning a second test clinic and test identities. The wrong-active-clinic negative test passed, but it is not a substitute for the requested two-clinic end-to-end isolation test.

### Not yet verified

- Real login-based role tests for separate owner, admin, doctor, receptionist, and restricted staff accounts.
- Cross-clinic A/B access attempts through the application's API and direct Supabase Data API.
- Full Next.js production build and browser-level UI checks. The earlier Vercel preview attempt was blocked by the free deployment daily quota; no paid retry was used.
- A fresh full Supabase Advisor review after the corrective migration.

## Trusted automation exception

The n8n endpoint is a server-to-server integration, not a staff-session API. It is currently scoped by a long `N8N_SECURE_TOKEN` and a fixed `N8N_ALLOWED_CLINIC_ID`, and its actions can read/write clinic data through service role. It remains a separate trusted integration principal; staff `view_*` permissions do not apply to it. Its token must remain private and its clinic scope must be verified independently. The existing owner-only center export endpoint is another deliberate owner-level exception.

## Explicitly not done

- No application code has been merged to `main` or deployed to production.
- No staff permission values were permanently backfilled or changed.
- No patient, invoice, appointment, or employee business records were deleted or edited.
- No second test clinic or test users were created in production.
- No paid services or paid test environments have been used.
