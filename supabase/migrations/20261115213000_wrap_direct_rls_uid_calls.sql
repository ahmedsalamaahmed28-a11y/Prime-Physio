-- Convert direct auth.uid() checks into scalar init plans so they are evaluated once per statement.
DO $$
DECLARE
  policy_row record;
  new_using text;
  new_check text;
  alter_sql text;
BEGIN
  FOR policy_row IN
    SELECT schemaname, tablename, policyname, qual, with_check
    FROM pg_policies
    WHERE schemaname = 'public'
      AND (
        position('(auth.uid() IS NOT NULL)' in coalesce(qual, '')) > 0
        OR position('(auth.uid() IS NOT NULL)' in coalesce(with_check, '')) > 0
      )
  LOOP
    new_using := CASE
      WHEN policy_row.qual IS NULL THEN NULL
      ELSE replace(policy_row.qual, '(auth.uid() IS NOT NULL)', '((SELECT auth.uid()) IS NOT NULL)')
    END;
    new_check := CASE
      WHEN policy_row.with_check IS NULL THEN NULL
      ELSE replace(policy_row.with_check, '(auth.uid() IS NOT NULL)', '((SELECT auth.uid()) IS NOT NULL)')
    END;

    alter_sql := format('ALTER POLICY %I ON %I.%I',
      policy_row.policyname, policy_row.schemaname, policy_row.tablename);
    IF new_using IS NOT NULL THEN
      alter_sql := alter_sql || format(' USING (%s)', new_using);
    END IF;
    IF new_check IS NOT NULL THEN
      alter_sql := alter_sql || format(' WITH CHECK (%s)', new_check);
    END IF;
    EXECUTE alter_sql;
  END LOOP;
END
$$;
