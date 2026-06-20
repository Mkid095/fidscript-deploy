-- =============================================
-- Inc 5 — BaaS OAuth (per-project Google + GitHub)
-- =============================================
-- Per-project OAuth provider configuration (credentials encrypted at rest
-- via CryptoService AES-256-GCM) and OAuth identity linkage to AppUser.
--
-- Reuses the same encrypted-blob pattern as projects.domain_connections and
-- projects.env_vars. AppUser.passwordHash is already nullable, so passwordless
-- OAuth-only users work without a schema change.
--
-- Also extends projects.app_sessions with revoked_at + last_used_at so that
-- refresh-rotation and logout produce an audit trail (the opaque-token scan
-- path is being removed; the AppSession row now keys a JWT refresh token).

-- CreateEnum
CREATE TYPE "projects.AuthProviderName" AS ENUM ('GOOGLE', 'GITHUB');

-- CreateTable
CREATE TABLE "projects.auth_providers" (
    "id" TEXT NOT NULL,
    "project_id" TEXT NOT NULL,
    "provider" "projects.AuthProviderName" NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "encrypted_client_id" VARCHAR(512) NOT NULL,
    "encrypted_client_secret" VARCHAR(1024) NOT NULL,
    "scopes" JSONB NOT NULL DEFAULT '[]',
    "redirect_uri" VARCHAR(512),
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "projects.auth_providers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "projects.app_oauth_accounts" (
    "id" TEXT NOT NULL,
    "app_user_id" TEXT NOT NULL,
    "project_id" TEXT NOT NULL,
    "provider" "projects.AuthProviderName" NOT NULL,
    "provider_user_id" VARCHAR(255) NOT NULL,
    "provider_email" VARCHAR(255),
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "projects.app_oauth_accounts_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "projects.auth_providers" ADD CONSTRAINT "projects.auth_providers_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects.projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "projects.app_oauth_accounts" ADD CONSTRAINT "projects.app_oauth_accounts_app_user_id_fkey" FOREIGN KEY ("app_user_id") REFERENCES "projects.app_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "projects.app_oauth_accounts" ADD CONSTRAINT "projects.app_oauth_accounts_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects.projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateIndex
CREATE UNIQUE INDEX "projects.auth_providers_project_id_provider_key" ON "projects.auth_providers"("project_id", "provider");

-- CreateIndex
CREATE INDEX "projects.auth_providers_project_id_idx" ON "projects.auth_providers"("project_id");

-- CreateIndex
CREATE UNIQUE INDEX "projects.app_oauth_accounts_provider_provider_user_id_key" ON "projects.app_oauth_accounts"("provider", "provider_user_id");

-- CreateIndex
CREATE UNIQUE INDEX "projects.app_oauth_accounts_app_user_id_provider_key" ON "projects.app_oauth_accounts"("app_user_id", "provider");

-- CreateIndex
CREATE INDEX "projects.app_oauth_accounts_project_id_idx" ON "projects.app_oauth_accounts"("project_id");

-- AlterTable: extend AppSession for JWT refresh-token storage + audit trail
ALTER TABLE "projects.app_sessions"
    ADD COLUMN "revoked_at" TIMESTAMPTZ,
    ADD COLUMN "last_used_at" TIMESTAMPTZ;
