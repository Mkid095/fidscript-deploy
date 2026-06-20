-- =============================================
-- Phase B / PREREQ-AUTH-3 — Platform magic-code (6-digit OTP login)
-- =============================================
-- Stores one row per issued login code: bcrypt-hashed code, 10-minute expiry,
-- attempt counter (≤5), consumed flag. Replaces the broken magic-link path
-- (AUTH-05/06, which queried `where user.email === token`). See
-- docs/phases/frontend/f02-auth.md.

CREATE TABLE "identity.magic_codes" (
    "id" TEXT NOT NULL,
    "email" VARCHAR(255) NOT NULL,
    "code_hash" VARCHAR(255) NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "consumed" BOOLEAN NOT NULL DEFAULT false,
    "expires_at" TIMESTAMPTZ NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "magic_codes_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "identity.magic_codes_email_consumed_created_at_idx"
    ON "identity.magic_codes" ("email", "consumed", "created_at");
