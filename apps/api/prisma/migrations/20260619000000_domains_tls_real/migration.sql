-- Migration: 20260619000000_domains_tls_real
-- Phase 07: Mode A/B DNS, routing verify, ACTIVE/BROKEN lifecycle, sslStatus, email safety
-- Applied: 2026-06-19

-- ── DomainStatus enum: replace VALID with ACTIVE, add BROKEN ──────────────────
-- PostgreSQL enum ALTER TYPE — add new values only
ALTER TYPE "DomainStatus" ADD VALUE IF NOT EXISTS 'VALIDATING';  -- might already exist
ALTER TYPE "DomainStatus" ADD VALUE IF NOT EXISTS 'ACTIVE';
ALTER TYPE "DomainStatus" ADD VALUE IF NOT EXISTS 'BROKEN';
-- Note: cannot remove 'VALID' safely; deployments using 'VALID' will still work
-- VALID maps to ACTIVE in the application logic

-- ── SslStatus enum ───────────────────────────────────────────────────────────
CREATE TYPE "SslStatus" AS ENUM ('PENDING', 'ISSUING', 'ACTIVE', 'FAILED', 'EXPIRED');

-- ── New columns on projects.domains ───────────────────────────────────────────
ALTER TABLE "projects.domains"
  ADD COLUMN IF NOT EXISTS "deployment_id" UUID REFERENCES "projects.deployments" ("id") ON DELETE SET NULL;

ALTER TABLE "projects.domains"
  ADD COLUMN IF NOT EXISTS "is_primary" BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE "projects.domains"
  ADD COLUMN IF NOT EXISTS "apex_domain" BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE "projects.domains"
  ADD COLUMN IF NOT EXISTS "dns_mode" VARCHAR(50) NOT NULL DEFAULT 'manual';

ALTER TABLE "projects.domains"
  ADD COLUMN IF NOT EXISTS "ssl_status" "SslStatus" NOT NULL DEFAULT 'PENDING';

ALTER TABLE "projects.domains"
  ADD COLUMN IF NOT EXISTS "ssl_method" VARCHAR(50) NOT NULL DEFAULT 'letsencrypt';

ALTER TABLE "projects.domains"
  ADD COLUMN IF NOT EXISTS "routing_verified_at" TIMESTAMPTZ;

ALTER TABLE "projects.domains"
  ADD COLUMN IF NOT EXISTS "email_warning" BOOLEAN NOT NULL DEFAULT false;

-- sslCertArn renamed conceptually but column stays (future cert-manager integration)
-- ssl_enabled kept as a boolean kill-switch

-- ── Indexes ──────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS "projects.domains_deployment_id_idx"
  ON "projects.domains" ("deployment_id")
  WHERE "deployment_id" IS NOT NULL;

CREATE INDEX IF NOT EXISTS "projects.domains_dns_status_idx"
  ON "projects.domains" ("dns_status");

CREATE INDEX IF NOT EXISTS "projects.domains_ssl_status_idx"
  ON "projects.domains" ("ssl_status");
