-- Migration: 20260619000000_domains_tls_real
-- Phase 07 final: Mode A/B DNS, 5-step verify, OWNERSHIP_PENDING, BROKEN/ACTIVE, sslStatus
--               DomainHealthChecks, redirectMode, emailProvider, DomainConnection, SSL metadata
-- Applied: 2026-06-19

-- ── DomainStatus enum: add new values ──────────────────────────────────────────
-- PostgreSQL enum ALTER TYPE — add new values only
ALTER TYPE "DomainStatus" ADD VALUE IF NOT EXISTS 'OWNERSHIP_PENDING';
ALTER TYPE "DomainStatus" ADD VALUE IF NOT EXISTS 'VALIDATING';
ALTER TYPE "DomainStatus" ADD VALUE IF NOT EXISTS 'TLS_PENDING';
ALTER TYPE "DomainStatus" ADD VALUE IF NOT EXISTS 'ACTIVE';
ALTER TYPE "DomainStatus" ADD VALUE IF NOT EXISTS 'BROKEN';
-- PENDING and FAILED already existed

-- ── SslStatus enum ─────────────────────────────────────────────────────────────
CREATE TYPE "SslStatus" AS ENUM ('PENDING', 'ISSUING', 'ACTIVE', 'FAILED', 'EXPIRED');

-- ── DomainConnection table ───────────────────────────────────────────────────
CREATE TABLE "projects.dns_connections" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "project_id" UUID NOT NULL,
  "provider" VARCHAR(50) NOT NULL,  -- 'CLOUDFLARE' | 'ROUTE53' | 'DIGITALOCEAN'
  "encrypted_token" TEXT NOT NULL,  -- AES-256-GCM ciphertext, never stored raw
  "token_id" VARCHAR(255),         -- provider's token ID for audit/invalidation
  "permissions" JSONB NOT NULL DEFAULT '{}',
  "email" VARCHAR(255),
  "last_verified_at" TIMESTAMPTZ,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ── Domain table columns ─────────────────────────────────────────────────────
ALTER TABLE "projects.domains"
  ADD COLUMN IF NOT EXISTS "deployment_id" UUID REFERENCES "projects.deployments" ("id") ON DELETE SET NULL;

ALTER TABLE "projects.domains"
  ADD COLUMN IF NOT EXISTS "dns_connection_id" UUID REFERENCES "projects.dns_connections" ("id") ON DELETE SET NULL;

ALTER TABLE "projects.domains"
  ADD COLUMN IF NOT EXISTS "is_primary" BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE "projects.domains"
  ADD COLUMN IF NOT EXISTS "apex_domain" BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE "projects.domains"
  ADD COLUMN IF NOT EXISTS "dns_mode" VARCHAR(50) NOT NULL DEFAULT 'manual';

ALTER TABLE "projects.domains"
  ADD COLUMN IF NOT EXISTS "redirect_mode" VARCHAR(50) NOT NULL DEFAULT 'none';

ALTER TABLE "projects.domains"
  ADD COLUMN IF NOT EXISTS "ssl_status" "SslStatus" NOT NULL DEFAULT 'PENDING';

ALTER TABLE "projects.domains"
  ADD COLUMN IF NOT EXISTS "ssl_method" VARCHAR(50) NOT NULL DEFAULT 'letsencrypt';

ALTER TABLE "projects.domains"
  ADD COLUMN IF NOT EXISTS "ssl_expires_at" TIMESTAMPTZ;

ALTER TABLE "projects.domains"
  ADD COLUMN IF NOT EXISTS "ssl_issued_at" TIMESTAMPTZ;

ALTER TABLE "projects.domains"
  ADD COLUMN IF NOT EXISTS "ssl_last_checked_at" TIMESTAMPTZ;

ALTER TABLE "projects.domains"
  ADD COLUMN IF NOT EXISTS "ssl_last_error" TEXT;

ALTER TABLE "projects.domains"
  ADD COLUMN IF NOT EXISTS "routing_verified_at" TIMESTAMPTZ;

ALTER TABLE "projects.domains"
  ADD COLUMN IF NOT EXISTS "email_warning" BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE "projects.domains"
  ADD COLUMN IF NOT EXISTS "email_provider" VARCHAR(100);

-- ── DomainHealthChecks table ─────────────────────────────────────────────────
CREATE TABLE "projects.domain_health_checks" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "domain_id" UUID NOT NULL REFERENCES "projects.domains" ("id") ON DELETE CASCADE,
  "checked_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "dns_ok" BOOLEAN NOT NULL DEFAULT false,
  "routing_ok" BOOLEAN NOT NULL DEFAULT false,
  "ssl_ok" BOOLEAN NOT NULL DEFAULT false,
  "response_time_ms" INTEGER,
  "ssl_expires_in_days" INTEGER,  -- days until cert expiry at check time
  "status" VARCHAR(20) NOT NULL DEFAULT 'ok',
  "error_message" TEXT
);

CREATE INDEX IF NOT EXISTS "projects.domain_health_checks_domain_checked_idx"
  ON "projects.domain_health_checks" ("domain_id", "checked_at" DESC);

-- ── Indexes ──────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS "projects.domains_deployment_id_idx"
  ON "projects.domains" ("deployment_id")
  WHERE "deployment_id" IS NOT NULL;

CREATE INDEX IF NOT EXISTS "projects.domains_dns_connection_id_idx"
  ON "projects.domains" ("dns_connection_id")
  WHERE "dns_connection_id" IS NOT NULL;

CREATE INDEX IF NOT EXISTS "projects.domains_dns_status_idx"
  ON "projects.domains" ("dns_status");

CREATE INDEX IF NOT EXISTS "projects.domains_ssl_status_idx"
  ON "projects.domains" ("ssl_status");
