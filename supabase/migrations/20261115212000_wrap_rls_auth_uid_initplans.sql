-- Evaluate auth.uid() once per statement rather than once per row in RLS expressions.
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
        coalesce(qual, '') ~* '\\(auth\\.uid\\(\\)\\s+IS\\s+NOT\\s+NULL\\)'
        OR coalesce(with_check, '') ~* '\\(auth\\.uid\\(\\)\\s+IS\\s+NOT\\s+NULL\\)'
      )
  LOOP
    new_using := CASE
      WHEN policy_row.qual IS NULL THEN NULL
      ELSE regexp_replace(policy_row.qual, '\\(auth\\.uid\\(\\)\\s+IS\\s+NOT\\s+NULL\\)', '((SELECT auth.uid()) IS NOT NULL)', 'gi')
    END;
    new_check := CASE
      WHEN policy_row.with_check IS NULL THEN NULL
      ELSE regexp_replace(policy_row.with_check, '\\(auth\\.uid\\(\\)\\s+IS\\s+NOT\\s+NULL\\)', '((SELECT auth.uid()) IS NOT NULL)', 'gi')
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
