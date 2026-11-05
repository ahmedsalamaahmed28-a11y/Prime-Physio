DROP POLICY IF EXISTS broadcasts_public_read ON public.system_broadcasts;
REVOKE SELECT ON TABLE public.system_broadcasts FROM anon;
GRANT SELECT ON TABLE public.system_broadcasts TO authenticated;

CREATE POLICY broadcasts_clinic_scoped_read ON public.system_broadcasts
FOR SELECT TO authenticated
USING (
  coalesce(jsonb_typeof(target_clinics) = 'array', false)
  AND (
    jsonb_array_length(target_clinics) = 0
    OR target_clinics ? public.get_my_clinic_id()::text
    OR public.is_platform_admin()
  )
);