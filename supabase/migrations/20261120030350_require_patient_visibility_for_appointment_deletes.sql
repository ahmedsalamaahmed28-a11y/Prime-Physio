-- Applied to production on 2026-11-20.
-- Appointment deletion must require patient visibility as well as schedule/edit rights.
begin;

drop policy if exists appointments_clinic_delete on public.appointments;
create policy appointments_clinic_delete
on public.appointments
for delete
to authenticated
using (
  auth.uid() is not null
  and clinic_id = public.get_my_clinic_id()
  and public.has_staff_permission('view_appointments')
  and public.has_staff_permission('view_patients')
  and public.has_staff_permission('edit_appointments')
);

commit;
