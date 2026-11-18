create index if not exists platform_admin_audit_log_clinic_id_idx
  on public.platform_admin_audit_log (clinic_id);
create index if not exists platform_admin_audit_log_payment_request_id_idx
  on public.platform_admin_audit_log (payment_request_id);