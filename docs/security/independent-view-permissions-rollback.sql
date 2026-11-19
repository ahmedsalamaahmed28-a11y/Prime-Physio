-- REVIEW DRAFT ONLY — DO NOT RUN unless reverting the approved permissions migration.
-- Restores the previous has_staff_permission(text) definition and every backed-up policy
-- for the tables included in independent-view-permissions-review.sql.
-- Staff permission values were not modified by that migration, so no staff-row restore is needed.

begin;

do $rollback$
declare
  p record;
  v_roles text;
  v_sql text;
  v_function_definition text;
begin
  for p in
    select *
    from private.rls_policies_backup_20261119
    order by tablename, policyname
  loop
    execute pg_catalog.format(
      'drop policy if exists %I on %I.%I',
      p.policyname,
      p.schemaname,
      p.tablename
    );

    select pg_catalog.string_agg(
      case
        when role_name::text = 'public' then 'PUBLIC'
        else pg_catalog.format('%I', role_name::text)
      end,
      ', '
    )
    into v_roles
    from pg_catalog.unnest(p.roles) as roles(role_name);

    if v_roles is null or v_roles = '' then
      v_roles := 'PUBLIC';
    end if;

    v_sql := pg_catalog.format(
      'create policy %I on %I.%I as %s for %s to %s',
      p.policyname,
      p.schemaname,
      p.tablename,
      p.permissive,
      p.cmd,
      v_roles
    );

    if p.qual is not null then
      v_sql := v_sql || pg_catalog.format(' using (%s)', p.qual);
    end if;

    if p.with_check is not null then
      v_sql := v_sql || pg_catalog.format(' with check (%s)', p.with_check);
    end if;

    execute v_sql;
  end loop;

  select definition
    into v_function_definition
  from private.permission_function_backup_20261119
  where function_name = 'public.has_staff_permission(text)';

  if v_function_definition is null then
    raise exception 'Rollback stopped: previous has_staff_permission(text) definition was not found in the backup.';
  end if;

  execute v_function_definition;
end;
$rollback$;

commit;
