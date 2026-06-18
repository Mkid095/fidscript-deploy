-- Migration: 20260617000001_phase08_environment_metrics
-- Phase 08: multi-database per project, environment field, maxConnections, metrics table
-- Applied: 2026-06-17

-- Add environment + maxConnections columns
ALTER TABLE "databases.managed"
  ADD COLUMN IF NOT EXISTS "environment"    VARCHAR(50) NOT NULL DEFAULT 'production',
  ADD COLUMN IF NOT EXISTS "max_connections" INTEGER NOT NULL DEFAULT 20;

-- Relax uniqueness: project can have many DBs across different environments
-- Drop the old constraint if it exists (PostgreSQL will error if it doesn't — ignore that)
ALTER TABLE "databases.managed" DROP CONSTRAINT IF EXISTS "databases.managed_project_id_name_key";

-- New unique constraint: name+environment must be unique per project (e.g. 1 production DB per name, 1 staging DB per name)
ALTER TABLE "databases.managed"
  ADD CONSTRAINT "databases.managed_project_id_environment_name_key"
  UNIQUE ("project_id", "environment", "name");

-- DatabaseMetric table for scheduler-driven metrics collection
-- NOTE: "database_id" is TEXT (not UUID) to match the parent databases.managed.id
-- (a TEXT/CUID primary key, per the ManagedDatabase model). The previous
-- declaration was UUID, which produced SQLSTATE 42804 ("incompatible types:
-- uuid and text") and broke the foreign key. The "id" column is also TEXT to
-- stay consistent.
CREATE TABLE "infrastructure.database_metrics" (
  "id"                 TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "database_id"        TEXT NOT NULL REFERENCES "databases.managed" ("id") ON DELETE CASCADE,
  "recorded_at"        TIMESTAMPTZ NOT NULL DEFAULT now(),
  "used_bytes"         BIGINT NOT NULL DEFAULT 0,
  "active_conns"       INTEGER NOT NULL DEFAULT 0,
  "max_conns"          INTEGER NOT NULL DEFAULT 0,
  "queries_per_sec"    DOUBLE PRECISION NOT NULL DEFAULT 0,
  "last_backup_at"     TIMESTAMPTZ,
  "last_backup_size"   BIGINT NOT NULL DEFAULT 0,
  "backup_verified"    BOOLEAN NOT NULL DEFAULT false
);

CREATE INDEX IF NOT EXISTS "infrastructure.database_metrics_database_recorded_idx"
  ON "infrastructure.database_metrics" ("database_id", "recorded_at" DESC);
