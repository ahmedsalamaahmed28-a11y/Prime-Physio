drop policy if exists clinic_logo_delete_own_center on storage.objects;
create policy clinic_logo_delete_own_center
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'branch-logos'
    and (storage.foldername(name))[1] = (public.get_my_clinic_id())::text
    and public.is_clinic_admin()
  );