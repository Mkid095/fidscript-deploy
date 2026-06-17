-- Migration: 20260617200000_add_concurrency_lock_writable_mounts
-- Phase 06: Deployment concurrency lock + writable mounts
-- Applied: 2026-06-17

-- Add BLOCKED to DeploymentStatus enum
ALTER TYPE "DeploymentStatus" ADD VALUE IF NOT EXISTS 'BLOCKED';

-- Add concurrency lock column to project_settings
ALTER TABLE "projects.project_settings"
  ADD COLUMN IF NOT EXISTS "active_deployment_id" VARCHAR(255),
  ADD COLUMN IF NOT EXISTS "writable_mounts" JSONB NOT NULL DEFAULT '[]'::jsonb;

-- Add FK for active deployment (no cascade — deployment may not exist yet when settings are created)
ALTER TABLE "projects.project_settings"
  ADD CONSTRAINT "project_settings_active_deployment_fk"
  FOREIGN KEY ("active_deployment_id")
  REFERENCES "projects.deployments" ("id")
  ON DELETE SET NULL;

-- Add reverse FK on deployments table for active deployment relation
ALTER TABLE "projects.deployments"
  ADD COLUMN IF NOT EXISTS "active_for_settings_id" VARCHAR(255);

ALTER TABLE "projects.deployments"
  ADD CONSTRAINT "deployments_active_for_fk"
  FOREIGN KEY ("active_for_settings_id")
  REFERENCES "projects.project_settings" ("id")
  ON DELETE SET NULL;

-- Index for fast lock lookup
CREATE INDEX IF NOT EXISTS "projects.project_settings_project_id_active_idx"
  ON "projects.project_settings" ("project_id")
  WHERE "active_deployment_id" IS NOT NULL;
