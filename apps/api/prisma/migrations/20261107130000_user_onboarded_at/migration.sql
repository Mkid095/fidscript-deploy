-- The first-time journey.
--
-- Null means the person has not finished it. The dashboard uses this to
-- OFFER the journey, not to force it: an account that already has projects
-- is never made to go through it again.
ALTER TABLE "identity"."users"
  ADD COLUMN IF NOT EXISTS "onboarded_at" TIMESTAMPTZ(3);
