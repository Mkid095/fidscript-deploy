-- Migration: installation_and_credentials
-- Adds runtime platform configuration models + per-user credential registry.

-- 1. InstallationLifecycle enum
CREATE TYPE "InstallationLifecycle" AS ENUM (
  'UNCONFIGURED',
  'CONFIGURING',
  'CONFIGURED',
  'DEGRADED',
  'RECONFIGURING'
);

-- 2. InstallationStatus singleton
CREATE TABLE "platform.installation_status" (
  "id" VARCHAR(255) PRIMARY KEY DEFAULT 'installation',
  "lifecycle" "InstallationLifecycle" NOT NULL DEFAULT 'UNCONFIGURED',
  "last_operation_id" VARCHAR(36),
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO "platform.installation_status" ("id", "lifecycle") VALUES ('installation', 'UNCONFIGURED');

-- 3. InstallationOperation
CREATE TABLE "platform.installation_operations" (
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

CREATE INDEX "installation_operations_status_idx" ON "platform.installation_operations" ("status");

-- 4. InstallationSettingsVersion
CREATE TABLE "platform.installation_settings_versions" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "changed_by" VARCHAR(255),
  "changed_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "reason" TEXT,
  "snapshot" JSONB NOT NULL,
  "operation_id" VARCHAR(36)
);

-- 5. InstallationSettings
CREATE TABLE "platform.installation_settings" (
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
CREATE TYPE "CredentialType" AS ENUM (
  'PASSWORD',
  'MAGIC_CODE',
  'PASSKEY'
);

-- 7. UserCredential
CREATE TABLE "identity.user_credentials" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "user_id" UUID NOT NULL REFERENCES "identity.users" ("id") ON DELETE CASCADE,
  "type" "CredentialType" NOT NULL,
  "secret_hash" VARCHAR(255),
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "user_credentials_user_id_type_unique" UNIQUE ("user_id", "type")
);

CREATE INDEX "user_credentials_user_id_idx" ON "identity.user_credentials" ("user_id");
