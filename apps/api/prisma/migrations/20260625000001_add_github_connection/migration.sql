-- =============================================
-- GitHub OAuth connection at the platform user level.
-- One connection per user — stored at the platform user level (identity schema).
-- Used for deployments across all projects without re-authorizing.
-- Idempotent: uses CREATE TABLE IF NOT EXISTS / CREATE INDEX IF NOT EXISTS.
-- =============================================

CREATE TABLE IF NOT EXISTS "identity"."github_connections" (
    "id" TEXT NOT NULL,
    "user_id" VARCHAR(255) NOT NULL,
    "github_user_id" VARCHAR(255) NOT NULL,
    "username" VARCHAR(255) NOT NULL,
    "avatar_url" TEXT,
    "encrypted_token" TEXT NOT NULL,
    "encrypted_refresh" TEXT,
    "token_expires_at" TIMESTAMPTZ,
    "scopes" VARCHAR(500) NOT NULL DEFAULT 'read:user,repo',
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "github_connections_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "github_connections_user_id_key" UNIQUE ("user_id")
);

CREATE INDEX IF NOT EXISTS "identity"."github_connections_user_id_idx"
    ON "identity"."github_connections" ("user_id");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'github_connections_user_id_fkey'
      AND table_schema = 'identity'
      AND table_name = 'github_connections'
  ) THEN
    ALTER TABLE "identity"."github_connections"
      ADD CONSTRAINT "github_connections_user_id_fkey"
      FOREIGN KEY ("user_id") REFERENCES "identity"."users"("id") ON DELETE CASCADE;
  END IF;
END
$$;
