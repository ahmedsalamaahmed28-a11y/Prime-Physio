-- Optimize auth helper evaluation in RLS policies without changing policy logic.
-- Recreate only policies whose expressions call auth/current_setting functions.
DO $$
DECLARE
  p record;
  roles_sql text;
  using_sql text;
  check_sql text;
  stmt text;
BEGIN
  FOR p IN
    SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
    FROM pg_policies
    WHERE schemaname = 'public'
      AND (
        coalesce(qual, '') ~ 'auth\.(uid|jwt|role)\(\)|current_setting\('
        OR coalesce(with_check, '') ~ 'auth\.(uid|jwt|role)\(\)|current_setting\('
      )
  LOOP
    SELECT string_agg(quote_ident(r), ', ' ORDER BY ord)
      INTO roles_sql
    FROM unnest(p.roles) WITH ORDINALITY AS x(r, ord);

    using_sql := p.qual;
    check_sql := p.with_check;

    IF using_sql IS NOT NULL THEN
      using_sql := replace(using_sql, 'auth.uid()', '(select auth.uid())');
      using_sql := replace(using_sql, 'auth.jwt()', '(select auth.jwt())');
      using_sql := replace(using_sql, 'auth.role()', '(select auth.role())');
      using_sql := replace(using_sql, 'current_setting(''request.jwt.claims''::text, true)', '(select current_setting(''request.jwt.claims''::text, true))');
    END IF;

    IF check_sql IS NOT NULL THEN
      check_sql := replace(check_sql, 'auth.uid()', '(select auth.uid())');
      check_sql := replace(check_sql, 'auth.jwt()', '(select auth.jwt())');
      check_sql := replace(check_sql, 'auth.role()', '(select auth.role())');
      check_sql := replace(check_sql, 'current_setting(''request.jwt.claims''::text, true)', '(select current_setting(''request.jwt.claims''::text, true))');
    END IF;

    EXECUTE format('DROP POLICY %I ON %I.%I', p.policyname, p.schemaname, p.tablename);

    stmt := format(
      'CREATE POLICY %I ON %I.%I AS %s FOR %s TO %s',
      p.policyname, p.schemaname, p.tablename, p.permissive, p.cmd, roles_sql
    );
    IF using_sql IS NOT NULL THEN
      stmt := stmt || format(' USING (%s)', using_sql);
    END IF;
    IF check_sql IS NOT NULL THEN
      stmt := stmt || format(' WITH CHECK (%s)', check_sql);
    END IF;
    EXECUTE stmt;
  END LOOP;
END $$;