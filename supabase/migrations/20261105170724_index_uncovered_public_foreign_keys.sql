-- Add covering indexes for public-schema foreign keys that have no matching
-- leading-column index. This improves tenant-scoped joins and parent deletes.
DO $$
DECLARE
  fk record;
  index_name text;
  index_columns text;
BEGIN
  FOR fk IN
    SELECT c.conrelid AS relation_oid,
           c.conkey,
           cls.relname AS table_name,
           array_agg(att.attname ORDER BY key_col.ordinality) AS column_names
    FROM pg_constraint c
    JOIN pg_class cls ON cls.oid = c.conrelid
    JOIN pg_namespace ns ON ns.oid = cls.relnamespace
    CROSS JOIN LATERAL unnest(c.conkey) WITH ORDINALITY AS key_col(attnum, ordinality)
    JOIN pg_attribute att ON att.attrelid = c.conrelid AND att.attnum = key_col.attnum
    WHERE c.contype = 'f'
      AND ns.nspname = 'public'
    GROUP BY c.conrelid, c.conkey, cls.relname
    HAVING NOT EXISTS (
      SELECT 1
      FROM pg_index i
      WHERE i.indrelid = c.conrelid
        AND i.indisvalid
        AND i.indisready
        AND i.indpred IS NULL
        AND (
          SELECT array_agg(k.attnum::smallint ORDER BY k.ordinality)
          FROM unnest(i.indkey) WITH ORDINALITY AS k(attnum, ordinality)
          WHERE k.ordinality <= cardinality(c.conkey)
        ) = c.conkey
    )
  LOOP
    index_name := left('idx_' || fk.table_name || '_' || array_to_string(fk.column_names, '_') || '_fk', 63);
    SELECT string_agg(format('%I', column_name), ', ')
      INTO index_columns
      FROM unnest(fk.column_names) AS columns(column_name);
    EXECUTE format('CREATE INDEX IF NOT EXISTS %I ON %s (%s)', index_name, fk.relation_oid::regclass, index_columns);
  END LOOP;
END $$;
