-- Add FAILED to the InstallationLifecycle enum.
-- duplicate_object catch makes this safe to re-run on any database state.
DO $$
BEGIN
  EXECUTE 'ALTER TYPE "platform.installation_lifecycle" ADD VALUE ''FAILED''';
EXCEPTION
  WHEN duplicate_object THEN
    NULL; -- Value already exists — safe to ignore
END $$;

-- Null out any stale cloudflare_token values.
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
