-- Add email/queue action types to cron_jobs (P0-7).
-- Existing rows keep NULL values; actionType is derived from which column is set.
ALTER TABLE "scheduler"."cron_jobs"
  ADD COLUMN IF NOT EXISTS "action_type" VARCHAR(20),
  ADD COLUMN IF NOT EXISTS "email_config" JSONB,
  ADD COLUMN IF NOT EXISTS "queue_config" JSONB;