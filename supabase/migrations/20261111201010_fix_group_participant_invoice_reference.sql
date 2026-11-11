ALTER TABLE public.appointment_group_participants
  DROP CONSTRAINT IF EXISTS appointment_group_participants_invoice_fk;
ALTER TABLE public.appointment_group_participants
  ADD CONSTRAINT appointment_group_participants_invoice_fk
  FOREIGN KEY (invoice_id) REFERENCES public.invoices(id) ON DELETE SET NULL;
