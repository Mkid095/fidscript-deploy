-- Recovery codes for platform-user TOTP MFA.
--
-- A person who loses their authenticator still has to get back in. Each
-- recovery code is single-use, stored as a bcrypt hash (like the magic
-- codes), and consumed by marking it used — the plaintext is shown once,
-- when it is generated, and never again.
CREATE TABLE IF NOT EXISTS "identity"."mfa_recovery_codes" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "code_hash" VARCHAR(255) NOT NULL,
    "used_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "mfa_recovery_codes_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "mfa_recovery_codes_user_id_idx"
    ON "identity"."mfa_recovery_codes"("user_id");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'mfa_recovery_codes_user_id_fkey'
  ) THEN
    ALTER TABLE "identity"."mfa_recovery_codes"
      ADD CONSTRAINT "mfa_recovery_codes_user_id_fkey"
      FOREIGN KEY ("user_id") REFERENCES "identity"."users"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
