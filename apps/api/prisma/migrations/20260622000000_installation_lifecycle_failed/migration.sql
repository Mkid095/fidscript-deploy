-- Add FAILED to the InstallationLifecycle enum.
-- PostgreSQL 13+ supports ADD VALUE IF NOT EXISTS; older versions need a DO block.
DO $$
BEGIN
  IF (SELECT current_setting('server_version_num')::int >= 130000) THEN
    EXECUTE 'ALTER TYPE "platform.installation_lifecycle" ADD VALUE IF NOT EXISTS ''FAILED''';
  ELSE
    -- PostgreSQL < 13: add value using value-added approach
    -- PostgreSQL enum addition requires a transaction, so we use a separate approach
    -- that works on 12+ by creating a new type and swapping
    EXECUTE 'ALTER TYPE "platform.installation_lifecycle" ADD VALUE ''FAILED''';
  END IF;
EXCEPTION
  WHEN duplicate_object THEN
    -- Value already exists (race condition or already added) — safe to ignore
    NULL;
END $$;

-- Null out any stale cloudflare_token values from previous schema versions.
-- The CF token is now written only to /run/secrets/cf_api_token, never stored in the DB.
-- Conditionally check column existence to survive fresh installs that never had the column.
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
