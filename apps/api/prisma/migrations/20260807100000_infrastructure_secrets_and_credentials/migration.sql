-- Infrastructure-First Refactor: Secret + Credential models
-- These two tables are the foundation of the Infrastructure module.
-- See docs/INFRASTRUCTURE.md and the project-as-infrastructure plan.

-- CreateSchema (idempotent — runs even if already created)
CREATE SCHEMA IF NOT EXISTS "infrastructure";

-- Add credentials inverse relation to projects
ALTER TABLE projects.projects ADD COLUMN IF NOT EXISTS "credentials" TEXT[] DEFAULT ARRAY[]::TEXT[];

-- Secret
CREATE TABLE IF NOT EXISTS "infrastructure"."secrets" (
    "id" TEXT NOT NULL,
    "project_id" TEXT,
    "key" VARCHAR(255) NOT NULL,
    "encrypted_value" BYTEA NOT NULL,
    "provider" VARCHAR(64),
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "last_used_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "secrets_pkey" PRIMARY KEY ("id")
);

-- Unique constraint on (project_id, key) — allows nulls (platform-level secrets)
CREATE UNIQUE INDEX IF NOT EXISTS "secrets_project_id_key_key" ON "infrastructure"."secrets" ("project_id", "key");
CREATE INDEX IF NOT EXISTS "secrets_project_id_provider_idx" ON "infrastructure"."secrets" ("project_id", "provider");
CREATE INDEX IF NOT EXISTS "secrets_provider_idx" ON "infrastructure"."secrets" ("provider");

-- Credential
CREATE TABLE IF NOT EXISTS "infrastructure"."credentials" (
    "id" TEXT NOT NULL,
    "project_id" TEXT NOT NULL,
    "type" VARCHAR(64) NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "key_hash" VARCHAR(255) NOT NULL,
    "key_prefix" VARCHAR(16) NOT NULL,
    "scopes" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "last_used_at" TIMESTAMPTZ,
    "expires_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "credentials_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "credentials_project_id_type_idx" ON "infrastructure"."credentials" ("project_id", "type");
CREATE INDEX IF NOT EXISTS "credentials_key_prefix_idx" ON "infrastructure"."credentials" ("key_prefix");

-- Foreign keys
-- (Cascade on project delete for credentials; null for secrets so platform-level
-- secrets survive project deletion.)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints
                 WHERE constraint_name = 'credentials_project_id_fkey') THEN
    ALTER TABLE "infrastructure"."credentials"
      ADD CONSTRAINT "credentials_project_id_fkey"
      FOREIGN KEY ("project_id") REFERENCES "projects"."projects"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
