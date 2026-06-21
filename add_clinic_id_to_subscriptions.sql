-- ============================================================
-- إضافة clinic_id لجدول subscriptions وإصلاح الـ redirect loop
-- ينفذ في Supabase SQL Editor
-- ============================================================

-- 1. إضافة عمود clinic_id
alter table public.subscriptions 
add column if not exists clinic_id uuid references public.clinics(id) on delete cascade;

-- 2. فهرس للبحث السريع
create index if not exists idx_subscriptions_clinic_id on public.subscriptions(clinic_id);

-- 3. تحديث الاشتراكات الموجودة - ربطها بالعيادات عبر الإيميل
update public.subscriptions s
set clinic_id = c.id
from public.clinics c
where s.clinic_id is null
  and c.admin_email = s.user_email;

-- 4. التحقق
select id, user_email, clinic_id, plan_name, status
from public.subscriptions
order by created_at desc
limit 10;