-- Phase 1 AI Automation Tables

-- 1. LEADS TABLE (WF 02)
CREATE TABLE IF NOT EXISTS public.leads (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    clinic_id UUID NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    phone TEXT NOT NULL,
    source TEXT DEFAULT 'unknown',
    status TEXT DEFAULT 'new',
    score INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- RLS for leads
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow platform admins full access to leads"
ON public.leads
FOR ALL
TO authenticated
USING (is_platform_admin());

CREATE POLICY "Allow clinic staff to view their leads"
ON public.leads
FOR SELECT
TO authenticated
USING (clinic_id IN (
  SELECT c.id FROM clinics c
  JOIN staff s ON s.clinic_id = c.id
  WHERE s.email = auth.jwt() ->> 'email'
));

CREATE POLICY "Allow clinic staff to insert leads"
ON public.leads
FOR INSERT
TO authenticated
WITH CHECK (clinic_id IN (
  SELECT c.id FROM clinics c
  JOIN staff s ON s.clinic_id = c.id
  WHERE s.email = auth.jwt() ->> 'email'
));

CREATE POLICY "Allow clinic staff to update leads"
ON public.leads
FOR UPDATE
TO authenticated
USING (clinic_id IN (
  SELECT c.id FROM clinics c
  JOIN staff s ON s.clinic_id = c.id
  WHERE s.email = auth.jwt() ->> 'email'
));

-- 2. WAITLIST TABLE (WF 05)
CREATE TABLE IF NOT EXISTS public.waitlist (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    clinic_id UUID NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
    patient_id TEXT NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
    requested_date DATE,
    status TEXT DEFAULT 'waiting', -- waiting, offered, booked, cancelled
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- RLS for waitlist
ALTER TABLE public.waitlist ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow platform admins full access to waitlist"
ON public.waitlist
FOR ALL
TO authenticated
USING (is_platform_admin());

CREATE POLICY "Allow clinic staff to view their waitlist"
ON public.waitlist
FOR SELECT
TO authenticated
USING (clinic_id IN (
  SELECT c.id FROM clinics c
  JOIN staff s ON s.clinic_id = c.id
  WHERE s.email = auth.jwt() ->> 'email'
));

CREATE POLICY "Allow clinic staff to insert waitlist"
ON public.waitlist
FOR INSERT
TO authenticated
WITH CHECK (clinic_id IN (
  SELECT c.id FROM clinics c
  JOIN staff s ON s.clinic_id = c.id
  WHERE s.email = auth.jwt() ->> 'email'
));

CREATE POLICY "Allow clinic staff to update waitlist"
ON public.waitlist
FOR UPDATE
TO authenticated
USING (clinic_id IN (
  SELECT c.id FROM clinics c
  JOIN staff s ON s.clinic_id = c.id
  WHERE s.email = auth.jwt() ->> 'email'
));
