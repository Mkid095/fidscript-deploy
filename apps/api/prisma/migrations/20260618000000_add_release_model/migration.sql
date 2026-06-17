-- Migration: 20260618000000_add_release_model
-- Phase 06: Release model — build artifact separated from deployment instance
-- Applied: 2026-06-18

-- Create releases table (build artifact record)
CREATE TABLE "projects.releases" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "project_id" UUID NOT NULL REFERENCES "projects.projects" ("id") ON DELETE CASCADE,
  "commit_sha" VARCHAR(40) NOT NULL,
  "source_branch" VARCHAR(255) NOT NULL DEFAULT 'main',
  "image_tag" VARCHAR(255) NOT NULL,  -- e.g. "fidscript/project:2023abc123"
  "version" VARCHAR(50) NOT NULL,    -- immutable once set
  "build_logs" TEXT,
  "build_duration_ms" INTEGER,
  "created_by" VARCHAR(255),
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Deployment now references a Release
ALTER TABLE "projects.deployments"
  ADD COLUMN "release_id" UUID REFERENCES "projects.releases" ("id") ON DELETE SET NULL;

-- Build artifact fields removed from deployments table (now on Release)
ALTER TABLE "projects.deployments"
  DROP COLUMN IF EXISTS "commit_sha",
  DROP COLUMN IF EXISTS "commit_message",
  DROP COLUMN IF EXISTS "build_logs",
  DROP COLUMN IF EXISTS "build_duration_ms",
  DROP COLUMN IF EXISTS "version";

-- Add startup_timeout_seconds to build_configs
ALTER TABLE "projects.build_configs"
  ADD COLUMN IF NOT EXISTS "startup_timeout_seconds" INTEGER NOT NULL DEFAULT 120;

-- Fix build_configs strategy default (was 'buildpack', should be 'dockerfile')
ALTER TABLE "projects.build_configs"
  ALTER COLUMN "strategy" SET DEFAULT 'dockerfile';

-- Indexes for releases
CREATE UNIQUE INDEX IF NOT EXISTS "projects.releases_project_version_idx"
  ON "projects.releases" ("project_id", "version");

CREATE INDEX IF NOT EXISTS "projects.releases_project_created_idx"
  ON "projects.releases" ("project_id", "created_at" DESC);

-- FK index for deployment -> release
CREATE INDEX IF NOT EXISTS "projects.deployments_release_id_idx"
  ON "projects.deployments" ("release_id")
  WHERE "release_id" IS NOT NULL;
