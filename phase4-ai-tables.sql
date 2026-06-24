-- Phase 4 AI Automation Tables (Analytics, HR, Security)

-- 1. HR ATTENDANCE TABLE (WF 20)
CREATE TABLE IF NOT EXISTS public.hr_attendance (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    clinic_id UUID NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
    staff_id UUID NOT NULL REFERENCES public.staff(id) ON DELETE CASCADE,
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    clock_in TIME,
    clock_out TIME,
    overtime_hours DECIMAL(4,2),
    status TEXT NOT NULL, -- present, absent, late, etc.
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);
CREATE INDEX IF NOT EXISTS hr_attendance_clinic_id_idx ON public.hr_attendance(clinic_id);

-- 2. PAYROLL DRAFTS TABLE (WF 21)
CREATE TABLE IF NOT EXISTS public.payroll_drafts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    clinic_id UUID NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
    staff_id UUID NOT NULL REFERENCES public.staff(id) ON DELETE CASCADE,
    month_year VARCHAR(7) NOT NULL, -- YYYY-MM
    base_salary DECIMAL(10,2) NOT NULL,
    commissions DECIMAL(10,2) DEFAULT 0,
    bonuses DECIMAL(10,2) DEFAULT 0,
    deductions DECIMAL(10,2) DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);
CREATE INDEX IF NOT EXISTS payroll_drafts_clinic_id_idx ON public.payroll_drafts(clinic_id);

-- 3. DAILY REPORTS TABLE (WF 18, 19)
CREATE TABLE IF NOT EXISTS public.daily_reports (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    clinic_id UUID NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
    report_date DATE NOT NULL DEFAULT CURRENT_DATE,
    total_revenue DECIMAL(12,2),
    attendance_count INTEGER,
    new_patients INTEGER,
    missed_visits INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);
CREATE INDEX IF NOT EXISTS daily_reports_clinic_id_idx ON public.daily_reports(clinic_id);

-- 4. EXECUTIVE REPORTS TABLE (WF 26, 27)
CREATE TABLE IF NOT EXISTS public.executive_reports (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    clinic_id UUID NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
    report_month VARCHAR(7), -- YYYY-MM
    revenue_forecast DECIMAL(12,2),
    growth_forecast DECIMAL(5,2),
    capacity_forecast DECIMAL(5,2),
    ai_consultant_notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);
CREATE INDEX IF NOT EXISTS executive_reports_clinic_id_idx ON public.executive_reports(clinic_id);

-- 5. AUDIT LOGS TABLE (WF 28, 29, 30)
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    clinic_id UUID REFERENCES public.clinics(id) ON DELETE CASCADE,
    user_email TEXT,
    action TEXT NOT NULL,
    resource TEXT NOT NULL,
    metadata JSONB,
    ip_address TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);
CREATE INDEX IF NOT EXISTS audit_logs_clinic_id_idx ON public.audit_logs(clinic_id);

-- RLS Policies
ALTER TABLE public.hr_attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payroll_drafts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.executive_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
