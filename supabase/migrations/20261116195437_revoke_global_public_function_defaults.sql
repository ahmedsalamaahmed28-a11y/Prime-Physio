-- PostgreSQL's built-in default grants EXECUTE on new functions to PUBLIC.
-- A schema-scoped REVOKE cannot cancel that global default, so revoke it globally
-- for functions created by the postgres role. Existing function grants are unchanged.
alter default privileges for role postgres
  revoke execute on functions from public;
