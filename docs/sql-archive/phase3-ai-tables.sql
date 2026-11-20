-- Phase 3 AI Automation Tables (Financial & Marketing)

-- 1. INVOICES TABLE (WF 13)
-- The invoices table already exists, so we just add missing columns if needed.
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS payment_method TEXT;

-- 2. RECOVERY LOGS TABLE (WF 14)
CREATE TABLE IF NOT EXISTS public.recovery_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    clinic_id UUID NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
    invoice_id TEXT NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE,
    patient_id TEXT NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
    reminder_type TEXT, -- 'whatsapp', 'sms', 'email', 'call'
    escalation_level INTEGER DEFAULT 1,
    message_sent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. INSURANCE CLAIMS TABLE (WF 15)
CREATE TABLE IF NOT EXISTS public.insurance_claims (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    clinic_id UUID NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
    patient_id TEXT NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
    invoice_id TEXT REFERENCES public.invoices(id) ON DELETE CASCADE,
    provider TEXT NOT NULL,
    claim_amount NUMERIC(10, 2) NOT NULL,
    status TEXT DEFAULT 'submitted', -- 'submitted', 'approved', 'rejected', 'partially_paid'
    approval_date DATE,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 4. MARKETING CAMPAIGNS TABLE (WF 16 & WF 17)
CREATE TABLE IF NOT EXISTS public.marketing_campaigns (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    clinic_id UUID NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
    campaign_name TEXT NOT NULL,
    campaign_type TEXT, -- 'retention', 'reactivation', 'promotion', 'newsletter'
    status TEXT DEFAULT 'draft', -- 'draft', 'active', 'completed'
    target_audience TEXT,
    message_copy TEXT,
    sent_count INTEGER DEFAULT 0,
    conversion_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 5. REFERRALS TABLE (WF 18)
CREATE TABLE IF NOT EXISTS public.referrals (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    clinic_id UUID NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
    referrer_id TEXT NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
    referred_patient_id TEXT REFERENCES public.patients(id) ON DELETE SET NULL,
    referral_code TEXT,
    reward_status TEXT DEFAULT 'pending', -- 'pending', 'rewarded'
    reward_type TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- ==========================================
-- ROW LEVEL SECURITY (RLS) FOR ALL NEW TABLES
-- ==========================================

-- Enable RLS
ALTER TABLE public.recovery_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.insurance_claims ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.marketing_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE
    t_name text;
    tables text[] := ARRAY['recovery_logs', 'insurance_claims', 'marketing_campaigns', 'referrals'];
BEGIN
    FOREACH t_name IN ARRAY tables LOOP
        -- Admin Access
        EXECUTE format('CREATE POLICY "Allow platform admins full access to %I" ON public.%I FOR ALL TO authenticated USING (is_platform_admin());', t_name, t_name);
        
        -- Clinic Staff Select
        EXECUTE format('CREATE POLICY "Allow clinic staff to view their %I" ON public.%I FOR SELECT TO authenticated USING (clinic_id IN (SELECT c.id FROM clinics c JOIN staff s ON s.clinic_id = c.id WHERE s.email = auth.jwt() ->> ''email''));', t_name, t_name);
        
        -- Clinic Staff Insert
        EXECUTE format('CREATE POLICY "Allow clinic staff to insert %I" ON public.%I FOR INSERT TO authenticated WITH CHECK (clinic_id IN (SELECT c.id FROM clinics c JOIN staff s ON s.clinic_id = c.id WHERE s.email = auth.jwt() ->> ''email''));', t_name, t_name);
        
        -- Clinic Staff Update
        EXECUTE format('CREATE POLICY "Allow clinic staff to update %I" ON public.%I FOR UPDATE TO authenticated USING (clinic_id IN (SELECT c.id FROM clinics c JOIN staff s ON s.clinic_id = c.id WHERE s.email = auth.jwt() ->> ''email''));', t_name, t_name);
    END LOOP;
END $$;
