ALTER TABLE public.branches
  ADD CONSTRAINT branches_id_clinic_id_unique UNIQUE (id, clinic_id);

ALTER TABLE public.patients ADD COLUMN branch_id uuid NULL;
ALTER TABLE public.invoices ADD COLUMN branch_id uuid NULL;

ALTER TABLE public.patients
  ADD CONSTRAINT patients_branch_clinic_fk
  FOREIGN KEY (branch_id, clinic_id) REFERENCES public.branches (id, clinic_id);
ALTER TABLE public.invoices
  ADD CONSTRAINT invoices_branch_clinic_fk
  FOREIGN KEY (branch_id, clinic_id) REFERENCES public.branches (id, clinic_id);
ALTER TABLE public.appointments
  ADD CONSTRAINT appointments_branch_clinic_fk
  FOREIGN KEY (branch_id, clinic_id) REFERENCES public.branches (id, clinic_id);
ALTER TABLE public.appointment_rooms
  ADD CONSTRAINT appointment_rooms_branch_clinic_fk
  FOREIGN KEY (branch_id, clinic_id) REFERENCES public.branches (id, clinic_id);

WITH single_branch AS (
  SELECT clinic_id, min(id::text)::uuid AS branch_id
  FROM public.branches GROUP BY clinic_id HAVING count(*) = 1
)
UPDATE public.patients p SET branch_id = b.branch_id
FROM single_branch b WHERE p.clinic_id = b.clinic_id AND p.branch_id IS NULL;

WITH single_branch AS (
  SELECT clinic_id, min(id::text)::uuid AS branch_id
  FROM public.branches GROUP BY clinic_id HAVING count(*) = 1
)
UPDATE public.invoices i SET branch_id = b.branch_id
FROM single_branch b WHERE i.clinic_id = b.clinic_id AND i.branch_id IS NULL;

CREATE INDEX patients_clinic_branch_idx ON public.patients (clinic_id, branch_id);
CREATE INDEX invoices_clinic_branch_idx ON public.invoices (clinic_id, branch_id);
CREATE INDEX appointments_clinic_branch_idx ON public.appointments (clinic_id, branch_id);