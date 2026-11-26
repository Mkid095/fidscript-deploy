-- UserRegistryCredential: the package registry's own account, linked to a
-- platform user. The registry is a separate identity, so the platform keeps
-- the registry password it generated, encrypted. One login, two systems.
CREATE TABLE IF NOT EXISTS "identity"."user_registry_credentials" (
  "id" TEXT NOT NULL,
  "user_id" TEXT NOT NULL,
  "registry_user" VARCHAR(255) NOT NULL,
  "password_enc" TEXT NOT NULL,
  "linked_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "last_used_at" TIMESTAMPTZ,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "user_registry_credentials_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "user_registry_credentials_user_id_key"
  ON "identity"."user_registry_credentials"("user_id");

ALTER TABLE "identity"."user_registry_credentials"
  ADD CONSTRAINT "user_registry_credentials_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "identity"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
