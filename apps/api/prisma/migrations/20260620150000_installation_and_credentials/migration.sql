-- Migration: installation_and_credentials
-- Adds runtime platform configuration models + per-user credential registry.

-- 1. InstallationLifecycle enum
DO $$
BEGIN
CREATE TYPE "public"."InstallationLifecycle" AS ENUM (
  'UNCONFIGURED',
  'CONFIGURING',
  'CONFIGURED',
  'DEGRADED',
  'RECONFIGURING'
);
EXCEPTION
WHEN duplicate_object THEN NULL;
END $$;

-- 2. InstallationStatus singleton
CREATE TABLE IF NOT EXISTS "platform"."installation_status" (
  "id" VARCHAR(255) PRIMARY KEY DEFAULT 'installation',
  "lifecycle" "InstallationLifecycle" NOT NULL DEFAULT 'UNCONFIGURED',
  "last_operation_id" VARCHAR(36),
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- The baseline already creates this table (with updated_at NOT NULL and no
-- default), so the INSERT has to supply updated_at itself. ON CONFLICT keeps
-- it safe to run against a database that already has the row.
INSERT INTO "platform"."installation_status" ("id", "lifecycle", "updated_at")
VALUES ('installation', 'UNCONFIGURED', NOW())
ON CONFLICT ("id") DO NOTHING;

-- 3. InstallationOperation
CREATE TABLE IF NOT EXISTS "platform"."installation_operations" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "type" VARCHAR(50) NOT NULL,
  "status" VARCHAR(20) NOT NULL DEFAULT 'PENDING',
  "current_step" VARCHAR(50),
  "steps" JSONB,
  "previous_snapshot" JSONB,
  "failure_reason" TEXT,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "completed_at" TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS "installation_operations_status_idx" ON "platform"."installation_operations" ("status");

-- 4. InstallationSettingsVersion
CREATE TABLE IF NOT EXISTS "platform"."installation_settings_versions" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "changed_by" VARCHAR(255),
  "changed_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "reason" TEXT,
  "snapshot" JSONB NOT NULL,
  "operation_id" VARCHAR(36)
);

-- 5. InstallationSettings
CREATE TABLE IF NOT EXISTS "platform"."installation_settings" (
  "id" VARCHAR(255) PRIMARY KEY DEFAULT 'installation',
  "platform_name" VARCHAR(255) NOT NULL DEFAULT 'FIDScript Deploy',
  "platform_domain" VARCHAR(255) NOT NULL,
  "server_ip" VARCHAR(45) NOT NULL,
  "admin_email" VARCHAR(255) NOT NULL,
  "dns_mode" VARCHAR(50) NOT NULL DEFAULT 'cloudflare_auto',
  "branding" JSONB,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 6. CredentialType enum
DO $$
BEGIN
CREATE TYPE "identity"."CredentialType" AS ENUM (
  'PASSWORD',
  'MAGIC_CODE',
  'PASSKEY'
);
EXCEPTION
WHEN duplicate_object THEN NULL;
END $$;

-- 7. UserCredential
CREATE TABLE IF NOT EXISTS "identity"."user_credentials" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "user_id" UUID NOT NULL REFERENCES "identity"."users" ("id") ON DELETE CASCADE,
  "type" "CredentialType" NOT NULL,
  "secret_hash" VARCHAR(255),
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "user_credentials_user_id_type_unique" UNIQUE ("user_id", "type")
);

CREATE INDEX IF NOT EXISTS "user_credentials_user_id_idx" ON "identity"."user_credentials" ("user_id");
