-- Add FAILED to the InstallationLifecycle enum.
-- Done separately so this file can be re-run safely after manual setup.
-- Run this manually against the DB if the schema was created outside Prisma:
--   ALTER TYPE "InstallationLifecycle" ADD VALUE 'FAILED';

-- Null out any stale cloudflare_token values (column may not exist on fresh installs).
-- Conditionally check column existence to survive fresh installs that never had it.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'platform'
      AND table_name = 'installation_settings'
      AND column_name = 'cloudflare_token'
  ) THEN
    UPDATE "platform.installation_settings" SET cloudflare_token = NULL WHERE cloudflare_token IS NOT NULL;
  END IF;
END $$;
