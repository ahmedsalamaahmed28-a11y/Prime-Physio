UPDATE public.patients p
SET branch_id = b.id
FROM public.branches b
WHERE p.branch_id IS NULL
  AND b.clinic_id = p.clinic_id
  AND b.status = 'active'
  AND (SELECT count(*) FROM public.branches bx WHERE bx.clinic_id = p.clinic_id AND bx.status = 'active') = 1;

UPDATE public.appointments a
SET branch_id = b.id
FROM public.branches b
WHERE a.branch_id IS NULL
  AND b.clinic_id = a.clinic_id
  AND b.status = 'active'
  AND (SELECT count(*) FROM public.branches bx WHERE bx.clinic_id = i.clinic_id AND bx.status = 'active') = 1;

UPDATE public.invoices i
SET branch_id = b.id
FROM public.branches b
WHERE i.branch_id IS NULL
  AND b.clinic_id = i.clinic_id
  AND b.status = 'active'
  AND (SELECT count(*) FROM public.branches bx WHERE bx.clinic_id = a.clinic_id AND bx.status = 'active') = 1;
