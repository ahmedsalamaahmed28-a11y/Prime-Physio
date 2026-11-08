-- Generate a stable, URL-safe clinic slug on the database side.
-- The unique clinics_slug_key index remains the final concurrency-safe guard.
CREATE OR REPLACE FUNCTION public.generate_clinic_slug()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = pg_catalog, public
AS $$
DECLARE
  base_slug text;
  suffix text;
BEGIN
  IF NEW.slug IS NOT NULL AND btrim(NEW.slug) <> '' THEN
    NEW.slug := lower(btrim(NEW.slug));
    IF NEW.slug !~ '^[a-z0-9]+(-[a-z0-9]+)*$' OR length(NEW.slug) > 80 THEN
      RAISE EXCEPTION 'Invalid clinic slug' USING ERRCODE = '22023';
    END IF;
    RETURN NEW;
  END IF;

  base_slug := lower(coalesce(NEW.name_en, NEW.name, ''));
  base_slug := regexp_replace(base_slug, '[^a-z0-9]+', '-', 'g');
  base_slug := trim(both '-' from base_slug);
  base_slug := left(base_slug, 48);
  base_slug := trim(both '-' from base_slug);

  -- Arabic-only or otherwise non-Latin names still receive a stable URL.
  suffix := substr(replace(coalesce(NEW.id, gen_random_uuid())::text, '-', ''), 1, 8);
  IF base_slug = '' THEN
    NEW.slug := 'clinic-' || suffix;
  ELSE
    NEW.slug := base_slug || '-' || suffix;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS clinics_generate_slug_before_write ON public.clinics;
CREATE TRIGGER clinics_generate_slug_before_write
BEFORE INSERT OR UPDATE OF name, name_en, slug
ON public.clinics
FOR EACH ROW
EXECUTE FUNCTION public.generate_clinic_slug();

COMMENT ON FUNCTION public.generate_clinic_slug() IS
'Generates a URL-safe clinic slug server-side when one is not supplied; UUID suffix guarantees stable uniqueness for generated slugs.';
