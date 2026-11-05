-- Correct clinic-wide notification scoping. The old predicate compared staff.clinic_id
-- to notifications.user_id, so clinic notifications were not visible to their intended users.
DROP POLICY IF EXISTS "Users can read relevant notifications" ON public.notifications;
DROP POLICY IF EXISTS "Users can update their own notifications" ON public.notifications;

CREATE POLICY notifications_read_scoped
ON public.notifications
FOR SELECT TO authenticated
USING (
  user_id = auth.uid()
  OR (user_id IS NULL AND clinic_id = public.get_my_clinic_id())
  OR (user_id IS NULL AND clinic_id IS NULL)
);

CREATE POLICY notifications_update_scoped
ON public.notifications
FOR UPDATE TO authenticated
USING (
  user_id = auth.uid()
  OR (user_id IS NULL AND clinic_id = public.get_my_clinic_id())
)
WITH CHECK (
  user_id = auth.uid()
  OR (user_id IS NULL AND clinic_id = public.get_my_clinic_id())
);