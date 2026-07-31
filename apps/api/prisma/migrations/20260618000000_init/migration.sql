-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "ai";

-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "databases";

-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "email";

-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "functions";

-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "identity";

-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "infrastructure";

-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "logging";

-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "marketplace";

-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "monitoring";

-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "platform";

-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "projects";

-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "queues";

-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "realtime";

-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "scheduler";

-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "storage";

-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "templates";

-- CreateEnum
CREATE TYPE "public"."Role" AS ENUM ('USER', 'ADMIN', 'OWNER');

-- CreateEnum
CREATE TYPE "public"."AuthMethod" AS ENUM ('PASSWORD', 'MAGIC_CODE');

-- CreateEnum
CREATE TYPE "identity"."OrganizationRole" AS ENUM ('OWNER', 'ADMIN', 'DEVELOPER', 'BILLING', 'VIEWER');

-- CreateEnum
CREATE TYPE "identity"."TeamRole" AS ENUM ('LEAD', 'MEMBER', 'VIEWER');

-- CreateEnum
CREATE TYPE "identity"."VerificationTokenType" AS ENUM ('EMAIL_VERIFY', 'PASSWORD_RESET', 'MAGIC_LINK');

-- CreateEnum
CREATE TYPE "public"."ProjectType" AS ENUM ('FRONTEND', 'BACKEND', 'WORKER', 'CRON', 'DOCKER', 'STATIC');

-- CreateEnum
CREATE TYPE "public"."ProjectStatus" AS ENUM ('CREATING', 'ACTIVE', 'SUSPENDED', 'ARCHIVED', 'DELETED');

-- CreateEnum
CREATE TYPE "public"."DeploymentStatus" AS ENUM ('PENDING', 'QUEUED', 'BUILDING', 'DEPLOYING', 'SUCCESS', 'FAILED', 'STOPPED', 'BLOCKED', 'ROLLED_BACK');

-- CreateEnum
CREATE TYPE "public"."DomainStatus" AS ENUM ('PENDING', 'OWNERSHIP_PENDING', 'VALIDATING', 'TLS_PENDING', 'ACTIVE', 'BROKEN', 'FAILED');

-- CreateEnum
CREATE TYPE "public"."DomainHealthStatus" AS ENUM ('PENDING', 'HEALTHY', 'DEGRADED', 'FAILED');

-- CreateEnum
CREATE TYPE "public"."SslStatus" AS ENUM ('PENDING', 'ISSUING', 'ACTIVE', 'FAILED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "public"."DomainType" AS ENUM ('DEPLOYMENT', 'EMAIL', 'INBOUND_EMAIL', 'TRACKING', 'API', 'REDIRECT', 'SANDBOX');

-- CreateEnum
CREATE TYPE "projects"."AuthProviderName" AS ENUM ('GOOGLE', 'GITHUB');

-- CreateEnum
CREATE TYPE "public"."EmailDomainStatus" AS ENUM ('PENDING', 'VERIFIED', 'ACTIVE', 'FAILED');

-- CreateEnum
CREATE TYPE "public"."SuppressionReason" AS ENUM ('BOUNCE', 'COMPLAINT', 'UNSUBSCRIBE', 'MANUAL');

-- CreateEnum
CREATE TYPE "public"."MailboxRole" AS ENUM ('OWNER', 'MEMBER', 'ASSIGNEE');

-- CreateEnum
CREATE TYPE "public"."ConversationStatus" AS ENUM ('OPEN', 'ASSIGNED', 'CLOSED');

-- CreateEnum
CREATE TYPE "public"."EmailFailureType" AS ENUM ('NONE', 'SMTP_TIMEOUT', 'SMTP_AUTH_FAILURE', 'RECIPIENT_REJECTED', 'SPAM_REJECTED', 'NETWORK_ERROR', 'PROVIDER_ERROR', 'SYSTEM_ERROR');

-- CreateEnum
CREATE TYPE "public"."EmailStatus" AS ENUM ('QUEUED', 'PROCESSING', 'SENT', 'DELIVERED', 'OPENED', 'CLICKED', 'BOUNCED', 'SOFT_BOUNCE', 'DEAD', 'RECEIVED', 'FAILED');

-- CreateEnum
CREATE TYPE "public"."InstallationLifecycle" AS ENUM ('UNCONFIGURED', 'CONFIGURING', 'CONFIGURED', 'FAILED', 'DEGRADED', 'RECONFIGURING');

-- CreateEnum
CREATE TYPE "identity"."CredentialType" AS ENUM ('PASSWORD', 'MAGIC_CODE', 'PASSKEY');

-- CreateTable
CREATE TABLE IF NOT EXISTS "identity"."users" (
    "id" TEXT NOT NULL,
    "email" VARCHAR(255) NOT NULL,
    "password_hash" VARCHAR(255),
    "name" VARCHAR(255),
    "avatar_url" TEXT,
    "role" "public"."Role" NOT NULL DEFAULT 'USER',
    "mfa_enabled" BOOLEAN NOT NULL DEFAULT false,
    "mfa_secret" VARCHAR(255),
    "must_change_password" BOOLEAN NOT NULL DEFAULT false,
    "email_verified_at" TIMESTAMPTZ,
    "preferred_auth_method" "public"."AuthMethod" NOT NULL DEFAULT 'PASSWORD',
    "last_login_at" TIMESTAMPTZ,
    "verification_code" VARCHAR(64),
    "verification_code_expires_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "identity"."permissions" (
    "id" TEXT NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "description" VARCHAR(255),
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "permissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "identity"."organizations" (
    "id" TEXT NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "slug" VARCHAR(100) NOT NULL,
    "logo_url" TEXT,
    "plan" VARCHAR(50) NOT NULL DEFAULT 'starter',
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "organizations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "identity"."org_roles" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "permissions" JSONB NOT NULL DEFAULT '[]',
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "org_roles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "identity"."organization_members" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "role_id" TEXT NOT NULL,
    "invited_by" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "organization_members_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "identity"."teams" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "description" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "teams_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "identity"."team_members" (
    "id" TEXT NOT NULL,
    "team_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "role" "identity"."TeamRole" NOT NULL DEFAULT 'MEMBER',
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "team_members_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "identity"."invitations" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "email" VARCHAR(255) NOT NULL,
    "role_id" TEXT NOT NULL,
    "token" VARCHAR(255) NOT NULL,
    "invited_by" TEXT NOT NULL,
    "expires_at" TIMESTAMPTZ NOT NULL,
    "accepted_at" TIMESTAMP(3),
    "accepted_by" TEXT,
    "revoked_at" TIMESTAMP(3),
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "invitations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "identity"."sessions" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "token_hash" VARCHAR(255) NOT NULL,
    "expires_at" TIMESTAMPTZ NOT NULL,
    "ip_address" VARCHAR(45),
    "user_agent" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "identity"."api_keys" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "key_hash" VARCHAR(255) NOT NULL,
    "permissions" JSONB NOT NULL DEFAULT '[]',
    "last_used_at" TIMESTAMPTZ,
    "expires_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "mcpScopes" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "mcpEnabled" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "api_keys_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "identity"."audit_logs" (
    "id" TEXT NOT NULL,
    "user_id" TEXT,
    "action" VARCHAR(100) NOT NULL,
    "resource_type" VARCHAR(100),
    "resource_id" VARCHAR(100),
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "ip_address" VARCHAR(45),
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "identity"."magic_codes" (
    "id" TEXT NOT NULL,
    "email" VARCHAR(255) NOT NULL,
    "code_hash" VARCHAR(255) NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "consumed" BOOLEAN NOT NULL DEFAULT false,
    "expires_at" TIMESTAMPTZ NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "magic_codes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "identity"."verification_tokens" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "token" VARCHAR(255) NOT NULL,
    "type" "identity"."VerificationTokenType" NOT NULL,
    "expires_at" TIMESTAMPTZ NOT NULL,
    "consumed" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "verification_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "identity"."github_connections" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "github_user_id" VARCHAR(255) NOT NULL,
    "username" VARCHAR(255) NOT NULL,
    "avatar_url" TEXT,
    "encrypted_token" TEXT NOT NULL,
    "encrypted_refresh" TEXT,
    "token_expires_at" TIMESTAMPTZ,
    "scopes" VARCHAR(500) NOT NULL DEFAULT 'read:user,repo',
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "github_connections_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "projects"."projects" (
    "id" TEXT NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "slug" VARCHAR(255) NOT NULL,
    "description" TEXT,
    "type" "public"."ProjectType" NOT NULL DEFAULT 'FRONTEND',
    "status" "public"."ProjectStatus" NOT NULL DEFAULT 'CREATING',
    "owner_id" TEXT NOT NULL,
    "region" VARCHAR(100),
    "subdomain" VARCHAR(255),
    "custom_domains" JSONB NOT NULL DEFAULT '[]',
    "build_settings" JSONB NOT NULL DEFAULT '{}',
    "deployment_strategy" TEXT NOT NULL DEFAULT 'buildpack',
    "source_provider" VARCHAR(50),
    "source_repo" VARCHAR(500),
    "source_branch" TEXT NOT NULL DEFAULT 'main',
    "webhook_secret" VARCHAR(255),
    "github_hook_id" INTEGER,
    "auto_deploy" BOOLEAN NOT NULL DEFAULT true,
    "last_deploy_at" TIMESTAMPTZ,
    "deleted_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "projects_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "projects"."env_vars" (
    "id" TEXT NOT NULL,
    "project_id" TEXT NOT NULL,
    "key" VARCHAR(255) NOT NULL,
    "value" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "env_vars_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "projects"."invitations" (
    "id" TEXT NOT NULL,
    "project_id" TEXT NOT NULL,
    "email" VARCHAR(255) NOT NULL,
    "role" VARCHAR(50) NOT NULL,
    "token_hash" VARCHAR(255) NOT NULL,
    "expires_at" TIMESTAMPTZ NOT NULL,
    "invited_by" VARCHAR(255),
    "accepted_at" TIMESTAMPTZ,
    "revoked_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "invitations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "projects"."api_keys" (
    "id" TEXT NOT NULL,
    "project_id" TEXT NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "key_hash" VARCHAR(255) NOT NULL,
    "permissions" JSONB NOT NULL DEFAULT '[]',
    "last_used_at" TIMESTAMPTZ,
    "expires_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "api_keys_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "projects"."project_members" (
    "id" TEXT NOT NULL,
    "project_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "role" VARCHAR(100) NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "project_members_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "projects"."project_settings" (
    "id" TEXT NOT NULL,
    "project_id" TEXT NOT NULL,
    "settings" JSONB NOT NULL DEFAULT '{}',
    "active_deployment_id" TEXT,
    "writable_mounts" JSONB NOT NULL DEFAULT '[]',
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "project_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "storage"."buckets" (
    "id" TEXT NOT NULL,
    "project_id" TEXT NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "provider" VARCHAR(50) NOT NULL DEFAULT 'internal',
    "region" VARCHAR(100),
    "is_public" BOOLEAN NOT NULL DEFAULT false,
    "max_size_bytes" BIGINT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "buckets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "storage"."files" (
    "id" TEXT NOT NULL,
    "bucket_id" TEXT NOT NULL,
    "key" VARCHAR(1024) NOT NULL,
    "original_name" VARCHAR(255),
    "mime_type" VARCHAR(255),
    "size_bytes" BIGINT NOT NULL DEFAULT 0,
    "etag" VARCHAR(255),
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "files_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "storage"."project_storage_configs" (
    "id" TEXT NOT NULL,
    "project_id" TEXT NOT NULL,
    "default_provider" TEXT NOT NULL DEFAULT 'internal',
    "cloudinary_creds_set" BOOLEAN NOT NULL DEFAULT false,
    "telegram_creds_set" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "project_storage_configs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "projects"."releases" (
    "id" TEXT NOT NULL,
    "project_id" TEXT NOT NULL,
    "commitSha" VARCHAR(40) NOT NULL,
    "commit_message" TEXT,
    "source_branch" TEXT NOT NULL DEFAULT 'main',
    "imageTag" VARCHAR(255) NOT NULL,
    "version" VARCHAR(50) NOT NULL,
    "source_url" VARCHAR(1024),
    "buildLogs" TEXT,
    "build_duration_ms" INTEGER,
    "created_by" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "releases_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "projects"."deployments" (
    "id" TEXT NOT NULL,
    "project_id" TEXT NOT NULL,
    "release_id" TEXT,
    "status" "public"."DeploymentStatus" NOT NULL DEFAULT 'PENDING',
    "deployment_url" TEXT,
    "rolled_back_to" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completed_at" TIMESTAMPTZ,

    CONSTRAINT "deployments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "projects"."build_configs" (
    "id" TEXT NOT NULL,
    "project_id" TEXT NOT NULL,
    "build_target" VARCHAR(255),
    "startup_timeout_seconds" INTEGER NOT NULL DEFAULT 120,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "build_configs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "projects"."domains" (
    "id" TEXT NOT NULL,
    "project_id" TEXT NOT NULL,
    "deployment_id" TEXT,
    "dns_connection_id" TEXT,
    "domain" VARCHAR(255) NOT NULL,
    "is_custom" BOOLEAN NOT NULL DEFAULT false,
    "is_primary" BOOLEAN NOT NULL DEFAULT false,
    "apex_domain" BOOLEAN NOT NULL DEFAULT false,
    "zone_domain" VARCHAR(255),
    "wildcard_enabled" BOOLEAN NOT NULL DEFAULT false,
    "wildcard_target" VARCHAR(255),
    "type" "public"."DomainType"[] DEFAULT ARRAY[]::"public"."DomainType"[],
    "capabilities" JSONB NOT NULL DEFAULT '{"deployment":false,"email":false,"inboundEmail":false,"tracking":false,"api":false,"redirect":false,"sandbox":false}',
    "dns_mode" TEXT NOT NULL DEFAULT 'manual',
    "redirect_mode" TEXT NOT NULL DEFAULT 'none',
    "ssl_enabled" BOOLEAN NOT NULL DEFAULT true,
    "ssl_status" "public"."SslStatus" NOT NULL DEFAULT 'PENDING',
    "ssl_method" TEXT NOT NULL DEFAULT 'letsencrypt',
    "ssl_cert_arn" VARCHAR(255),
    "ssl_expires_at" TIMESTAMPTZ,
    "ssl_issued_at" TIMESTAMPTZ,
    "ssl_last_checked_at" TIMESTAMPTZ,
    "ssl_last_error" TEXT,
    "dns_status" "public"."DomainStatus" NOT NULL DEFAULT 'PENDING',
    "dns_verified_at" TIMESTAMPTZ,
    "routing_verified_at" TIMESTAMPTZ,
    "email_warning" BOOLEAN NOT NULL DEFAULT false,
    "email_provider" VARCHAR(100),
    "health_status" "public"."DomainHealthStatus" NOT NULL DEFAULT 'PENDING',
    "last_verified_at" TIMESTAMPTZ,
    "next_verification_at" TIMESTAMPTZ,
    "verification_failures" INTEGER NOT NULL DEFAULT 0,
    "last_health_score" INTEGER,
    "priority" INTEGER NOT NULL DEFAULT 0,
    "last_dns_fingerprint" VARCHAR(64),
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "domains_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "projects"."domain_webhooks" (
    "id" TEXT NOT NULL,
    "domain_id" TEXT NOT NULL,
    "project_id" VARCHAR(36) NOT NULL,
    "url" VARCHAR(2048) NOT NULL,
    "secret" TEXT,
    "events" JSONB NOT NULL DEFAULT '["*"]',
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "last_delivery_at" TIMESTAMPTZ,
    "last_delivery_ok" BOOLEAN,
    "delivery_count" INTEGER NOT NULL DEFAULT 0,
    "failure_count" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "domain_webhooks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "projects"."dns_connections" (
    "id" TEXT NOT NULL,
    "project_id" TEXT NOT NULL,
    "provider" VARCHAR(50) NOT NULL,
    "encrypted_token" TEXT NOT NULL,
    "token_id" VARCHAR(255),
    "external_zone_id" VARCHAR(255),
    "credentials" JSONB,
    "permissions" JSONB NOT NULL DEFAULT '{}',
    "email" VARCHAR(255),
    "last_verified_at" TIMESTAMPTZ NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "dns_connections_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "projects"."domain_email_keys" (
    "id" TEXT NOT NULL,
    "domain_id" TEXT NOT NULL,
    "selector" VARCHAR(100) NOT NULL,
    "publicKey" TEXT NOT NULL,
    "private_key_encrypted" TEXT NOT NULL,
    "algorithm" VARCHAR(20) NOT NULL DEFAULT 'ed25519',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "domain_email_keys_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "projects"."managed_dns_records" (
    "id" TEXT NOT NULL,
    "domain_id" TEXT NOT NULL,
    "provider_record_id" VARCHAR(255),
    "type" VARCHAR(10) NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "value" TEXT NOT NULL,
    "ttl" INTEGER NOT NULL DEFAULT 300,
    "priority" INTEGER,
    "proxied" BOOLEAN NOT NULL DEFAULT false,
    "managedBy" VARCHAR(20) NOT NULL DEFAULT 'platform',
    "source" VARCHAR(20) NOT NULL DEFAULT 'deployment',
    "checksum" VARCHAR(64) NOT NULL,
    "last_synced_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "managed_dns_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "projects"."domain_change_sets" (
    "id" TEXT NOT NULL,
    "domain_id" TEXT NOT NULL,
    "project_id" VARCHAR(36) NOT NULL,
    "status" VARCHAR(20) NOT NULL DEFAULT 'pending',
    "operations" JSONB NOT NULL DEFAULT '[]',
    "result" JSONB,
    "created_by" VARCHAR(255),
    "applied_at" TIMESTAMPTZ,
    "rolled_back_at" TIMESTAMPTZ,
    "rolled_back_by" VARCHAR(255),
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "domain_change_sets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "projects"."domain_health_checks" (
    "id" TEXT NOT NULL,
    "domain_id" TEXT NOT NULL,
    "checked_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dns_ok" BOOLEAN NOT NULL DEFAULT false,
    "routing_ok" BOOLEAN NOT NULL DEFAULT false,
    "ssl_ok" BOOLEAN NOT NULL DEFAULT false,
    "email_ok" BOOLEAN NOT NULL DEFAULT false,
    "score" INTEGER NOT NULL DEFAULT 0,
    "breakdown" JSONB,
    "response_time_ms" INTEGER,
    "ssl_expires_in_days" INTEGER,
    "status" VARCHAR(20) NOT NULL,
    "error_message" TEXT,

    CONSTRAINT "domain_health_checks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "projects"."domain_verification_runs" (
    "id" TEXT NOT NULL,
    "domain_id" TEXT NOT NULL,
    "reason" VARCHAR(50) NOT NULL,
    "previous_status" "public"."DomainHealthStatus",
    "new_status" "public"."DomainHealthStatus",
    "previous_score" INTEGER,
    "new_score" INTEGER,
    "duration_ms" INTEGER,
    "checks" JSONB,
    "error" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "domain_verification_runs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "projects"."domain_incidents" (
    "id" TEXT NOT NULL,
    "domain_id" TEXT NOT NULL,
    "type" VARCHAR(50) NOT NULL,
    "severity" VARCHAR(20) NOT NULL,
    "title" VARCHAR(255) NOT NULL,
    "description" TEXT,
    "status" VARCHAR(20) NOT NULL DEFAULT 'open',
    "opened_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolved_at" TIMESTAMPTZ,

    CONSTRAINT "domain_incidents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "projects"."domain_repair_policies" (
    "id" TEXT NOT NULL,
    "domain_id" TEXT NOT NULL,
    "auto_repair_dns" BOOLEAN NOT NULL DEFAULT false,
    "auto_repair_ssl" BOOLEAN NOT NULL DEFAULT true,
    "auto_repair_email" BOOLEAN NOT NULL DEFAULT false,
    "auto_repair_routing" BOOLEAN NOT NULL DEFAULT false,
    "allowed_repairs" JSONB NOT NULL DEFAULT '[]',
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "domain_repair_policies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "projects"."domain_repair_runs" (
    "id" TEXT NOT NULL,
    "domain_id" TEXT NOT NULL,
    "incident_id" TEXT,
    "repairType" VARCHAR(50) NOT NULL,
    "status" VARCHAR(20) NOT NULL,
    "before_state" JSONB,
    "after_state" JSONB,
    "error" TEXT,
    "started_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completed_at" TIMESTAMPTZ,

    CONSTRAINT "domain_repair_runs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "projects"."app_users" (
    "id" TEXT NOT NULL,
    "project_id" TEXT NOT NULL,
    "email" VARCHAR(255) NOT NULL,
    "password_hash" VARCHAR(255),
    "name" VARCHAR(255),
    "email_verified" BOOLEAN NOT NULL DEFAULT false,
    "verification_token" VARCHAR(255),
    "reset_token" VARCHAR(255),
    "reset_token_expiry" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "app_users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "projects"."app_sessions" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "token_hash" VARCHAR(255) NOT NULL,
    "expires_at" TIMESTAMPTZ NOT NULL,
    "ip_address" VARCHAR(45),
    "user_agent" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revoked_at" TIMESTAMPTZ,
    "last_used_at" TIMESTAMPTZ,

    CONSTRAINT "app_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "projects"."app_roles" (
    "id" TEXT NOT NULL,
    "project_id" TEXT NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "permissions" JSONB NOT NULL DEFAULT '[]',
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "app_roles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "projects"."app_user_roles" (
    "user_id" TEXT NOT NULL,
    "role_id" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "app_user_roles_pkey" PRIMARY KEY ("user_id","role_id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "projects"."auth_providers" (
    "id" TEXT NOT NULL,
    "project_id" TEXT NOT NULL,
    "provider" "projects"."AuthProviderName" NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "encrypted_client_id" VARCHAR(512) NOT NULL,
    "encrypted_client_secret" VARCHAR(1024) NOT NULL,
    "scopes" JSONB NOT NULL DEFAULT '[]',
    "redirect_uri" VARCHAR(512),
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "auth_providers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "projects"."app_oauth_accounts" (
    "id" TEXT NOT NULL,
    "app_user_id" TEXT NOT NULL,
    "project_id" TEXT NOT NULL,
    "provider" "projects"."AuthProviderName" NOT NULL,
    "provider_user_id" VARCHAR(255) NOT NULL,
    "provider_email" VARCHAR(255),
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "app_oauth_accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "email"."domains" (
    "id" TEXT NOT NULL,
    "project_id" TEXT NOT NULL,
    "domain" VARCHAR(255) NOT NULL,
    "status" "public"."EmailDomainStatus" NOT NULL DEFAULT 'PENDING',
    "dkim_verified" BOOLEAN NOT NULL DEFAULT false,
    "spf_verified" BOOLEAN NOT NULL DEFAULT false,
    "dmarc_verified" BOOLEAN NOT NULL DEFAULT false,
    "mx_verified" BOOLEAN NOT NULL DEFAULT false,
    "dkim_selector" VARCHAR(255),
    "dkim_public_key" TEXT,
    "catch_all_target" VARCHAR(255),
    "ownership_token" VARCHAR(255),
    "verified_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "domains_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "email"."mailboxes" (
    "id" TEXT NOT NULL,
    "domain_id" TEXT NOT NULL,
    "localPart" VARCHAR(255) NOT NULL,
    "name" VARCHAR(255),
    "quota" BIGINT NOT NULL DEFAULT 10737418240,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "stalwart_account_id" VARCHAR(255),
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "mailboxes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "email"."aliases" (
    "id" TEXT NOT NULL,
    "domain_id" TEXT NOT NULL,
    "localPart" VARCHAR(255) NOT NULL,
    "description" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "targets" JSONB NOT NULL DEFAULT '[]',
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "aliases_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "email"."sender_identities" (
    "id" TEXT NOT NULL,
    "domain_id" TEXT NOT NULL,
    "email" VARCHAR(255) NOT NULL,
    "name" VARCHAR(255),
    "is_verified" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sender_identities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "email"."api_keys" (
    "id" TEXT NOT NULL,
    "project_id" TEXT NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "key_hash" VARCHAR(255) NOT NULL,
    "scopes" TEXT[] DEFAULT ARRAY['email.send']::TEXT[],
    "last_used_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "rate_limit_plan_id" TEXT,

    CONSTRAINT "api_keys_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "email"."rate_limit_plans" (
    "id" TEXT NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "dailyLimit" INTEGER NOT NULL DEFAULT 1000,
    "monthlyLimit" INTEGER NOT NULL DEFAULT 30000,
    "hourlyBurst" INTEGER NOT NULL DEFAULT 50,
    "domainLimits" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "rate_limit_plans_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "email"."messages" (
    "id" TEXT NOT NULL,
    "mailbox_id" TEXT,
    "conversation_id" TEXT,
    "sender_identity_id" TEXT,
    "project_id" TEXT NOT NULL,
    "from" VARCHAR(255) NOT NULL,
    "to" VARCHAR(255) NOT NULL,
    "subject" VARCHAR(500) NOT NULL,
    "text_body" TEXT,
    "html_body" TEXT,
    "size_bytes" BIGINT NOT NULL DEFAULT 0,
    "is_read" BOOLEAN NOT NULL DEFAULT false,
    "is_starred" BOOLEAN NOT NULL DEFAULT false,
    "is_draft" BOOLEAN NOT NULL DEFAULT false,
    "spam_score" DOUBLE PRECISION,
    "status" "public"."EmailStatus" NOT NULL DEFAULT 'QUEUED',
    "error" TEXT,
    "failure_type" "public"."EmailFailureType",
    "jmap_message_id" TEXT,
    "received_at" TIMESTAMP(3),
    "last_attempt_at" TIMESTAMP(3),
    "next_retry_at" TIMESTAMP(3),
    "retry_count" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "archived_at" TIMESTAMPTZ,
    "retention_applied_at" TIMESTAMPTZ,

    CONSTRAINT "messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "email"."email_sync_cursors" (
    "accountId" TEXT NOT NULL,
    "lastState" TEXT NOT NULL DEFAULT '',
    "last_polled_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "email_sync_cursors_pkey" PRIMARY KEY ("accountId")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "email"."email_tracking_events" (
    "id" TEXT NOT NULL,
    "message_id" TEXT NOT NULL,
    "project_id" TEXT NOT NULL,
    "type" VARCHAR(20) NOT NULL,
    "url" TEXT,
    "user_agent" TEXT,
    "ip_address" VARCHAR(45),
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "email_tracking_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "email"."email_webhook_subscriptions" (
    "id" TEXT NOT NULL,
    "project_id" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "secret" TEXT NOT NULL,
    "events" JSONB NOT NULL DEFAULT '[]',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "last_status" VARCHAR(20),
    "last_sent_at" TIMESTAMPTZ,
    "success_count" INTEGER NOT NULL DEFAULT 0,
    "failure_count" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "email_webhook_subscriptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "email"."email_delivery_attempts" (
    "id" TEXT NOT NULL,
    "message_id" TEXT NOT NULL,
    "attempt" INTEGER NOT NULL DEFAULT 1,
    "provider" TEXT NOT NULL DEFAULT 'stalwart',
    "status" TEXT NOT NULL,
    "response" TEXT,
    "duration_ms" INTEGER,
    "failureType" "public"."EmailFailureType",
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "email_delivery_attempts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "email"."catch_all_rules" (
    "id" TEXT NOT NULL,
    "domain_id" TEXT NOT NULL,
    "target" JSONB NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "messages_per_minute" INTEGER NOT NULL DEFAULT 60,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "catch_all_rules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "email"."email_templates" (
    "id" TEXT NOT NULL,
    "project_id" TEXT NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "description" TEXT,
    "from_address" VARCHAR(255),
    "from_name" VARCHAR(255),
    "subject" VARCHAR(500) NOT NULL,
    "html_body" TEXT,
    "text_body" TEXT,
    "variables" JSONB NOT NULL DEFAULT '[]',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "email_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "email"."email_message_templates" (
    "id" TEXT NOT NULL,
    "message_id" TEXT NOT NULL,
    "template_id" TEXT NOT NULL,
    "variables" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "email_message_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "email"."suppressions" (
    "id" TEXT NOT NULL,
    "domain_id" TEXT NOT NULL,
    "email" VARCHAR(255) NOT NULL,
    "reason" "public"."SuppressionReason" NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "suppressions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "email"."api_usage" (
    "id" TEXT NOT NULL,
    "project_id" TEXT NOT NULL,
    "api_key_id" TEXT NOT NULL,
    "date" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sends" INTEGER NOT NULL DEFAULT 0,
    "failures" INTEGER NOT NULL DEFAULT 0,
    "bounces" INTEGER NOT NULL DEFAULT 0,
    "daily_limit" INTEGER NOT NULL DEFAULT 1000,
    "monthly_limit" INTEGER NOT NULL DEFAULT 30000,
    "blocked_until" TIMESTAMPTZ,
    "last_failure_at" TIMESTAMPTZ,

    CONSTRAINT "api_usage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "email"."domain_reputations" (
    "domain_id" TEXT NOT NULL,
    "bounceRate" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "complaintRate" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "deliveryRate" DOUBLE PRECISION NOT NULL DEFAULT 100.0,
    "engagementRate" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "reputationScore" DOUBLE PRECISION NOT NULL DEFAULT 100.0,
    "tier" TEXT NOT NULL DEFAULT 'trusted',
    "sendingPaused" BOOLEAN NOT NULL DEFAULT false,
    "emergencyStop" BOOLEAN NOT NULL DEFAULT false,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "domain_reputations_pkey" PRIMARY KEY ("domain_id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "email"."email_warmup" (
    "id" TEXT NOT NULL,
    "domain_id" TEXT NOT NULL,
    "ip_pool_id" TEXT,
    "currentDailyLimit" INTEGER NOT NULL DEFAULT 0,
    "targetDailyLimit" INTEGER NOT NULL DEFAULT 1000,
    "stage" INTEGER NOT NULL DEFAULT 1,
    "started_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completed_at" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "email_warmup_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "email"."abuse_events" (
    "id" TEXT NOT NULL,
    "domain_id" TEXT,
    "project_id" TEXT,
    "type" VARCHAR(50) NOT NULL,
    "severity" VARCHAR(20) NOT NULL,
    "details" JSONB NOT NULL,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "abuse_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "email"."ip_pools" (
    "id" TEXT NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ip_pools_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "email"."mailbox_members" (
    "id" TEXT NOT NULL,
    "mailbox_id" TEXT NOT NULL,
    "user_id" TEXT,
    "api_key_id" TEXT,
    "role" "public"."MailboxRole" NOT NULL DEFAULT 'MEMBER',
    "permissions" JSONB NOT NULL DEFAULT '[]',
    "added_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "mailbox_members_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "email"."conversations" (
    "id" TEXT NOT NULL,
    "mailbox_id" TEXT NOT NULL,
    "threadKey" VARCHAR(64) NOT NULL,
    "subject" VARCHAR(500),
    "status" "public"."ConversationStatus" NOT NULL DEFAULT 'OPEN',
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "conversations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "email"."conversation_assignments" (
    "id" TEXT NOT NULL,
    "conversation_id" TEXT NOT NULL,
    "member_id" TEXT NOT NULL,
    "assigned_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "assigned_by" TEXT NOT NULL,
    "unassigned_at" TIMESTAMP(3),
    "unassigned_by" TEXT,

    CONSTRAINT "conversation_assignments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "email"."retention_policies" (
    "id" TEXT NOT NULL,
    "project_id" TEXT NOT NULL,
    "scope" VARCHAR(20) NOT NULL,
    "scope_id" TEXT,
    "name" VARCHAR(255) NOT NULL,
    "priority" INTEGER NOT NULL DEFAULT 0,
    "rules" JSONB NOT NULL,
    "is_default" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "retention_policies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "email"."legal_holds" (
    "id" TEXT NOT NULL,
    "mailbox_id" TEXT NOT NULL,
    "reason" VARCHAR(255) NOT NULL,
    "created_by" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "released_at" TIMESTAMP(3),
    "released_by" TEXT,

    CONSTRAINT "legal_holds_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "email"."idempotency_records" (
    "idempotency_key" TEXT NOT NULL,
    "project_id" TEXT NOT NULL,
    "request_hash" VARCHAR(64) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PROCESSING',
    "responseCode" INTEGER,
    "responseBody" JSONB,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expires_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "idempotency_records_pkey" PRIMARY KEY ("idempotency_key")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "email"."attachment_config" (
    "id" TEXT NOT NULL DEFAULT 'singleton',
    "provider" VARCHAR(20) NOT NULL DEFAULT 'internal',
    "credentials" JSONB,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "attachment_config_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "email"."email_attachments" (
    "id" TEXT NOT NULL,
    "message_id" VARCHAR(255) NOT NULL,
    "mailbox_local" VARCHAR(255) NOT NULL,
    "filename" VARCHAR(500) NOT NULL,
    "mimeType" VARCHAR(255) NOT NULL,
    "size_bytes" BIGINT NOT NULL,
    "storage_key" VARCHAR(1000) NOT NULL,
    "storage_provider" VARCHAR(20) NOT NULL,
    "direction" VARCHAR(10) NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "email_attachments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "realtime"."channels" (
    "id" TEXT NOT NULL,
    "project_id" TEXT NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "is_private" BOOLEAN NOT NULL DEFAULT false,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "access_token" VARCHAR(255),
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "channels_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "realtime"."messages" (
    "id" TEXT NOT NULL,
    "channel_id" TEXT NOT NULL,
    "userId" VARCHAR(255) NOT NULL,
    "content" TEXT NOT NULL,
    "event" VARCHAR(100) NOT NULL DEFAULT 'message',
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "realtime"."presence" (
    "id" TEXT NOT NULL,
    "project_id" TEXT NOT NULL,
    "channel_id" TEXT NOT NULL,
    "userId" VARCHAR(255) NOT NULL,
    "status" VARCHAR(50) NOT NULL DEFAULT 'online',
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "presence_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "databases"."managed" (
    "id" TEXT NOT NULL,
    "project_id" TEXT NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "environment" VARCHAR(50) NOT NULL DEFAULT 'production',
    "type" VARCHAR(50) NOT NULL DEFAULT 'postgresql',
    "version" VARCHAR(20) NOT NULL DEFAULT '15',
    "size" VARCHAR(50) NOT NULL DEFAULT 'small',
    "used_bytes" BIGINT NOT NULL DEFAULT 0,
    "max_connections" INTEGER NOT NULL DEFAULT 20,
    "status" VARCHAR(50) NOT NULL DEFAULT 'provisioning',
    "host" VARCHAR(255),
    "port" INTEGER,
    "username" VARCHAR(255),
    "connection_info" TEXT,
    "settings" JSONB NOT NULL DEFAULT '{}',
    "backup_retention_days" INTEGER NOT NULL DEFAULT 7,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,
    "cluster_id" TEXT,
    "provider" VARCHAR(50) NOT NULL DEFAULT 'internal-postgres',

    CONSTRAINT "managed_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "databases"."backups" (
    "id" TEXT NOT NULL,
    "database_id" TEXT NOT NULL,
    "filename" VARCHAR(500),
    "size" BIGINT NOT NULL DEFAULT 0,
    "status" VARCHAR(50) NOT NULL DEFAULT 'in_progress',
    "description" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completed_at" TIMESTAMPTZ,

    CONSTRAINT "backups_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "infrastructure"."database_metrics" (
    "id" TEXT NOT NULL,
    "database_id" TEXT NOT NULL,
    "recorded_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "used_bytes" BIGINT NOT NULL DEFAULT 0,
    "active_conns" INTEGER NOT NULL DEFAULT 0,
    "max_conns" INTEGER NOT NULL DEFAULT 0,
    "queries_per_sec" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "last_backup_at" TIMESTAMPTZ,
    "last_backup_size" BIGINT NOT NULL DEFAULT 0,
    "backup_verified" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "database_metrics_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "functions"."instances" (
    "id" TEXT NOT NULL,
    "project_id" TEXT NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "runtime" VARCHAR(50) NOT NULL DEFAULT 'nodejs',
    "entryPoint" VARCHAR(100) NOT NULL DEFAULT 'handler',
    "memoryMb" INTEGER NOT NULL DEFAULT 256,
    "timeoutSeconds" INTEGER NOT NULL DEFAULT 30,
    "envVars" JSONB NOT NULL DEFAULT '{}',
    "settings" JSONB NOT NULL DEFAULT '{}',
    "current_version" VARCHAR(100),
    "status" VARCHAR(50) NOT NULL DEFAULT 'created',
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "instances_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "functions"."logs" (
    "id" TEXT NOT NULL,
    "function_id" TEXT NOT NULL,
    "version" VARCHAR(100) NOT NULL,
    "status" VARCHAR(50) NOT NULL,
    "duration_ms" INTEGER NOT NULL DEFAULT 0,
    "memory_used_mb" INTEGER,
    "request_payload" TEXT,
    "response_output" TEXT,
    "error_message" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "queues"."instances" (
    "id" TEXT NOT NULL,
    "project_id" TEXT NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "type" VARCHAR(50) NOT NULL DEFAULT 'stream',
    "retentionDays" INTEGER NOT NULL DEFAULT 7,
    "maxMessages" INTEGER NOT NULL DEFAULT 100000,
    "maxBytes" INTEGER NOT NULL DEFAULT 1073741824,
    "replicas" INTEGER NOT NULL DEFAULT 1,
    "status" VARCHAR(50) NOT NULL DEFAULT 'active',
    "dead_letter_queue" VARCHAR(255),
    "retryAttempts" INTEGER NOT NULL DEFAULT 3,
    "retryDelaySeconds" INTEGER NOT NULL DEFAULT 60,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "instances_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "queues"."messages" (
    "id" TEXT NOT NULL,
    "queue_id" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "headers" JSONB NOT NULL DEFAULT '{}',
    "status" VARCHAR(50) NOT NULL DEFAULT 'pending',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "scheduled_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "delivered_at" TIMESTAMPTZ,
    "acknowledged_at" TIMESTAMPTZ,
    "failed_at" TIMESTAMPTZ,
    "error_message" TEXT,
    "jetstream_seq" BIGINT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "scheduler"."cron_jobs" (
    "id" TEXT NOT NULL,
    "project_id" TEXT NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "cronExpression" VARCHAR(100) NOT NULL,
    "timezone" VARCHAR(50) NOT NULL DEFAULT 'UTC',
    "endpoint" VARCHAR(500),
    "function_id" VARCHAR(255),
    "payload" JSONB NOT NULL DEFAULT '{}',
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "retryAttempts" INTEGER NOT NULL DEFAULT 3,
    "retryDelaySeconds" INTEGER NOT NULL DEFAULT 60,
    "timeoutSeconds" INTEGER NOT NULL DEFAULT 300,
    "last_run_at" TIMESTAMPTZ,
    "next_run_at" TIMESTAMPTZ,
    "state" VARCHAR(20) NOT NULL DEFAULT 'scheduled',
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "cron_jobs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "scheduler"."runs" (
    "id" TEXT NOT NULL,
    "cron_job_id" TEXT NOT NULL,
    "status" VARCHAR(50) NOT NULL DEFAULT 'running',
    "attempt" INTEGER NOT NULL DEFAULT 1,
    "scheduled_at" TIMESTAMPTZ NOT NULL,
    "started_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completed_at" TIMESTAMPTZ,
    "duration_ms" BIGINT,
    "error_message" TEXT,
    "status_reason" VARCHAR(100),
    "failure_type" VARCHAR(50),
    "payload_snapshot" JSONB,
    "replayed_from_run_id" TEXT,
    "lease_until" TIMESTAMPTZ,
    "heartbeat_at" TIMESTAMPTZ,
    "execution_reason" VARCHAR(50),
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "runs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "monitoring"."metrics" (
    "id" TEXT NOT NULL,
    "project_id" TEXT NOT NULL,
    "metric" VARCHAR(255) NOT NULL,
    "value" DOUBLE PRECISION NOT NULL,
    "labels" JSONB NOT NULL DEFAULT '{}',
    "timestamp" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "metrics_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "monitoring"."alert_rules" (
    "id" TEXT NOT NULL,
    "project_id" TEXT NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "metric" VARCHAR(255) NOT NULL,
    "condition" VARCHAR(50) NOT NULL,
    "threshold" DOUBLE PRECISION NOT NULL,
    "durationSeconds" INTEGER NOT NULL DEFAULT 60,
    "severity" VARCHAR(50) NOT NULL DEFAULT 'warning',
    "channels" JSONB NOT NULL DEFAULT '[]',
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "alert_rules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "monitoring"."alerts" (
    "id" TEXT NOT NULL,
    "project_id" TEXT NOT NULL,
    "rule_id" TEXT NOT NULL,
    "severity" VARCHAR(50) NOT NULL,
    "status" VARCHAR(50) NOT NULL DEFAULT 'pending',
    "message" TEXT NOT NULL,
    "acknowledged_at" TIMESTAMPTZ,
    "resolved_at" TIMESTAMPTZ,
    "first_triggered_at" TIMESTAMPTZ,
    "fired_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "alerts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "monitoring"."notifications" (
    "id" TEXT NOT NULL,
    "alert_id" TEXT NOT NULL,
    "channel_id" TEXT NOT NULL,
    "type" VARCHAR(50) NOT NULL,
    "status" VARCHAR(50) NOT NULL DEFAULT 'pending',
    "error" TEXT,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "sent_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "monitoring"."notification_channels" (
    "id" TEXT NOT NULL,
    "project_id" TEXT NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "type" VARCHAR(50) NOT NULL,
    "config" JSONB NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "notification_channels_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "logging"."streams" (
    "id" TEXT NOT NULL,
    "project_id" TEXT NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "type" VARCHAR(50) NOT NULL DEFAULT 'application',
    "retentionDays" INTEGER NOT NULL DEFAULT 30,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "streams_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "logging"."entries" (
    "id" TEXT NOT NULL,
    "stream_id" TEXT NOT NULL,
    "level" VARCHAR(20) NOT NULL,
    "message" TEXT NOT NULL,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "timestamp" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "entries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "templates"."instances" (
    "id" TEXT NOT NULL,
    "project_id" TEXT NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "description" TEXT,
    "category" VARCHAR(100) NOT NULL,
    "content" TEXT NOT NULL,
    "variables" JSONB NOT NULL DEFAULT '[]',
    "is_public" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "instances_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "ai"."conversations" (
    "id" TEXT NOT NULL,
    "project_id" TEXT NOT NULL,
    "user_id" TEXT,
    "type" VARCHAR(50) NOT NULL DEFAULT 'general',
    "model" VARCHAR(100) NOT NULL,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "token_count" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "conversations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "ai"."messages" (
    "id" TEXT NOT NULL,
    "conversation_id" TEXT NOT NULL,
    "role" VARCHAR(50) NOT NULL,
    "content" TEXT NOT NULL,
    "model" VARCHAR(100) NOT NULL,
    "token_count" INTEGER NOT NULL DEFAULT 0,
    "latency_ms" INTEGER,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "marketplace"."items" (
    "id" TEXT NOT NULL,
    "type" VARCHAR(50) NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "slug" VARCHAR(255) NOT NULL,
    "description" TEXT,
    "category" VARCHAR(100) NOT NULL,
    "subcategory" VARCHAR(100),
    "content" TEXT,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "author_id" VARCHAR(255),
    "author_name" VARCHAR(255),
    "website" VARCHAR(500),
    "github_url" VARCHAR(500),
    "npm_package" VARCHAR(255),
    "version" VARCHAR(50) NOT NULL DEFAULT '1.0.0',
    "downloads" INTEGER NOT NULL DEFAULT 0,
    "rating" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "review_count" INTEGER NOT NULL DEFAULT 0,
    "is_featured" BOOLEAN NOT NULL DEFAULT false,
    "is_verified" BOOLEAN NOT NULL DEFAULT false,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "status" VARCHAR(50) NOT NULL DEFAULT 'pending',
    "submitted_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "approved_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "marketplace"."reviews" (
    "id" TEXT NOT NULL,
    "item_id" TEXT NOT NULL,
    "user_id" VARCHAR(255),
    "user_name" VARCHAR(255),
    "rating" INTEGER NOT NULL,
    "title" VARCHAR(255),
    "content" TEXT,
    "is_verified" BOOLEAN NOT NULL DEFAULT false,
    "helpful" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "reviews_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "platform"."events" (
    "id" TEXT NOT NULL,
    "type" VARCHAR(100) NOT NULL,
    "timestamp" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actor_id" VARCHAR(255),
    "actor_type" VARCHAR(50),
    "resource_type" VARCHAR(100) NOT NULL,
    "resource_id" VARCHAR(255) NOT NULL,
    "project_id" VARCHAR(36),
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "ip_address" VARCHAR(45),
    "user_agent" TEXT,

    CONSTRAINT "events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "platform"."user_notifications" (
    "id" TEXT NOT NULL,
    "user_id" VARCHAR(255) NOT NULL,
    "event_id" VARCHAR(36),
    "type" VARCHAR(100) NOT NULL,
    "title" VARCHAR(255) NOT NULL,
    "message" TEXT NOT NULL,
    "severity" VARCHAR(20) NOT NULL DEFAULT 'info',
    "project_id" VARCHAR(36),
    "resource_type" VARCHAR(100),
    "resource_id" VARCHAR(255),
    "read_at" TIMESTAMPTZ,
    "dismissed_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "platform"."installation_status" (
    "id" TEXT NOT NULL DEFAULT 'installation',
    "lifecycle" "public"."InstallationLifecycle" NOT NULL DEFAULT 'UNCONFIGURED',
    "last_operation_id" TEXT,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "installation_status_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "platform"."installation_operations" (
    "id" TEXT NOT NULL,
    "type" VARCHAR(50) NOT NULL,
    "status" VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    "current_step" VARCHAR(50),
    "steps" JSONB,
    "previous_snapshot" JSONB,
    "failure_reason" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completed_at" TIMESTAMPTZ,

    CONSTRAINT "installation_operations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "platform"."installation_settings_versions" (
    "id" TEXT NOT NULL,
    "changed_by" VARCHAR(255),
    "changed_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reason" TEXT,
    "snapshot" JSONB NOT NULL,
    "operation_id" VARCHAR(36),

    CONSTRAINT "installation_settings_versions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "platform"."installation_settings" (
    "id" TEXT NOT NULL DEFAULT 'installation',
    "platform_name" VARCHAR(255) NOT NULL DEFAULT 'FIDScript Deploy',
    "platform_domain" VARCHAR(255) NOT NULL DEFAULT '',
    "server_ip" VARCHAR(45) NOT NULL DEFAULT '',
    "admin_email" VARCHAR(255) NOT NULL DEFAULT '',
    "auth_method" "public"."AuthMethod" NOT NULL DEFAULT 'PASSWORD',
    "dns_mode" VARCHAR(50) NOT NULL DEFAULT 'cloudflare_auto',
    "branding" JSONB,
    "encrypted_cf_client_id" TEXT,
    "encrypted_cf_client_secret" TEXT,
    "cf_oauth_enabled" BOOLEAN NOT NULL DEFAULT false,
    "cf_connected_at" TIMESTAMPTZ,
    "cf_last_validated_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "installation_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "platform"."integration_providers" (
    "id" TEXT NOT NULL,
    "provider" VARCHAR(50) NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "config" JSONB NOT NULL DEFAULT '{}',
    "last_sync_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "integration_providers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "identity"."user_credentials" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "type" "identity"."CredentialType" NOT NULL,
    "secret_hash" VARCHAR(255),
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "user_credentials_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "identity"."users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "permissions_name_key" ON "identity"."permissions"("name");

-- CreateIndex
CREATE UNIQUE INDEX "organizations_slug_key" ON "identity"."organizations"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "org_roles_organization_id_name_key" ON "identity"."org_roles"("organization_id", "name");

-- CreateIndex
CREATE UNIQUE INDEX "organization_members_organization_id_user_id_key" ON "identity"."organization_members"("organization_id", "user_id");

-- CreateIndex
CREATE UNIQUE INDEX "teams_organization_id_name_key" ON "identity"."teams"("organization_id", "name");

-- CreateIndex
CREATE UNIQUE INDEX "team_members_team_id_user_id_key" ON "identity"."team_members"("team_id", "user_id");

-- CreateIndex
CREATE UNIQUE INDEX "invitations_token_key" ON "identity"."invitations"("token");

-- CreateIndex
CREATE INDEX "invitations_organization_id_email_idx" ON "identity"."invitations"("organization_id", "email");

-- CreateIndex
CREATE INDEX "invitations_token_idx" ON "identity"."invitations"("token");

-- CreateIndex
CREATE INDEX "magic_codes_email_consumed_created_at_idx" ON "identity"."magic_codes"("email", "consumed", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "verification_tokens_token_key" ON "identity"."verification_tokens"("token");

-- CreateIndex
CREATE INDEX "verification_tokens_user_id_type_idx" ON "identity"."verification_tokens"("user_id", "type");

-- CreateIndex
CREATE INDEX "verification_tokens_token_idx" ON "identity"."verification_tokens"("token");

-- CreateIndex
CREATE UNIQUE INDEX "github_connections_user_id_key" ON "identity"."github_connections"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "projects_slug_key" ON "projects"."projects"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "env_vars_project_id_key_key" ON "projects"."env_vars"("project_id", "key");

-- CreateIndex
CREATE INDEX "invitations_project_id_email_idx" ON "projects"."invitations"("project_id", "email");

-- CreateIndex
CREATE INDEX "invitations_token_hash_idx" ON "projects"."invitations"("token_hash");

-- CreateIndex
CREATE INDEX "api_keys_project_id_idx" ON "projects"."api_keys"("project_id");

-- CreateIndex
CREATE UNIQUE INDEX "project_members_project_id_user_id_key" ON "projects"."project_members"("project_id", "user_id");

-- CreateIndex
CREATE UNIQUE INDEX "project_settings_project_id_key" ON "projects"."project_settings"("project_id");

-- CreateIndex
CREATE UNIQUE INDEX "project_settings_active_deployment_id_key" ON "projects"."project_settings"("active_deployment_id");

-- CreateIndex
CREATE UNIQUE INDEX "project_storage_configs_project_id_key" ON "storage"."project_storage_configs"("project_id");

-- CreateIndex
CREATE INDEX "releases_project_id_created_at_idx" ON "projects"."releases"("project_id", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "releases_project_id_version_key" ON "projects"."releases"("project_id", "version");

-- CreateIndex
CREATE UNIQUE INDEX "build_configs_project_id_key" ON "projects"."build_configs"("project_id");

-- CreateIndex
CREATE UNIQUE INDEX "domains_project_id_domain_key" ON "projects"."domains"("project_id", "domain");

-- CreateIndex
CREATE INDEX "domain_webhooks_domain_id_enabled_idx" ON "projects"."domain_webhooks"("domain_id", "enabled");

-- CreateIndex
CREATE INDEX "domain_webhooks_project_id_enabled_idx" ON "projects"."domain_webhooks"("project_id", "enabled");

-- CreateIndex
CREATE INDEX "domain_email_keys_domain_id_active_idx" ON "projects"."domain_email_keys"("domain_id", "active");

-- CreateIndex
CREATE UNIQUE INDEX "domain_email_keys_domain_id_selector_key" ON "projects"."domain_email_keys"("domain_id", "selector");

-- CreateIndex
CREATE INDEX "managed_dns_records_domain_id_managedBy_idx" ON "projects"."managed_dns_records"("domain_id", "managedBy");

-- CreateIndex
CREATE INDEX "managed_dns_records_domain_id_source_idx" ON "projects"."managed_dns_records"("domain_id", "source");

-- CreateIndex
CREATE UNIQUE INDEX "managed_dns_records_domain_id_type_name_key" ON "projects"."managed_dns_records"("domain_id", "type", "name");

-- CreateIndex
CREATE INDEX "domain_change_sets_domain_id_created_at_idx" ON "projects"."domain_change_sets"("domain_id", "created_at");

-- CreateIndex
CREATE INDEX "domain_change_sets_project_id_created_at_idx" ON "projects"."domain_change_sets"("project_id", "created_at");

-- CreateIndex
CREATE INDEX "domain_change_sets_status_created_at_idx" ON "projects"."domain_change_sets"("status", "created_at");

-- CreateIndex
CREATE INDEX "domain_health_checks_domain_id_checked_at_idx" ON "projects"."domain_health_checks"("domain_id", "checked_at");

-- CreateIndex
CREATE INDEX "domain_verification_runs_domain_id_created_at_idx" ON "projects"."domain_verification_runs"("domain_id", "created_at");

-- CreateIndex
CREATE INDEX "domain_incidents_domain_id_status_idx" ON "projects"."domain_incidents"("domain_id", "status");

-- CreateIndex
CREATE INDEX "domain_incidents_domain_id_opened_at_idx" ON "projects"."domain_incidents"("domain_id", "opened_at");

-- CreateIndex
CREATE UNIQUE INDEX "domain_repair_policies_domain_id_key" ON "projects"."domain_repair_policies"("domain_id");

-- CreateIndex
CREATE INDEX "domain_repair_runs_domain_id_started_at_idx" ON "projects"."domain_repair_runs"("domain_id", "started_at");

-- CreateIndex
CREATE INDEX "domain_repair_runs_domain_id_status_idx" ON "projects"."domain_repair_runs"("domain_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "app_users_project_id_email_key" ON "projects"."app_users"("project_id", "email");

-- CreateIndex
CREATE UNIQUE INDEX "app_roles_project_id_name_key" ON "projects"."app_roles"("project_id", "name");

-- CreateIndex
CREATE INDEX "auth_providers_project_id_idx" ON "projects"."auth_providers"("project_id");

-- CreateIndex
CREATE UNIQUE INDEX "auth_providers_project_id_provider_key" ON "projects"."auth_providers"("project_id", "provider");

-- CreateIndex
CREATE INDEX "app_oauth_accounts_project_id_idx" ON "projects"."app_oauth_accounts"("project_id");

-- CreateIndex
CREATE UNIQUE INDEX "app_oauth_accounts_provider_provider_user_id_key" ON "projects"."app_oauth_accounts"("provider", "provider_user_id");

-- CreateIndex
CREATE UNIQUE INDEX "app_oauth_accounts_app_user_id_provider_key" ON "projects"."app_oauth_accounts"("app_user_id", "provider");

-- CreateIndex
CREATE UNIQUE INDEX "domains_project_id_domain_key" ON "email"."domains"("project_id", "domain");

-- CreateIndex
CREATE UNIQUE INDEX "mailboxes_domain_id_localPart_key" ON "email"."mailboxes"("domain_id", "localPart");

-- CreateIndex
CREATE UNIQUE INDEX "aliases_domain_id_localPart_key" ON "email"."aliases"("domain_id", "localPart");

-- CreateIndex
CREATE UNIQUE INDEX "sender_identities_domain_id_email_key" ON "email"."sender_identities"("domain_id", "email");

-- CreateIndex
CREATE INDEX "messages_mailbox_id_created_at_idx" ON "email"."messages"("mailbox_id", "created_at");

-- CreateIndex
CREATE INDEX "messages_project_id_created_at_idx" ON "email"."messages"("project_id", "created_at");

-- CreateIndex
CREATE INDEX "messages_conversation_id_idx" ON "email"."messages"("conversation_id");

-- CreateIndex
CREATE INDEX "email_tracking_events_message_id_idx" ON "email"."email_tracking_events"("message_id");

-- CreateIndex
CREATE INDEX "email_tracking_events_project_id_created_at_idx" ON "email"."email_tracking_events"("project_id", "created_at");

-- CreateIndex
CREATE INDEX "email_webhook_subscriptions_project_id_idx" ON "email"."email_webhook_subscriptions"("project_id");

-- CreateIndex
CREATE INDEX "email_delivery_attempts_message_id_attempt_idx" ON "email"."email_delivery_attempts"("message_id", "attempt");

-- CreateIndex
CREATE UNIQUE INDEX "catch_all_rules_domain_id_key" ON "email"."catch_all_rules"("domain_id");

-- CreateIndex
CREATE INDEX "email_templates_project_id_idx" ON "email"."email_templates"("project_id");

-- CreateIndex
CREATE UNIQUE INDEX "email_templates_project_id_name_key" ON "email"."email_templates"("project_id", "name");

-- CreateIndex
CREATE UNIQUE INDEX "email_message_templates_message_id_key" ON "email"."email_message_templates"("message_id");

-- CreateIndex
CREATE UNIQUE INDEX "suppressions_domain_id_email_key" ON "email"."suppressions"("domain_id", "email");

-- CreateIndex
CREATE INDEX "api_usage_project_id_date_idx" ON "email"."api_usage"("project_id", "date");

-- CreateIndex
CREATE UNIQUE INDEX "api_usage_project_id_api_key_id_date_key" ON "email"."api_usage"("project_id", "api_key_id", "date");

-- CreateIndex
CREATE UNIQUE INDEX "email_warmup_domain_id_key" ON "email"."email_warmup"("domain_id");

-- CreateIndex
CREATE UNIQUE INDEX "mailbox_members_mailbox_id_user_id_key" ON "email"."mailbox_members"("mailbox_id", "user_id");

-- CreateIndex
CREATE UNIQUE INDEX "mailbox_members_mailbox_id_api_key_id_key" ON "email"."mailbox_members"("mailbox_id", "api_key_id");

-- CreateIndex
CREATE UNIQUE INDEX "conversations_threadKey_key" ON "email"."conversations"("threadKey");

-- CreateIndex
CREATE INDEX "conversations_mailbox_id_status_idx" ON "email"."conversations"("mailbox_id", "status");

-- CreateIndex
CREATE INDEX "retention_policies_project_id_scope_scope_id_idx" ON "email"."retention_policies"("project_id", "scope", "scope_id");

-- CreateIndex
CREATE INDEX "idempotency_records_project_id_idx" ON "email"."idempotency_records"("project_id");

-- CreateIndex
CREATE INDEX "idempotency_records_expires_at_idx" ON "email"."idempotency_records"("expires_at");

-- CreateIndex
CREATE INDEX "email_attachments_message_id_idx" ON "email"."email_attachments"("message_id");

-- CreateIndex
CREATE UNIQUE INDEX "channels_project_id_name_key" ON "realtime"."channels"("project_id", "name");

-- CreateIndex
CREATE UNIQUE INDEX "presence_project_id_userId_channel_id_key" ON "realtime"."presence"("project_id", "userId", "channel_id");

-- CreateIndex
CREATE UNIQUE INDEX "managed_project_id_environment_name_key" ON "databases"."managed"("project_id", "environment", "name");

-- CreateIndex
CREATE INDEX "database_metrics_database_id_recorded_at_idx" ON "infrastructure"."database_metrics"("database_id", "recorded_at");

-- CreateIndex
CREATE UNIQUE INDEX "instances_project_id_name_key" ON "functions"."instances"("project_id", "name");

-- CreateIndex
CREATE UNIQUE INDEX "instances_project_id_name_key" ON "queues"."instances"("project_id", "name");

-- CreateIndex
CREATE UNIQUE INDEX "cron_jobs_project_id_name_key" ON "scheduler"."cron_jobs"("project_id", "name");

-- CreateIndex
CREATE UNIQUE INDEX "runs_cron_job_id_scheduled_at_attempt_key" ON "scheduler"."runs"("cron_job_id", "scheduled_at", "attempt");

-- CreateIndex
CREATE INDEX "metrics_project_id_metric_timestamp_idx" ON "monitoring"."metrics"("project_id", "metric", "timestamp");

-- CreateIndex
CREATE INDEX "notifications_alert_id_idx" ON "monitoring"."notifications"("alert_id");

-- CreateIndex
CREATE UNIQUE INDEX "streams_project_id_name_key" ON "logging"."streams"("project_id", "name");

-- CreateIndex
CREATE INDEX "entries_stream_id_timestamp_idx" ON "logging"."entries"("stream_id", "timestamp");

-- CreateIndex
CREATE INDEX "entries_stream_id_level_idx" ON "logging"."entries"("stream_id", "level");

-- CreateIndex
CREATE UNIQUE INDEX "instances_project_id_name_key" ON "templates"."instances"("project_id", "name");

-- CreateIndex
CREATE INDEX "conversations_project_id_created_at_idx" ON "ai"."conversations"("project_id", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "items_slug_key" ON "marketplace"."items"("slug");

-- CreateIndex
CREATE INDEX "items_type_status_is_active_idx" ON "marketplace"."items"("type", "status", "is_active");

-- CreateIndex
CREATE INDEX "items_type_category_idx" ON "marketplace"."items"("type", "category");

-- CreateIndex
CREATE INDEX "items_author_id_idx" ON "marketplace"."items"("author_id");

-- CreateIndex
CREATE UNIQUE INDEX "reviews_item_id_user_id_key" ON "marketplace"."reviews"("item_id", "user_id");

-- CreateIndex
CREATE INDEX "events_type_timestamp_idx" ON "platform"."events"("type", "timestamp");

-- CreateIndex
CREATE INDEX "events_resource_type_resource_id_idx" ON "platform"."events"("resource_type", "resource_id");

-- CreateIndex
CREATE INDEX "events_actor_id_idx" ON "platform"."events"("actor_id");

-- CreateIndex
CREATE INDEX "events_project_id_timestamp_idx" ON "platform"."events"("project_id", "timestamp");

-- CreateIndex
CREATE INDEX "user_notifications_user_id_read_at_idx" ON "platform"."user_notifications"("user_id", "read_at");

-- CreateIndex
CREATE INDEX "user_notifications_user_id_severity_created_at_idx" ON "platform"."user_notifications"("user_id", "severity", "created_at");

-- CreateIndex
CREATE INDEX "user_notifications_project_id_created_at_idx" ON "platform"."user_notifications"("project_id", "created_at");

-- CreateIndex
CREATE INDEX "user_notifications_type_created_at_idx" ON "platform"."user_notifications"("type", "created_at");

-- CreateIndex
CREATE INDEX "installation_operations_status_idx" ON "platform"."installation_operations"("status");

-- CreateIndex
CREATE UNIQUE INDEX "integration_providers_provider_key" ON "platform"."integration_providers"("provider");

-- CreateIndex
CREATE UNIQUE INDEX "user_credentials_user_id_type_key" ON "identity"."user_credentials"("user_id", "type");

-- AddForeignKey
ALTER TABLE "identity"."org_roles" ADD CONSTRAINT "org_roles_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "identity"."organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "identity"."organization_members" ADD CONSTRAINT "organization_members_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "identity"."organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "identity"."organization_members" ADD CONSTRAINT "organization_members_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "identity"."org_roles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "identity"."organization_members" ADD CONSTRAINT "organization_members_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "identity"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "identity"."teams" ADD CONSTRAINT "teams_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "identity"."organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "identity"."team_members" ADD CONSTRAINT "team_members_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "identity"."teams"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "identity"."team_members" ADD CONSTRAINT "team_members_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "identity"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "identity"."invitations" ADD CONSTRAINT "invitations_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "identity"."organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "identity"."invitations" ADD CONSTRAINT "invitations_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "identity"."org_roles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "identity"."sessions" ADD CONSTRAINT "sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "identity"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "identity"."api_keys" ADD CONSTRAINT "api_keys_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "identity"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "identity"."audit_logs" ADD CONSTRAINT "audit_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "identity"."users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "identity"."verification_tokens" ADD CONSTRAINT "verification_tokens_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "identity"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "identity"."github_connections" ADD CONSTRAINT "github_connections_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "identity"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "projects"."projects" ADD CONSTRAINT "projects_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "identity"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "projects"."env_vars" ADD CONSTRAINT "env_vars_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"."projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "projects"."invitations" ADD CONSTRAINT "invitations_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"."projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "projects"."api_keys" ADD CONSTRAINT "api_keys_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"."projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "projects"."project_members" ADD CONSTRAINT "project_members_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"."projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "projects"."project_members" ADD CONSTRAINT "project_members_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "identity"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "projects"."project_settings" ADD CONSTRAINT "project_settings_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"."projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "projects"."project_settings" ADD CONSTRAINT "project_settings_active_deployment_id_fkey" FOREIGN KEY ("active_deployment_id") REFERENCES "projects"."deployments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "storage"."buckets" ADD CONSTRAINT "buckets_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"."projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "storage"."files" ADD CONSTRAINT "files_bucket_id_fkey" FOREIGN KEY ("bucket_id") REFERENCES "storage"."buckets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "storage"."project_storage_configs" ADD CONSTRAINT "project_storage_configs_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"."projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "projects"."releases" ADD CONSTRAINT "releases_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"."projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "projects"."deployments" ADD CONSTRAINT "deployments_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"."projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "projects"."deployments" ADD CONSTRAINT "deployments_release_id_fkey" FOREIGN KEY ("release_id") REFERENCES "projects"."releases"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "projects"."deployments" ADD CONSTRAINT "deployments_rolled_back_to_fkey" FOREIGN KEY ("rolled_back_to") REFERENCES "projects"."deployments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "projects"."build_configs" ADD CONSTRAINT "build_configs_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"."projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "projects"."domains" ADD CONSTRAINT "domains_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"."projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "projects"."domains" ADD CONSTRAINT "domains_deployment_id_fkey" FOREIGN KEY ("deployment_id") REFERENCES "projects"."deployments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "projects"."domains" ADD CONSTRAINT "domains_dns_connection_id_fkey" FOREIGN KEY ("dns_connection_id") REFERENCES "projects"."dns_connections"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "projects"."domain_webhooks" ADD CONSTRAINT "domain_webhooks_domain_id_fkey" FOREIGN KEY ("domain_id") REFERENCES "projects"."domains"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "projects"."domain_email_keys" ADD CONSTRAINT "domain_email_keys_domain_id_fkey" FOREIGN KEY ("domain_id") REFERENCES "projects"."domains"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "projects"."managed_dns_records" ADD CONSTRAINT "managed_dns_records_domain_id_fkey" FOREIGN KEY ("domain_id") REFERENCES "projects"."domains"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "projects"."domain_change_sets" ADD CONSTRAINT "domain_change_sets_domain_id_fkey" FOREIGN KEY ("domain_id") REFERENCES "projects"."domains"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "projects"."domain_health_checks" ADD CONSTRAINT "domain_health_checks_domain_id_fkey" FOREIGN KEY ("domain_id") REFERENCES "projects"."domains"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "projects"."domain_verification_runs" ADD CONSTRAINT "domain_verification_runs_domain_id_fkey" FOREIGN KEY ("domain_id") REFERENCES "projects"."domains"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "projects"."domain_incidents" ADD CONSTRAINT "domain_incidents_domain_id_fkey" FOREIGN KEY ("domain_id") REFERENCES "projects"."domains"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "projects"."domain_repair_policies" ADD CONSTRAINT "domain_repair_policies_domain_id_fkey" FOREIGN KEY ("domain_id") REFERENCES "projects"."domains"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "projects"."domain_repair_runs" ADD CONSTRAINT "domain_repair_runs_domain_id_fkey" FOREIGN KEY ("domain_id") REFERENCES "projects"."domains"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "projects"."domain_repair_runs" ADD CONSTRAINT "domain_repair_runs_incident_id_fkey" FOREIGN KEY ("incident_id") REFERENCES "projects"."domain_incidents"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "projects"."app_users" ADD CONSTRAINT "app_users_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"."projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "projects"."app_sessions" ADD CONSTRAINT "app_sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "projects"."app_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "projects"."app_roles" ADD CONSTRAINT "app_roles_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"."projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "projects"."app_user_roles" ADD CONSTRAINT "app_user_roles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "projects"."app_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "projects"."app_user_roles" ADD CONSTRAINT "app_user_roles_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "projects"."app_roles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "projects"."auth_providers" ADD CONSTRAINT "auth_providers_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"."projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "projects"."app_oauth_accounts" ADD CONSTRAINT "app_oauth_accounts_app_user_id_fkey" FOREIGN KEY ("app_user_id") REFERENCES "projects"."app_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "projects"."app_oauth_accounts" ADD CONSTRAINT "app_oauth_accounts_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"."projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "email"."domains" ADD CONSTRAINT "domains_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"."projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "email"."mailboxes" ADD CONSTRAINT "mailboxes_domain_id_fkey" FOREIGN KEY ("domain_id") REFERENCES "email"."domains"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "email"."aliases" ADD CONSTRAINT "aliases_domain_id_fkey" FOREIGN KEY ("domain_id") REFERENCES "email"."domains"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "email"."sender_identities" ADD CONSTRAINT "sender_identities_domain_id_fkey" FOREIGN KEY ("domain_id") REFERENCES "email"."domains"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "email"."api_keys" ADD CONSTRAINT "api_keys_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"."projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "email"."api_keys" ADD CONSTRAINT "api_keys_rate_limit_plan_id_fkey" FOREIGN KEY ("rate_limit_plan_id") REFERENCES "email"."rate_limit_plans"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "email"."messages" ADD CONSTRAINT "messages_mailbox_id_fkey" FOREIGN KEY ("mailbox_id") REFERENCES "email"."mailboxes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "email"."messages" ADD CONSTRAINT "messages_sender_identity_id_fkey" FOREIGN KEY ("sender_identity_id") REFERENCES "email"."sender_identities"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "email"."messages" ADD CONSTRAINT "messages_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"."projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "email"."messages" ADD CONSTRAINT "messages_conversation_id_fkey" FOREIGN KEY ("conversation_id") REFERENCES "email"."conversations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "email"."email_delivery_attempts" ADD CONSTRAINT "email_delivery_attempts_message_id_fkey" FOREIGN KEY ("message_id") REFERENCES "email"."messages"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "email"."catch_all_rules" ADD CONSTRAINT "catch_all_rules_domain_id_fkey" FOREIGN KEY ("domain_id") REFERENCES "email"."domains"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "email"."email_templates" ADD CONSTRAINT "email_templates_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"."projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "email"."email_message_templates" ADD CONSTRAINT "email_message_templates_message_id_fkey" FOREIGN KEY ("message_id") REFERENCES "email"."messages"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "email"."email_message_templates" ADD CONSTRAINT "email_message_templates_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "email"."email_templates"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "email"."suppressions" ADD CONSTRAINT "suppressions_domain_id_fkey" FOREIGN KEY ("domain_id") REFERENCES "email"."domains"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "email"."api_usage" ADD CONSTRAINT "api_usage_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"."projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "email"."api_usage" ADD CONSTRAINT "api_usage_api_key_id_fkey" FOREIGN KEY ("api_key_id") REFERENCES "email"."api_keys"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "email"."domain_reputations" ADD CONSTRAINT "domain_reputations_domain_id_fkey" FOREIGN KEY ("domain_id") REFERENCES "email"."domains"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "email"."email_warmup" ADD CONSTRAINT "email_warmup_domain_id_fkey" FOREIGN KEY ("domain_id") REFERENCES "email"."domains"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "email"."mailbox_members" ADD CONSTRAINT "mailbox_members_mailbox_id_fkey" FOREIGN KEY ("mailbox_id") REFERENCES "email"."mailboxes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "email"."mailbox_members" ADD CONSTRAINT "mailbox_members_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "identity"."users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "email"."mailbox_members" ADD CONSTRAINT "mailbox_members_api_key_id_fkey" FOREIGN KEY ("api_key_id") REFERENCES "email"."api_keys"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "email"."conversations" ADD CONSTRAINT "conversations_mailbox_id_fkey" FOREIGN KEY ("mailbox_id") REFERENCES "email"."mailboxes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "email"."conversation_assignments" ADD CONSTRAINT "conversation_assignments_conversation_id_fkey" FOREIGN KEY ("conversation_id") REFERENCES "email"."conversations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "email"."conversation_assignments" ADD CONSTRAINT "conversation_assignments_member_id_fkey" FOREIGN KEY ("member_id") REFERENCES "email"."mailbox_members"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "email"."legal_holds" ADD CONSTRAINT "legal_holds_mailbox_id_fkey" FOREIGN KEY ("mailbox_id") REFERENCES "email"."mailboxes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "realtime"."channels" ADD CONSTRAINT "channels_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"."projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "realtime"."messages" ADD CONSTRAINT "messages_channel_id_fkey" FOREIGN KEY ("channel_id") REFERENCES "realtime"."channels"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "realtime"."presence" ADD CONSTRAINT "presence_channel_id_fkey" FOREIGN KEY ("channel_id") REFERENCES "realtime"."channels"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "databases"."managed" ADD CONSTRAINT "managed_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"."projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "databases"."backups" ADD CONSTRAINT "backups_database_id_fkey" FOREIGN KEY ("database_id") REFERENCES "databases"."managed"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "infrastructure"."database_metrics" ADD CONSTRAINT "database_metrics_database_id_fkey" FOREIGN KEY ("database_id") REFERENCES "databases"."managed"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "functions"."instances" ADD CONSTRAINT "instances_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"."projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "functions"."logs" ADD CONSTRAINT "logs_function_id_fkey" FOREIGN KEY ("function_id") REFERENCES "functions"."instances"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "queues"."instances" ADD CONSTRAINT "instances_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"."projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "queues"."messages" ADD CONSTRAINT "messages_queue_id_fkey" FOREIGN KEY ("queue_id") REFERENCES "queues"."instances"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scheduler"."cron_jobs" ADD CONSTRAINT "cron_jobs_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"."projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scheduler"."runs" ADD CONSTRAINT "runs_replayed_from_run_id_fkey" FOREIGN KEY ("replayed_from_run_id") REFERENCES "scheduler"."runs"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scheduler"."runs" ADD CONSTRAINT "runs_cron_job_id_fkey" FOREIGN KEY ("cron_job_id") REFERENCES "scheduler"."cron_jobs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "monitoring"."metrics" ADD CONSTRAINT "metrics_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"."projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "monitoring"."alert_rules" ADD CONSTRAINT "alert_rules_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"."projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "monitoring"."alerts" ADD CONSTRAINT "alerts_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"."projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "monitoring"."alerts" ADD CONSTRAINT "alerts_rule_id_fkey" FOREIGN KEY ("rule_id") REFERENCES "monitoring"."alert_rules"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "monitoring"."notifications" ADD CONSTRAINT "notifications_alert_id_fkey" FOREIGN KEY ("alert_id") REFERENCES "monitoring"."alerts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "monitoring"."notification_channels" ADD CONSTRAINT "notification_channels_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"."projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "logging"."streams" ADD CONSTRAINT "streams_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"."projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "logging"."entries" ADD CONSTRAINT "entries_stream_id_fkey" FOREIGN KEY ("stream_id") REFERENCES "logging"."streams"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "templates"."instances" ADD CONSTRAINT "instances_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"."projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai"."conversations" ADD CONSTRAINT "conversations_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"."projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai"."messages" ADD CONSTRAINT "messages_conversation_id_fkey" FOREIGN KEY ("conversation_id") REFERENCES "ai"."conversations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "marketplace"."reviews" ADD CONSTRAINT "reviews_item_id_fkey" FOREIGN KEY ("item_id") REFERENCES "marketplace"."items"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "identity"."user_credentials" ADD CONSTRAINT "user_credentials_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "identity"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

