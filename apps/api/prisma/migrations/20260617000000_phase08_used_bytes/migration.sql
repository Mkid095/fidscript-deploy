-- Migration: 20260617000000_phase08_used_bytes
-- Phase 08: add used_bytes column to ManagedDatabase
-- Applied: 2026-06-17

ALTER TABLE "databases.managed"
  ADD COLUMN IF NOT EXISTS "used_bytes" BIGINT NOT NULL DEFAULT 0;
