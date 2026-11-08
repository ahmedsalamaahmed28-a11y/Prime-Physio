# Prime Physio — PTset Feature Parity Plan

Audit date: 2026-11-08  
Comparison source: PTset public Arabic/English product pages, feature page, plans and changelog.  
Implementation branch: feat/ptset-feature-parity

## Executive finding

Prime Physio already has a substantial clinical foundation: patient records, assessments (ROM/MMT/gait/balance/special tests), SOAP notes, treatment plans, session progress, risk flags, discharge records, clinical protocols, staff permissions, branches, invoices, notifications, and clinic backup export.

The main gap is operational completeness and workflow integration. Several database entities exist without a complete user-facing workflow, and some existing reporting is not yet based on authoritative financial/session records.

## PTset comparison matrix

| PTset capability | Prime Physio baseline | Gap / action |
|---|---|---|
| Therapist and room scheduling | Calendar and appointment API; room and therapist conflict protection exist in DB/API | Add day/week views, therapist/room filters, drag-and-drop rescheduling, room selection in booking UI |
| Repeated bookings | Not exposed in booking UI/API | Add safe recurring-series creation, validation and rollback |
| Group sessions | No complete group-session model found | Add group appointment + participant model, shared attendance and per-patient clinical records |
| Case records and evaluations | Patients, EMR, assessments, SOAP, clinical tests exist | Add due-date tracking and evaluation reminders |
| Treatment programs and task ratings | Treatment plans, target exercises and progress tracking exist | Add session task sheets, therapist ratings and longitudinal completion reports |
| Patient progress reports | Progress tracking and discharge records exist | Add printable/shareable patient-facing progress report with permission-safe clinical content |
| Packages and balances | Patient package fields and invoices exist | Add session-credit ledger, partial payments, package balance and expiry rules |
| Multiple price lists / insurance contracts | Insurance claims and clinic services exist | Add configurable price lists, payer contracts and per-service pricing |
| Daily dues, receipts and expenses | Invoices exist; expenses/dues workflow incomplete | Add receipts, expense records, receivables ageing and reconciliation |
| QR attendance | Attendance table exists; HR page currently only displays records | Add signed, expiring QR check-in/out flow and attendance policy |
| Payroll and performance pay | Payroll draft table exists; HR page displays drafts | Add pay rules (fixed/session, percentage, duration), approved adjustments, payroll calculation and payslips |
| Leave and excuse requests | No complete staff request workflow verified | Add request, approval, audit trail and payroll impact |
| Staff status board and action center | Partial dashboard/notifications | Add live staff status, pending actions and overdue operational tasks |
| Role groups and presets | Permission list and per-staff overrides exist | Add role templates, preview-before-apply, version history and safe undo |
| Multiple branches | Branch schema and branch links exist | Add cross-branch owner dashboard, branch comparison and branch-level KPIs |
| Inventory / warehouse | Permission key exists, but no complete inventory workflow verified | Add items, stock movements, purchasing, counts, reorder alerts and audit trail |
| Patient satisfaction / service quality | Peer review table exists for internal review | Add patient feedback flow, service-quality trends and therapist review workflow |
| Arabic/English and mobile | Arabic/English context and PWA support exist | Audit all new workflows for RTL, responsive layouts and installability |
| Export and backups | Clinic backup export endpoint exists | Add restore/validation workflow, scheduled backup policy and Excel export where appropriate |

## Immediate defects identified during code review

1. Analytics currently estimates revenue using hard-coded package amounts instead of paid invoice records; session totals are derived from patient counters rather than completed session records.
2. Billing inferred the payment method from invoice status instead of reading the persisted payment method; currency parsing discarded decimal precision and did not normalize Arabic-Indic digits.
3. HR currently displays attendance and payroll drafts but does not provide a complete QR check-in/out or payroll approval workflow.
4. Calendar UI is month-oriented and does not expose the full room/therapist scheduling capabilities already partly supported by the backend.
5. The public centers page contains static example counts and a search field that is not connected to a verified center-search flow; this should not be confused with the authenticated multi-branch owner dashboard.

## Implementation phases

### Phase 1 — correctness and scheduling
- Make analytics derive collections from paid invoices and completed sessions.
- Make billing use stored payment methods and robust amount parsing.
- Build room/therapist day-week scheduling and rescheduling.
- Add recurring appointments with conflict checks and all-or-nothing cleanup.
- Design group sessions with a participant table and per-patient session records.

### Phase 2 — financial operations
- Define price lists and payer/insurance contracts.
- Implement package-credit ledger and partial payments.
- Add receipts, expenses, outstanding dues and ageing reports.
- Reconcile billing dashboard, analytics and branch financial totals against invoice/payment records.

### Phase 3 — HR and payroll
- Add signed, expiring attendance QR tokens and secure scan endpoint.
- Add clock-in/out, lateness, overtime, leave and excuse requests.
- Add versioned pay rules and transparent calculations for fixed/session, percentage and duration-based pay.
- Add payroll review/approval, payslips and audit events.

### Phase 4 — operations, quality and inventory
- Add daily tasks/action center and staff status.
- Add permission groups/presets with preview and undo history.
- Add patient feedback and internal quality review.
- Add inventory, purchases, stock movements, counts and low-stock alerts.

### Phase 5 — branches, patient access and resilience
- Add owner-level branch comparison and branch setup checklist.
- Add patient-facing progress reports and approved home-program sharing.
- Add export/restore validation, scheduled backup controls and operational monitoring.
- Complete mobile/PWA, RTL and notification QA.

## Safety and rollout rules

- All implementation work is isolated on feat/ptset-feature-parity; production main is not modified.
- No production database schema or data changes are applied as part of this comparison.
- Schema work must be delivered as reviewed migrations, with tenant isolation, RLS, permission checks, audit coverage and rollback strategy.
- Financial totals must be derived from persisted transactions, never hard-coded package prices.
- Clinical records must remain inaccessible to roles without explicit EMR/history permission.
- Group and recurring scheduling must preserve conflict protection and must not create partial financial records.
- Every phase must pass a Vercel preview build and targeted workflow tests before a pull request is merged.
