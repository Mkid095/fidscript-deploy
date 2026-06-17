-- Migration: 20260619000000_domains_tls_real
-- Phase 07: Real Cloudflare DNS + Traefik ACME DNS-01 challenge
-- Applied: 2026-06-19

-- Add deploymentId FK to Domain (which deployment this domain routes to)
ALTER TABLE "projects.domains"
  ADD COLUMN IF NOT EXISTS "deployment_id" UUID REFERENCES "projects.deployments" ("id") ON DELETE SET NULL;

-- Index for reverse lookup: find domains by deployment
CREATE INDEX IF NOT EXISTS "projects.domains_deployment_id_idx"
  ON "projects.domains" ("deployment_id")
  WHERE "deployment_id" IS NOT NULL;

-- DomainStatus enum was already created by prior migration.
-- VALIDATING was already in the enum. No DDL changes needed.
