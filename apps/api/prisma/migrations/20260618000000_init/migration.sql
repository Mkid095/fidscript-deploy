-- CreateEnum
CREATE TYPE "Role" AS ENUM ('USER', 'ADMIN', 'OWNER');

-- CreateEnum
CREATE TYPE "ProjectType" AS ENUM ('FRONTEND', 'BACKEND', 'WORKER', 'CRON', 'DOCKER', 'STATIC');

-- CreateEnum
CREATE TYPE "ProjectStatus" AS ENUM ('CREATING', 'ACTIVE', 'SUSPENDED', 'ARCHIVED', 'DELETED');

-- CreateEnum
CREATE TYPE "DeploymentStatus" AS ENUM ('PENDING', 'QUEUED', 'BUILDING', 'DEPLOYING', 'SUCCESS', 'FAILED', 'STOPPED', 'BLOCKED', 'ROLLED_BACK');

-- CreateEnum
CREATE TYPE "DomainStatus" AS ENUM ('PENDING', 'OWNERSHIP_PENDING', 'VALIDATING', 'TLS_PENDING', 'ACTIVE', 'BROKEN', 'FAILED');

-- CreateEnum
CREATE TYPE "SslStatus" AS ENUM ('PENDING', 'ISSUING', 'ACTIVE', 'FAILED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "EmailDomainStatus" AS ENUM ('PENDING', 'VERIFIED', 'ACTIVE', 'FAILED');

-- CreateEnum
CREATE TYPE "SuppressionReason" AS ENUM ('BOUNCE', 'COMPLAINT', 'UNSUBSCRIBE', 'MANUAL');

-- CreateEnum
CREATE TYPE "EmailStatus" AS ENUM ('QUEUED', 'SUBMITTED', 'ACCEPTED', 'BOUNCED', 'FAILED');

-- CreateTable
CREATE TABLE "identity.users" (
    "id" TEXT NOT NULL,
    "email" VARCHAR(255) NOT NULL,
    "password_hash" VARCHAR(255),
    "name" VARCHAR(255),
    "avatar_url" TEXT,
    "role" "Role" NOT NULL DEFAULT 'USER',
    "mfa_enabled" BOOLEAN NOT NULL DEFAULT false,
    "mfa_secret" VARCHAR(255),
    "last_login_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "identity.users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "identity.sessions" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "token_hash" VARCHAR(255) NOT NULL,
    "expires_at" TIMESTAMPTZ NOT NULL,
    "ip_address" VARCHAR(45),
    "user_agent" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "identity.sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "identity.api_keys" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "key_hash" VARCHAR(255) NOT NULL,
    "permissions" JSONB NOT NULL DEFAULT '[]',
    "last_used_at" TIMESTAMPTZ,
    "expires_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "identity.api_keys_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "identity.audit_logs" (
    "id" TEXT NOT NULL,
    "user_id" TEXT,
    "action" VARCHAR(100) NOT NULL,
    "resource_type" VARCHAR(100),
    "resource_id" VARCHAR(100),
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "ip_address" VARCHAR(45),
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "identity.audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "projects.projects" (
    "id" TEXT NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "slug" VARCHAR(255) NOT NULL,
    "description" TEXT,
    "type" "ProjectType" NOT NULL DEFAULT 'FRONTEND',
    "status" "ProjectStatus" NOT NULL DEFAULT 'CREATING',
    "owner_id" TEXT NOT NULL,
    "region" VARCHAR(100),
    "subdomain" VARCHAR(255),
    "custom_domains" JSONB NOT NULL DEFAULT '[]',
    "build_settings" JSONB NOT NULL DEFAULT '{}',
    "deployment_strategy" TEXT NOT NULL DEFAULT 'buildpack',
    "source_provider" VARCHAR(50),
    "source_repo" VARCHAR(500),
    "source_branch" TEXT NOT NULL DEFAULT 'main',
    "last_deploy_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "projects.projects_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "projects.env_vars" (
    "id" TEXT NOT NULL,
    "project_id" TEXT NOT NULL,
    "key" VARCHAR(255) NOT NULL,
    "value" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "projects.env_vars_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "projects.invitations" (
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

    CONSTRAINT "projects.invitations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "projects.api_keys" (
    "id" TEXT NOT NULL,
    "project_id" TEXT NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "key_hash" VARCHAR(255) NOT NULL,
    "permissions" JSONB NOT NULL DEFAULT '[]',
    "last_used_at" TIMESTAMPTZ,
    "expires_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "projects.api_keys_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "projects.project_members" (
    "id" TEXT NOT NULL,
    "project_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "role" VARCHAR(100) NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "projects.project_members_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "projects.project_settings" (
    "id" TEXT NOT NULL,
    "project_id" TEXT NOT NULL,
    "settings" JSONB NOT NULL DEFAULT '{}',
    "active_deployment_id" TEXT,
    "writable_mounts" JSONB NOT NULL DEFAULT '[]',
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "projects.project_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "buckets" (
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
CREATE TABLE "files" (
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
CREATE TABLE "projects.releases" (
    "id" TEXT NOT NULL,
    "project_id" TEXT NOT NULL,
    "commitSha" VARCHAR(40) NOT NULL,
    "source_branch" TEXT NOT NULL DEFAULT 'main',
    "imageTag" VARCHAR(255) NOT NULL,
    "version" VARCHAR(50) NOT NULL,
    "buildLogs" TEXT,
    "build_duration_ms" INTEGER,
    "created_by" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "projects.releases_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "projects.deployments" (
    "id" TEXT NOT NULL,
    "project_id" TEXT NOT NULL,
    "release_id" TEXT,
    "status" "DeploymentStatus" NOT NULL DEFAULT 'PENDING',
    "deployment_url" TEXT,
    "rolled_back_to" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completed_at" TIMESTAMPTZ,

    CONSTRAINT "projects.deployments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "projects.build_configs" (
    "id" TEXT NOT NULL,
    "project_id" TEXT NOT NULL,
    "strategy" TEXT NOT NULL DEFAULT 'dockerfile',
    "build_command" TEXT,
    "output_directory" VARCHAR(255),
    "health_check_path" VARCHAR(255),
    "health_check_port" INTEGER NOT NULL DEFAULT 3000,
    "startup_timeout_seconds" INTEGER NOT NULL DEFAULT 120,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "projects.build_configs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "projects.domains" (
    "id" TEXT NOT NULL,
    "project_id" TEXT NOT NULL,
    "deployment_id" TEXT,
    "dns_connection_id" TEXT,
    "domain" VARCHAR(255) NOT NULL,
    "is_custom" BOOLEAN NOT NULL DEFAULT false,
    "is_primary" BOOLEAN NOT NULL DEFAULT false,
    "apex_domain" BOOLEAN NOT NULL DEFAULT false,
    "dns_mode" TEXT NOT NULL DEFAULT 'manual',
    "redirect_mode" TEXT NOT NULL DEFAULT 'none',
    "ssl_enabled" BOOLEAN NOT NULL DEFAULT true,
    "ssl_status" "SslStatus" NOT NULL DEFAULT 'PENDING',
    "ssl_method" TEXT NOT NULL DEFAULT 'letsencrypt',
    "ssl_cert_arn" VARCHAR(255),
    "ssl_expires_at" TIMESTAMPTZ,
    "ssl_issued_at" TIMESTAMPTZ,
    "ssl_last_checked_at" TIMESTAMPTZ,
    "ssl_last_error" TEXT,
    "dns_status" "DomainStatus" NOT NULL DEFAULT 'PENDING',
    "dns_verified_at" TIMESTAMPTZ,
    "routing_verified_at" TIMESTAMPTZ,
    "email_warning" BOOLEAN NOT NULL DEFAULT false,
    "email_provider" VARCHAR(100),
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "projects.domains_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "projects.dns_connections" (
    "id" TEXT NOT NULL,
    "project_id" TEXT NOT NULL,
    "provider" VARCHAR(50) NOT NULL,
    "encrypted_token" TEXT NOT NULL,
    "token_id" VARCHAR(255),
    "permissions" JSONB NOT NULL DEFAULT '{}',
    "email" VARCHAR(255),
    "last_verified_at" TIMESTAMPTZ NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "projects.dns_connections_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "projects.domain_health_checks" (
    "id" TEXT NOT NULL,
    "domain_id" TEXT NOT NULL,
    "checked_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dns_ok" BOOLEAN NOT NULL DEFAULT false,
    "routing_ok" BOOLEAN NOT NULL DEFAULT false,
    "ssl_ok" BOOLEAN NOT NULL DEFAULT false,
    "response_time_ms" INTEGER,
    "ssl_expires_in_days" INTEGER,
    "status" VARCHAR(20) NOT NULL,
    "error_message" TEXT,

    CONSTRAINT "projects.domain_health_checks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "projects.app_users" (
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

    CONSTRAINT "projects.app_users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "projects.app_sessions" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "token_hash" VARCHAR(255) NOT NULL,
    "expires_at" TIMESTAMPTZ NOT NULL,
    "ip_address" VARCHAR(45),
    "user_agent" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "projects.app_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "projects.app_roles" (
    "id" TEXT NOT NULL,
    "project_id" TEXT NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "permissions" JSONB NOT NULL DEFAULT '[]',
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "projects.app_roles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "projects.app_user_roles" (
    "user_id" TEXT NOT NULL,
    "role_id" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "projects.app_user_roles_pkey" PRIMARY KEY ("user_id","role_id")
);

-- CreateTable
CREATE TABLE "domains" (
    "id" TEXT NOT NULL,
    "project_id" TEXT NOT NULL,
    "domain" VARCHAR(255) NOT NULL,
    "status" "EmailDomainStatus" NOT NULL DEFAULT 'PENDING',
    "dkim_verified" BOOLEAN NOT NULL DEFAULT false,
    "spf_verified" BOOLEAN NOT NULL DEFAULT false,
    "dmarc_verified" BOOLEAN NOT NULL DEFAULT false,
    "mx_verified" BOOLEAN NOT NULL DEFAULT false,
    "dkim_selector" VARCHAR(255),
    "ownership_token" VARCHAR(255),
    "verified_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "domains_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mailboxes" (
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
CREATE TABLE "aliases" (
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
CREATE TABLE "sender_identities" (
    "id" TEXT NOT NULL,
    "domain_id" TEXT NOT NULL,
    "email" VARCHAR(255) NOT NULL,
    "name" VARCHAR(255),
    "is_verified" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sender_identities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "api_keys" (
    "id" TEXT NOT NULL,
    "project_id" TEXT NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "key_hash" VARCHAR(255) NOT NULL,
    "scopes" TEXT[] DEFAULT ARRAY['email.send']::TEXT[],
    "last_used_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "api_keys_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "messages" (
    "id" TEXT NOT NULL,
    "mailbox_id" TEXT,
    "sender_identity_id" TEXT,
    "project_id" TEXT NOT NULL,
    "from" VARCHAR(255) NOT NULL,
    "to" VARCHAR(255) NOT NULL,
    "subject" VARCHAR(500) NOT NULL,
    "size_bytes" BIGINT NOT NULL DEFAULT 0,
    "is_read" BOOLEAN NOT NULL DEFAULT false,
    "is_starred" BOOLEAN NOT NULL DEFAULT false,
    "is_draft" BOOLEAN NOT NULL DEFAULT false,
    "spam_score" DOUBLE PRECISION,
    "status" "EmailStatus" NOT NULL DEFAULT 'QUEUED',
    "error" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "catch_all_rules" (
    "id" TEXT NOT NULL,
    "domain_id" TEXT NOT NULL,
    "target" JSONB NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "messages_per_minute" INTEGER NOT NULL DEFAULT 60,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "catch_all_rules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "suppressions" (
    "id" TEXT NOT NULL,
    "domain_id" TEXT NOT NULL,
    "email" VARCHAR(255) NOT NULL,
    "reason" "SuppressionReason" NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "suppressions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "api_usage" (
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
CREATE TABLE "channels" (
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
CREATE TABLE "messages" (
    "id" TEXT NOT NULL,
    "channel_id" TEXT NOT NULL,
    "userId" VARCHAR(255) NOT NULL,
    "content" TEXT NOT NULL,
    "event" VARCHAR(100) NOT NULL DEFAULT 'message',
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "presence" (
    "id" TEXT NOT NULL,
    "project_id" TEXT NOT NULL,
    "channel_id" TEXT NOT NULL,
    "userId" VARCHAR(255) NOT NULL,
    "status" VARCHAR(50) NOT NULL DEFAULT 'online',
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "presence_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "managed" (
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
CREATE TABLE "backups" (
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
CREATE TABLE "database_metrics" (
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
CREATE TABLE "instances" (
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
CREATE TABLE "logs" (
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
CREATE TABLE "instances" (
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
CREATE TABLE "messages" (
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
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cron_jobs" (
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
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "cron_jobs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "runs" (
    "id" TEXT NOT NULL,
    "cron_job_id" TEXT NOT NULL,
    "status" VARCHAR(50) NOT NULL DEFAULT 'running',
    "started_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completed_at" TIMESTAMPTZ,
    "error_message" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "runs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "metrics" (
    "id" TEXT NOT NULL,
    "project_id" TEXT NOT NULL,
    "metric" VARCHAR(255) NOT NULL,
    "value" DOUBLE PRECISION NOT NULL,
    "labels" JSONB NOT NULL DEFAULT '{}',
    "timestamp" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "metrics_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "alert_rules" (
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
CREATE TABLE "alerts" (
    "id" TEXT NOT NULL,
    "project_id" TEXT NOT NULL,
    "rule_id" TEXT NOT NULL,
    "severity" VARCHAR(50) NOT NULL,
    "status" VARCHAR(50) NOT NULL DEFAULT 'firing',
    "message" TEXT NOT NULL,
    "acknowledged_at" TIMESTAMPTZ,
    "resolved_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "alerts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notification_channels" (
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
CREATE TABLE "streams" (
    "id" TEXT NOT NULL,
    "project_id" TEXT NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "type" VARCHAR(50) NOT NULL DEFAULT 'application',
    "retentionDays" INTEGER NOT NULL DEFAULT 30,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "streams_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "entries" (
    "id" TEXT NOT NULL,
    "stream_id" TEXT NOT NULL,
    "level" VARCHAR(20) NOT NULL,
    "message" TEXT NOT NULL,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "timestamp" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "entries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "instances" (
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
CREATE TABLE "conversations" (
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
CREATE TABLE "messages" (
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
CREATE TABLE "items" (
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
CREATE TABLE "reviews" (
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
CREATE TABLE "platform.events" (
    "id" TEXT NOT NULL,
    "type" VARCHAR(100) NOT NULL,
    "timestamp" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actor_id" VARCHAR(255),
    "actor_type" VARCHAR(50),
    "resource_type" VARCHAR(100) NOT NULL,
    "resource_id" VARCHAR(255) NOT NULL,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "ip_address" VARCHAR(45),
    "user_agent" TEXT,

    CONSTRAINT "platform.events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "identity.users_email_key" ON "identity.users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "projects.projects_slug_key" ON "projects.projects"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "projects.env_vars_project_id_key_key" ON "projects.env_vars"("project_id", "key");

-- CreateIndex
CREATE INDEX "projects.invitations_project_id_email_idx" ON "projects.invitations"("project_id", "email");

-- CreateIndex
CREATE INDEX "projects.invitations_token_hash_idx" ON "projects.invitations"("token_hash");

-- CreateIndex
CREATE INDEX "projects.api_keys_project_id_idx" ON "projects.api_keys"("project_id");

-- CreateIndex
CREATE UNIQUE INDEX "projects.project_members_project_id_user_id_key" ON "projects.project_members"("project_id", "user_id");

-- CreateIndex
CREATE UNIQUE INDEX "projects.project_settings_project_id_key" ON "projects.project_settings"("project_id");

-- CreateIndex
CREATE UNIQUE INDEX "projects.project_settings_active_deployment_id_key" ON "projects.project_settings"("active_deployment_id");

-- CreateIndex
CREATE INDEX "projects.releases_project_id_created_at_idx" ON "projects.releases"("project_id", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "projects.releases_project_id_version_key" ON "projects.releases"("project_id", "version");

-- CreateIndex
CREATE UNIQUE INDEX "projects.build_configs_project_id_key" ON "projects.build_configs"("project_id");

-- CreateIndex
CREATE UNIQUE INDEX "projects.domains_project_id_domain_key" ON "projects.domains"("project_id", "domain");

-- CreateIndex
CREATE INDEX "projects.domain_health_checks_domain_id_checked_at_idx" ON "projects.domain_health_checks"("domain_id", "checked_at");

-- CreateIndex
CREATE UNIQUE INDEX "projects.app_users_project_id_email_key" ON "projects.app_users"("project_id", "email");

-- CreateIndex
CREATE UNIQUE INDEX "projects.app_roles_project_id_name_key" ON "projects.app_roles"("project_id", "name");

-- CreateIndex
CREATE UNIQUE INDEX "domains_project_id_domain_key" ON "domains"("project_id", "domain");

-- CreateIndex
CREATE UNIQUE INDEX "mailboxes_domain_id_localPart_key" ON "mailboxes"("domain_id", "localPart");

-- CreateIndex
CREATE UNIQUE INDEX "aliases_domain_id_localPart_key" ON "aliases"("domain_id", "localPart");

-- CreateIndex
CREATE UNIQUE INDEX "sender_identities_domain_id_email_key" ON "sender_identities"("domain_id", "email");

-- CreateIndex
CREATE INDEX "messages_mailbox_id_created_at_idx" ON "messages"("mailbox_id", "created_at");

-- CreateIndex
CREATE INDEX "messages_project_id_created_at_idx" ON "messages"("project_id", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "catch_all_rules_domain_id_key" ON "catch_all_rules"("domain_id");

-- CreateIndex
CREATE UNIQUE INDEX "suppressions_domain_id_email_key" ON "suppressions"("domain_id", "email");

-- CreateIndex
CREATE INDEX "api_usage_project_id_date_idx" ON "api_usage"("project_id", "date");

-- CreateIndex
CREATE UNIQUE INDEX "api_usage_project_id_api_key_id_date_key" ON "api_usage"("project_id", "api_key_id", "date");

-- CreateIndex
CREATE UNIQUE INDEX "channels_project_id_name_key" ON "channels"("project_id", "name");

-- CreateIndex
CREATE UNIQUE INDEX "presence_project_id_userId_channel_id_key" ON "presence"("project_id", "userId", "channel_id");

-- CreateIndex
CREATE UNIQUE INDEX "managed_project_id_environment_name_key" ON "managed"("project_id", "environment", "name");

-- CreateIndex
CREATE INDEX "database_metrics_database_id_recorded_at_idx" ON "database_metrics"("database_id", "recorded_at");

-- CreateIndex
CREATE UNIQUE INDEX "instances_project_id_name_key" ON "instances"("project_id", "name");

-- CreateIndex
CREATE UNIQUE INDEX "instances_project_id_name_key" ON "instances"("project_id", "name");

-- CreateIndex
CREATE UNIQUE INDEX "cron_jobs_project_id_name_key" ON "cron_jobs"("project_id", "name");

-- CreateIndex
CREATE INDEX "metrics_project_id_metric_timestamp_idx" ON "metrics"("project_id", "metric", "timestamp");

-- CreateIndex
CREATE UNIQUE INDEX "streams_project_id_name_key" ON "streams"("project_id", "name");

-- CreateIndex
CREATE INDEX "entries_stream_id_timestamp_idx" ON "entries"("stream_id", "timestamp");

-- CreateIndex
CREATE INDEX "entries_stream_id_level_idx" ON "entries"("stream_id", "level");

-- CreateIndex
CREATE UNIQUE INDEX "instances_project_id_name_key" ON "instances"("project_id", "name");

-- CreateIndex
CREATE INDEX "conversations_project_id_created_at_idx" ON "conversations"("project_id", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "items_slug_key" ON "items"("slug");

-- CreateIndex
CREATE INDEX "items_type_status_is_active_idx" ON "items"("type", "status", "is_active");

-- CreateIndex
CREATE INDEX "items_type_category_idx" ON "items"("type", "category");

-- CreateIndex
CREATE INDEX "items_author_id_idx" ON "items"("author_id");

-- CreateIndex
CREATE UNIQUE INDEX "reviews_item_id_user_id_key" ON "reviews"("item_id", "user_id");

-- CreateIndex
CREATE INDEX "platform.events_type_timestamp_idx" ON "platform.events"("type", "timestamp");

-- CreateIndex
CREATE INDEX "platform.events_resource_type_resource_id_idx" ON "platform.events"("resource_type", "resource_id");

-- CreateIndex
CREATE INDEX "platform.events_actor_id_idx" ON "platform.events"("actor_id");

-- AddForeignKey
ALTER TABLE "identity.sessions" ADD CONSTRAINT "identity.sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "identity.users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "identity.api_keys" ADD CONSTRAINT "identity.api_keys_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "identity.users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "identity.audit_logs" ADD CONSTRAINT "identity.audit_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "identity.users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "projects.projects" ADD CONSTRAINT "projects.projects_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "identity.users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "projects.env_vars" ADD CONSTRAINT "projects.env_vars_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects.projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "projects.invitations" ADD CONSTRAINT "projects.invitations_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects.projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "projects.api_keys" ADD CONSTRAINT "projects.api_keys_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects.projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "projects.project_members" ADD CONSTRAINT "projects.project_members_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects.projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "projects.project_members" ADD CONSTRAINT "projects.project_members_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "identity.users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "projects.project_settings" ADD CONSTRAINT "projects.project_settings_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects.projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "projects.project_settings" ADD CONSTRAINT "projects.project_settings_active_deployment_id_fkey" FOREIGN KEY ("active_deployment_id") REFERENCES "projects.deployments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "buckets" ADD CONSTRAINT "buckets_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects.projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "files" ADD CONSTRAINT "files_bucket_id_fkey" FOREIGN KEY ("bucket_id") REFERENCES "buckets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "projects.releases" ADD CONSTRAINT "projects.releases_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects.projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "projects.deployments" ADD CONSTRAINT "projects.deployments_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects.projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "projects.deployments" ADD CONSTRAINT "projects.deployments_release_id_fkey" FOREIGN KEY ("release_id") REFERENCES "projects.releases"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "projects.deployments" ADD CONSTRAINT "projects.deployments_rolled_back_to_fkey" FOREIGN KEY ("rolled_back_to") REFERENCES "projects.deployments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "projects.build_configs" ADD CONSTRAINT "projects.build_configs_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects.projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "projects.domains" ADD CONSTRAINT "projects.domains_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects.projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "projects.domains" ADD CONSTRAINT "projects.domains_deployment_id_fkey" FOREIGN KEY ("deployment_id") REFERENCES "projects.deployments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "projects.domains" ADD CONSTRAINT "projects.domains_dns_connection_id_fkey" FOREIGN KEY ("dns_connection_id") REFERENCES "projects.dns_connections"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "projects.domain_health_checks" ADD CONSTRAINT "projects.domain_health_checks_domain_id_fkey" FOREIGN KEY ("domain_id") REFERENCES "projects.domains"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "projects.app_users" ADD CONSTRAINT "projects.app_users_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects.projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "projects.app_sessions" ADD CONSTRAINT "projects.app_sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "projects.app_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "projects.app_roles" ADD CONSTRAINT "projects.app_roles_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects.projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "projects.app_user_roles" ADD CONSTRAINT "projects.app_user_roles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "projects.app_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "projects.app_user_roles" ADD CONSTRAINT "projects.app_user_roles_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "projects.app_roles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "domains" ADD CONSTRAINT "domains_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects.projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mailboxes" ADD CONSTRAINT "mailboxes_domain_id_fkey" FOREIGN KEY ("domain_id") REFERENCES "domains"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "aliases" ADD CONSTRAINT "aliases_domain_id_fkey" FOREIGN KEY ("domain_id") REFERENCES "domains"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sender_identities" ADD CONSTRAINT "sender_identities_domain_id_fkey" FOREIGN KEY ("domain_id") REFERENCES "domains"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "api_keys" ADD CONSTRAINT "api_keys_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects.projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "messages" ADD CONSTRAINT "messages_mailbox_id_fkey" FOREIGN KEY ("mailbox_id") REFERENCES "mailboxes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "messages" ADD CONSTRAINT "messages_sender_identity_id_fkey" FOREIGN KEY ("sender_identity_id") REFERENCES "sender_identities"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "messages" ADD CONSTRAINT "messages_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects.projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "catch_all_rules" ADD CONSTRAINT "catch_all_rules_domain_id_fkey" FOREIGN KEY ("domain_id") REFERENCES "domains"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "suppressions" ADD CONSTRAINT "suppressions_domain_id_fkey" FOREIGN KEY ("domain_id") REFERENCES "domains"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "api_usage" ADD CONSTRAINT "api_usage_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects.projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "api_usage" ADD CONSTRAINT "api_usage_api_key_id_fkey" FOREIGN KEY ("api_key_id") REFERENCES "api_keys"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "channels" ADD CONSTRAINT "channels_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects.projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "messages" ADD CONSTRAINT "messages_channel_id_fkey" FOREIGN KEY ("channel_id") REFERENCES "channels"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "presence" ADD CONSTRAINT "presence_channel_id_fkey" FOREIGN KEY ("channel_id") REFERENCES "channels"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "managed" ADD CONSTRAINT "managed_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects.projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "backups" ADD CONSTRAINT "backups_database_id_fkey" FOREIGN KEY ("database_id") REFERENCES "managed"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "database_metrics" ADD CONSTRAINT "database_metrics_database_id_fkey" FOREIGN KEY ("database_id") REFERENCES "managed"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "instances" ADD CONSTRAINT "instances_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects.projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "logs" ADD CONSTRAINT "logs_function_id_fkey" FOREIGN KEY ("function_id") REFERENCES "instances"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "instances" ADD CONSTRAINT "instances_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects.projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "messages" ADD CONSTRAINT "messages_queue_id_fkey" FOREIGN KEY ("queue_id") REFERENCES "instances"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cron_jobs" ADD CONSTRAINT "cron_jobs_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects.projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "runs" ADD CONSTRAINT "runs_cron_job_id_fkey" FOREIGN KEY ("cron_job_id") REFERENCES "cron_jobs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "metrics" ADD CONSTRAINT "metrics_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects.projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "alert_rules" ADD CONSTRAINT "alert_rules_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects.projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "alerts" ADD CONSTRAINT "alerts_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects.projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "alerts" ADD CONSTRAINT "alerts_rule_id_fkey" FOREIGN KEY ("rule_id") REFERENCES "alert_rules"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notification_channels" ADD CONSTRAINT "notification_channels_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects.projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "streams" ADD CONSTRAINT "streams_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects.projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "entries" ADD CONSTRAINT "entries_stream_id_fkey" FOREIGN KEY ("stream_id") REFERENCES "streams"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "instances" ADD CONSTRAINT "instances_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects.projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects.projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "messages" ADD CONSTRAINT "messages_conversation_id_fkey" FOREIGN KEY ("conversation_id") REFERENCES "conversations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_item_id_fkey" FOREIGN KEY ("item_id") REFERENCES "items"("id") ON DELETE CASCADE ON UPDATE CASCADE;

