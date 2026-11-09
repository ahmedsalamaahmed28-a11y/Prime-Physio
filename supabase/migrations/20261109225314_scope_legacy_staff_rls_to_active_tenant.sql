-- Replace legacy direct staff joins with the verified active tenant resolver.
-- This is required for owners who have one global staff identity and many center memberships.

drop policy if exists "Allow clinic staff to view their audit_logs" on public.audit_logs;
create policy "Allow clinic staff to view their audit_logs" on public.audit_logs
for select to authenticated using (auth.uid() is not null and clinic_id = public.get_my_clinic_id());

drop policy if exists "Allow clinic staff to insert daily_reports" on public.daily_reports;
create policy "Allow clinic staff to insert daily_reports" on public.daily_reports
for insert to authenticated with check (auth.uid() is not null and clinic_id = public.get_my_clinic_id());
drop policy if exists "Allow clinic staff to update daily_reports" on public.daily_reports;
create policy "Allow clinic staff to update daily_reports" on public.daily_reports
for update to authenticated using (auth.uid() is not null and clinic_id = public.get_my_clinic_id())
with check (auth.uid() is not null and clinic_id = public.get_my_clinic_id());
drop policy if exists "Allow clinic staff to view their daily_reports" on public.daily_reports;
create policy "Allow clinic staff to view their daily_reports" on public.daily_reports
for select to authenticated using (auth.uid() is not null and clinic_id = public.get_my_clinic_id());

drop policy if exists "Allow clinic staff to insert discharges" on public.discharges;
create policy "Allow clinic staff to insert discharges" on public.discharges
for insert to authenticated with check (auth.uid() is not null and clinic_id = public.get_my_clinic_id());
drop policy if exists "Allow clinic staff to update discharges" on public.discharges;
create policy "Allow clinic staff to update discharges" on public.discharges
for update to authenticated using (auth.uid() is not null and clinic_id = public.get_my_clinic_id())
with check (auth.uid() is not null and clinic_id = public.get_my_clinic_id());
drop policy if exists "Allow clinic staff to view their discharges" on public.discharges;
create policy "Allow clinic staff to view their discharges" on public.discharges
for select to authenticated using (auth.uid() is not null and clinic_id = public.get_my_clinic_id());

drop policy if exists "Allow clinic staff to insert executive_reports" on public.executive_reports;
create policy "Allow clinic staff to insert executive_reports" on public.executive_reports
for insert to authenticated with check (auth.uid() is not null and clinic_id = public.get_my_clinic_id());
drop policy if exists "Allow clinic staff to update executive_reports" on public.executive_reports;
create policy "Allow clinic staff to update executive_reports" on public.executive_reports
for update to authenticated using (auth.uid() is not null and clinic_id = public.get_my_clinic_id())
with check (auth.uid() is not null and clinic_id = public.get_my_clinic_id());
drop policy if exists "Allow clinic staff to view their executive_reports" on public.executive_reports;
create policy "Allow clinic staff to view their executive_reports" on public.executive_reports
for select to authenticated using (auth.uid() is not null and clinic_id = public.get_my_clinic_id());

drop policy if exists "Allow clinic staff to insert insurance_claims" on public.insurance_claims;
create policy "Allow clinic staff to insert insurance_claims" on public.insurance_claims
for insert to authenticated with check (auth.uid() is not null and clinic_id = public.get_my_clinic_id());
drop policy if exists "Allow clinic staff to update insurance_claims" on public.insurance_claims;
create policy "Allow clinic staff to update insurance_claims" on public.insurance_claims
for update to authenticated using (auth.uid() is not null and clinic_id = public.get_my_clinic_id())
with check (auth.uid() is not null and clinic_id = public.get_my_clinic_id());
drop policy if exists "Allow clinic staff to view their insurance_claims" on public.insurance_claims;
create policy "Allow clinic staff to view their insurance_claims" on public.insurance_claims
for select to authenticated using (auth.uid() is not null and clinic_id = public.get_my_clinic_id());

drop policy if exists "Allow clinic staff to insert leads" on public.leads;
create policy "Allow clinic staff to insert leads" on public.leads
for insert to authenticated with check (auth.uid() is not null and clinic_id = public.get_my_clinic_id());
drop policy if exists "Allow clinic staff to update leads" on public.leads;
create policy "Allow clinic staff to update leads" on public.leads
for update to authenticated using (auth.uid() is not null and clinic_id = public.get_my_clinic_id())
with check (auth.uid() is not null and clinic_id = public.get_my_clinic_id());
drop policy if exists "Allow clinic staff to view their leads" on public.leads;
create policy "Allow clinic staff to view their leads" on public.leads
for select to authenticated using (auth.uid() is not null and clinic_id = public.get_my_clinic_id());

drop policy if exists "Allow clinic staff to insert marketing_campaigns" on public.marketing_campaigns;
create policy "Allow clinic staff to insert marketing_campaigns" on public.marketing_campaigns
for insert to authenticated with check (auth.uid() is not null and clinic_id = public.get_my_clinic_id());
drop policy if exists "Allow clinic staff to update marketing_campaigns" on public.marketing_campaigns;
create policy "Allow clinic staff to update marketing_campaigns" on public.marketing_campaigns
for update to authenticated using (auth.uid() is not null and clinic_id = public.get_my_clinic_id())
with check (auth.uid() is not null and clinic_id = public.get_my_clinic_id());
drop policy if exists "Allow clinic staff to view their marketing_campaigns" on public.marketing_campaigns;
create policy "Allow clinic staff to view their marketing_campaigns" on public.marketing_campaigns
for select to authenticated using (auth.uid() is not null and clinic_id = public.get_my_clinic_id());

drop policy if exists "Allow clinic staff to insert recovery_logs" on public.recovery_logs;
create policy "Allow clinic staff to insert recovery_logs" on public.recovery_logs
for insert to authenticated with check (auth.uid() is not null and clinic_id = public.get_my_clinic_id());
drop policy if exists "Allow clinic staff to update recovery_logs" on public.recovery_logs;
create policy "Allow clinic staff to update recovery_logs" on public.recovery_logs
for update to authenticated using (auth.uid() is not null and clinic_id = public.get_my_clinic_id())
with check (auth.uid() is not null and clinic_id = public.get_my_clinic_id());
drop policy if exists "Allow clinic staff to view their recovery_logs" on public.recovery_logs;
create policy "Allow clinic staff to view their recovery_logs" on public.recovery_logs
for select to authenticated using (auth.uid() is not null and clinic_id = public.get_my_clinic_id());

drop policy if exists "Allow clinic staff to insert referrals" on public.referrals;
create policy "Allow clinic staff to insert referrals" on public.referrals
for insert to authenticated with check (auth.uid() is not null and clinic_id = public.get_my_clinic_id());
drop policy if exists "Allow clinic staff to update referrals" on public.referrals;
create policy "Allow clinic staff to update referrals" on public.referrals
for update to authenticated using (auth.uid() is not null and clinic_id = public.get_my_clinic_id())
with check (auth.uid() is not null and clinic_id = public.get_my_clinic_id());
drop policy if exists "Allow clinic staff to view their referrals" on public.referrals;
create policy "Allow clinic staff to view their referrals" on public.referrals
for select to authenticated using (auth.uid() is not null and clinic_id = public.get_my_clinic_id());

drop policy if exists "Allow clinic staff to insert waitlist" on public.waitlist;
create policy "Allow clinic staff to insert waitlist" on public.waitlist
for insert to authenticated with check (auth.uid() is not null and clinic_id = public.get_my_clinic_id());
drop policy if exists "Allow clinic staff to update waitlist" on public.waitlist;
create policy "Allow clinic staff to update waitlist" on public.waitlist
for update to authenticated using (auth.uid() is not null and clinic_id = public.get_my_clinic_id())
with check (auth.uid() is not null and clinic_id = public.get_my_clinic_id());
drop policy if exists "Allow clinic staff to view their waitlist" on public.waitlist;
create policy "Allow clinic staff to view their waitlist" on public.waitlist
for select to authenticated using (auth.uid() is not null and clinic_id = public.get_my_clinic_id());

drop policy if exists "clinics_self_read" on public.clinics;
create policy "clinics_self_read" on public.clinics
for select to authenticated
using (auth.uid() is not null and (id = public.get_my_clinic_id() or public.is_platform_admin()));

drop policy if exists "subscriptions_self_read" on public.subscriptions;
create policy "subscriptions_self_read" on public.subscriptions
for select to authenticated
using (auth.uid() is not null and clinic_id = public.get_my_clinic_id());

drop policy if exists "Users can view clinical_protocols for their clinic" on public.clinical_protocols;
create policy "Users can view clinical_protocols for their clinic" on public.clinical_protocols
for select to authenticated using (auth.uid() is not null and clinic_id = public.get_my_clinic_id());

drop policy if exists "Users can insert peer_reviews for their clinic" on public.peer_reviews;
create policy "Users can insert peer_reviews for their clinic" on public.peer_reviews
for insert to authenticated with check (auth.uid() is not null and clinic_id = public.get_my_clinic_id());
drop policy if exists "Users can update peer_reviews for their clinic" on public.peer_reviews;
create policy "Users can update peer_reviews for their clinic" on public.peer_reviews
for update to authenticated using (auth.uid() is not null and clinic_id = public.get_my_clinic_id())
with check (auth.uid() is not null and clinic_id = public.get_my_clinic_id());
drop policy if exists "Users can view peer_reviews for their clinic" on public.peer_reviews;
create policy "Users can view peer_reviews for their clinic" on public.peer_reviews
for select to authenticated using (auth.uid() is not null and clinic_id = public.get_my_clinic_id());

drop policy if exists "Users can insert protocol_licenses for their clinic" on public.protocol_licenses;
create policy "Users can insert protocol_licenses for their clinic" on public.protocol_licenses
for insert to authenticated with check (auth.uid() is not null and clinic_id = public.get_my_clinic_id());
drop policy if exists "Users can view protocol_licenses for their clinic" on public.protocol_licenses;
create policy "Users can view protocol_licenses for their clinic" on public.protocol_licenses
for select to authenticated using (auth.uid() is not null and clinic_id = public.get_my_clinic_id());
