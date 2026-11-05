-- Ensure the existing per-user/clinic notification policies are enforced.
-- This migration intentionally preserves the existing policy definitions.
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
