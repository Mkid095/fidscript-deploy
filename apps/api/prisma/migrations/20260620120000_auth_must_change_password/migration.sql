-- =============================================
-- Phase B / PREREQ-AUTH-1 — mustChangePassword on identity.users
-- =============================================
-- Adds a boolean flag so the platform can force a password change before the
-- user can do anything else (the install-time ADMIN_PASSWORD is a bootstrap
-- secret; the operator should set their own on first login).
--
-- Defaults to false for all existing rows (no disruption to already-deployed
-- admins). Fresh installs get must_change_password = true via the seed
-- (prisma/seed.ts), which sets it on the admin it creates. The flag is cleared
-- by POST /auth/change-password (PREREQ-AUTH-2) and surfaced on GET /auth/me
-- (PREREQ-AUTH-4). See docs/phases/frontend/f02-auth.md.

-- RedefineTables
ALTER TABLE "identity.users" ADD COLUMN "must_change_password" BOOLEAN NOT NULL DEFAULT false;
