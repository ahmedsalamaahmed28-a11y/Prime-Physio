alter table public.clinic_settings
  add column if not exists public_description text,
  add column if not exists cover_url text,
  add column if not exists whatsapp text,
  add column if not exists website_url text,
  add column if not exists instagram_url text,
  add column if not exists facebook_url text,
  add column if not exists maps_url text;

comment on column public.clinic_settings.public_description is 'Public description displayed on the clinic slug landing page';
comment on column public.clinic_settings.cover_url is 'Public cover image URL for the clinic landing page';
comment on column public.clinic_settings.whatsapp is 'Public WhatsApp contact number';
