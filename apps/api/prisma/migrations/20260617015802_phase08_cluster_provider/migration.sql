-- Migration: 20260617000002_phase08_cluster_provider
-- Phase 08: add cluster_id and provider for future multi-cluster/multi-provider support
-- Applied: 2026-06-17

ALTER TABLE "databases.managed"
  ADD COLUMN IF NOT EXISTS "cluster_id" UUID,
  ADD COLUMN IF NOT EXISTS "provider"  VARCHAR(50) NOT NULL DEFAULT 'internal-postgres';
