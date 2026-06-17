-- Create encrypted env vars table
CREATE TABLE "projects.env_vars" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "project_id" UUID NOT NULL REFERENCES "projects.projects"("id") ON DELETE CASCADE,
  "key" VARCHAR(255) NOT NULL,
  "value" TEXT NOT NULL,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE("project_id", "key")
);

-- Create invitations table
CREATE TABLE "projects.invitations" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "project_id" UUID NOT NULL REFERENCES "projects.projects"("id") ON DELETE CASCADE,
  "email" VARCHAR(255) NOT NULL,
  "role" VARCHAR(50) NOT NULL,
  "token_hash" VARCHAR(255) NOT NULL,
  "expires_at" TIMESTAMPTZ NOT NULL,
  "invited_by" VARCHAR(255),
  "accepted_at" TIMESTAMPTZ,
  "revoked_at" TIMESTAMPTZ,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX "projects.invitations_project_id_email_idx" ON "projects.invitations"("project_id", "email");
CREATE INDEX "projects.invitations_token_hash_idx" ON "projects.invitations"("token_hash");

-- Create project API keys table
CREATE TABLE "projects.api_keys" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "project_id" UUID NOT NULL REFERENCES "projects.projects"("id") ON DELETE CASCADE,
  "name" VARCHAR(255) NOT NULL,
  "key_hash" VARCHAR(255) NOT NULL,
  "permissions" JSONB NOT NULL DEFAULT '[]',
  "last_used_at" TIMESTAMPTZ,
  "expires_at" TIMESTAMPTZ,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX "projects.api_keys_project_id_idx" ON "projects.api_keys"("project_id");