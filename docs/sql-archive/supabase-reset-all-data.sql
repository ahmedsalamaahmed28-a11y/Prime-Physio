-- ============================================================
-- RESET: حذف كل البيانات وجميع الحسابات نهائياً
-- ينفذ في Supabase SQL Editor
-- ============================================================

-- 1. حذف بيانات المرضى والتقييمات
DELETE FROM public.special_tests;
DELETE FROM public.rom_assessments;
DELETE FROM public.mmt_assessments;
DELETE FROM public.gait_tests;
DELETE FROM public.balance_tests;
DELETE FROM public.patient_nutrition;
DELETE FROM public.sessions;
DELETE FROM public.invoices;
DELETE FROM public.appointments;
DELETE FROM public.patients;

-- 2. حذف المواعيد والفواتير والسجلات
DELETE FROM public.audit_logs;
DELETE FROM public.subscriptions;
DELETE FROM public.clinic_settings;

-- 3. حذف الفروع والموظفين والعيادات
DELETE FROM public.branches;
DELETE FROM public.staff;
DELETE FROM public.clinics;

-- 4. حذف حسابات تسجيل الدخول ورموز التحقق
DELETE FROM public.auth_accounts;
DELETE FROM public.verification_codes;

-- 5. حذف الإعدادات المؤقتة والبيانات العامة
DELETE FROM public.app_key_values;

-- 6. حذف حسابات Supabase Auth (البريد الإلكتروني/كلمة المرور)
DELETE FROM auth.users;

-- 7. حذف المشرفين (platform_admins) — هترجع تضيف نفسك بعدين
DELETE FROM public.platform_admins;

-- ============================================================
-- تم مسح كل البيانات بنجاح
-- دلوقتي تقدر تعمل Signup جديد من الموقع مباشرة
-- أول حساب هيسجل هو اللي هيكون المسؤول
-- ============================================================
