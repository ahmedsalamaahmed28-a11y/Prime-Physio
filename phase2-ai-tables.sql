-- Phase 2 AI Automation Tables (Clinical & Documentation)

-- 1. ASSESSMENTS TABLE (WF 07)
CREATE TABLE IF NOT EXISTS public.assessments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    clinic_id UUID NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
    patient_id TEXT NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
    appointment_id TEXT REFERENCES public.appointments(id) ON DELETE SET NULL,
    symptoms TEXT,
    rom TEXT,
    strength TEXT,
    special_tests TEXT,
    potential_diagnoses TEXT,
    red_flags TEXT,
    clinical_summary TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. TREATMENT PLANS TABLE (WF 08)
CREATE TABLE IF NOT EXISTS public.treatment_plans (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    clinic_id UUID NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
    patient_id TEXT NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
    assessment_id UUID REFERENCES public.assessments(id) ON DELETE CASCADE,
    goals TEXT,
    session_plan TEXT,
    frequency TEXT,
    duration TEXT,
    home_program TEXT,
    status TEXT DEFAULT 'active',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. SOAP NOTES TABLE (WF 09)
CREATE TABLE IF NOT EXISTS public.soap_notes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    clinic_id UUID NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
    patient_id TEXT NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
    appointment_id TEXT REFERENCES public.appointments(id) ON DELETE CASCADE,
    subjective TEXT,
    objective TEXT,
    assessment TEXT,
    plan TEXT,
    session_summary TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 4. PROGRESS TRACKING TABLE (WF 10)
CREATE TABLE IF NOT EXISTS public.progress_tracking (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    clinic_id UUID NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
    patient_id TEXT NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
    pain_level INTEGER,
    rom_status TEXT,
    strength_status TEXT,
    recovery_score INTEGER, -- 0 to 100
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 5. PATIENT RISKS TABLE (WF 11)
CREATE TABLE IF NOT EXISTS public.patient_risks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    clinic_id UUID NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
    patient_id TEXT NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
    risk_type TEXT, -- e.g., 'no_improvement', 'pain_worsening', 'missed_appointments', 'compliance_issues'
    severity TEXT, -- 'low', 'medium', 'high', 'critical'
    description TEXT,
    status TEXT DEFAULT 'open', -- 'open', 'addressed', 'dismissed'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 6. DISCHARGES TABLE (WF 12)
CREATE TABLE IF NOT EXISTS public.discharges (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    clinic_id UUID NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
    patient_id TEXT NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
    treatment_plan_id UUID REFERENCES public.treatment_plans(id) ON DELETE SET NULL,
    discharge_report TEXT,
    exercise_package TEXT,
    follow_up_schedule TEXT,
    discharge_date DATE DEFAULT CURRENT_DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- ==========================================
-- ROW LEVEL SECURITY (RLS) FOR ALL NEW TABLES
-- ==========================================

-- Enable RLS
ALTER TABLE public.assessments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.treatment_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.soap_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.progress_tracking ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.patient_risks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.discharges ENABLE ROW LEVEL SECURITY;

-- Helper macro for policies
-- (Assuming `is_platform_admin()` and the standard clinic_id check are used)

DO $$
DECLARE
    t_name text;
    tables text[] := ARRAY['assessments', 'treatment_plans', 'soap_notes', 'progress_tracking', 'patient_risks', 'discharges'];
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
