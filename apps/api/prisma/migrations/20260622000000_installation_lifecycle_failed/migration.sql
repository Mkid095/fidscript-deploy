-- Add FAILED to the InstallationLifecycle enum
ALTER TYPE "platform.installation_lifecycle" ADD VALUE IF NOT EXISTS 'FAILED';

-- Null out any stale cloudflare_token values from previous schema versions
-- The CF token is now written only to /run/secrets/cf_api_token, never stored in the DB.
UPDATE "platform.installation_settings"
SET cloudflare_token = NULL
WHERE cloudflare_token IS NOT NULL;
