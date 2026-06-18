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
CREATE TABLE "storage.buckets" (
    "id" TEXT NOT NULL,
    "project_id" TEXT NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "provider" VARCHAR(50) NOT NULL DEFAULT 'internal',
    "region" VARCHAR(100),
    "is_public" BOOLEAN NOT NULL DEFAULT false,
    "max_size_bytes" BIGINT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "storage.buckets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "storage.files" (
    "id" TEXT NOT NULL,
    "bucket_id" TEXT NOT NULL,
    "key" VARCHAR(1024) NOT NULL,
    "original_name" VARCHAR(255),
    "mime_type" VARCHAR(255),
    "size_bytes" BIGINT NOT NULL DEFAULT 0,
    "etag" VARCHAR(255),
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "storage.files_pkey" PRIMARY KEY ("id")
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
CREATE TABLE "email.domains" (
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

    CONSTRAINT "email.domains_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "email.mailboxes" (
    "id" TEXT NOT NULL,
    "domain_id" TEXT NOT NULL,
    "localPart" VARCHAR(255) NOT NULL,
    "name" VARCHAR(255),
    "quota" BIGINT NOT NULL DEFAULT 10737418240,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "stalwart_account_id" VARCHAR(255),
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "email.mailboxes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "email.aliases" (
    "id" TEXT NOT NULL,
    "domain_id" TEXT NOT NULL,
    "localPart" VARCHAR(255) NOT NULL,
    "description" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "targets" JSONB NOT NULL DEFAULT '[]',
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "email.aliases_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "email.sender_identities" (
    "id" TEXT NOT NULL,
    "domain_id" TEXT NOT NULL,
    "email" VARCHAR(255) NOT NULL,
    "name" VARCHAR(255),
    "is_verified" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "email.sender_identities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "email.api_keys" (
    "id" TEXT NOT NULL,
    "project_id" TEXT NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "key_hash" VARCHAR(255) NOT NULL,
    "scopes" TEXT[] DEFAULT ARRAY['email.send']::TEXT[],
    "last_used_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "email.api_keys_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "email.messages" (
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

    CONSTRAINT "email.messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "email.catch_all_rules" (
    "id" TEXT NOT NULL,
    "domain_id" TEXT NOT NULL,
    "target" JSONB NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "messages_per_minute" INTEGER NOT NULL DEFAULT 60,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "email.catch_all_rules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "email.suppressions" (
    "id" TEXT NOT NULL,
    "domain_id" TEXT NOT NULL,
    "email" VARCHAR(255) NOT NULL,
    "reason" "SuppressionReason" NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "email.suppressions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "email.api_usage" (
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

    CONSTRAINT "email.api_usage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "realtime.channels" (
    "id" TEXT NOT NULL,
    "project_id" TEXT NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "is_private" BOOLEAN NOT NULL DEFAULT false,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "access_token" VARCHAR(255),
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "realtime.channels_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "realtime.messages" (
    "id" TEXT NOT NULL,
    "channel_id" TEXT NOT NULL,
    "userId" VARCHAR(255) NOT NULL,
    "content" TEXT NOT NULL,
    "event" VARCHAR(100) NOT NULL DEFAULT 'message',
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "realtime.messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "realtime.presence" (
    "id" TEXT NOT NULL,
    "project_id" TEXT NOT NULL,
    "channel_id" TEXT NOT NULL,
    "userId" VARCHAR(255) NOT NULL,
    "status" VARCHAR(50) NOT NULL DEFAULT 'online',
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "realtime.presence_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "databases.managed" (
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

    CONSTRAINT "databases.managed_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "databases.backups" (
    "id" TEXT NOT NULL,
    "database_id" TEXT NOT NULL,
    "filename" VARCHAR(500),
    "size" BIGINT NOT NULL DEFAULT 0,
    "status" VARCHAR(50) NOT NULL DEFAULT 'in_progress',
    "description" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completed_at" TIMESTAMPTZ,

    CONSTRAINT "databases.backups_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "infrastructure.database_metrics" (
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

    CONSTRAINT "infrastructure.database_metrics_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "functions.instances" (
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

    CONSTRAINT "functions.instances_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "functions.logs" (
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

    CONSTRAINT "functions.logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "queues.instances" (
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

    CONSTRAINT "queues.instances_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "queues.messages" (
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

    CONSTRAINT "queues.messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "scheduler.cron_jobs" (
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

    CONSTRAINT "scheduler.cron_jobs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "scheduler.runs" (
    "id" TEXT NOT NULL,
    "cron_job_id" TEXT NOT NULL,
    "status" VARCHAR(50) NOT NULL DEFAULT 'running',
    "started_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completed_at" TIMESTAMPTZ,
    "error_message" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "scheduler.runs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "monitoring.metrics" (
    "id" TEXT NOT NULL,
    "project_id" TEXT NOT NULL,
    "metric" VARCHAR(255) NOT NULL,
    "value" DOUBLE PRECISION NOT NULL,
    "labels" JSONB NOT NULL DEFAULT '{}',
    "timestamp" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "monitoring.metrics_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "monitoring.alert_rules" (
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

    CONSTRAINT "monitoring.alert_rules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "monitoring.alerts" (
    "id" TEXT NOT NULL,
    "project_id" TEXT NOT NULL,
    "rule_id" TEXT NOT NULL,
    "severity" VARCHAR(50) NOT NULL,
    "status" VARCHAR(50) NOT NULL DEFAULT 'firing',
    "message" TEXT NOT NULL,
    "acknowledged_at" TIMESTAMPTZ,
    "resolved_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "monitoring.alerts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "monitoring.notification_channels" (
    "id" TEXT NOT NULL,
    "project_id" TEXT NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "type" VARCHAR(50) NOT NULL,
    "config" JSONB NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "monitoring.notification_channels_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "logging.streams" (
    "id" TEXT NOT NULL,
    "project_id" TEXT NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "type" VARCHAR(50) NOT NULL DEFAULT 'application',
    "retentionDays" INTEGER NOT NULL DEFAULT 30,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "logging.streams_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "logging.entries" (
    "id" TEXT NOT NULL,
    "stream_id" TEXT NOT NULL,
    "level" VARCHAR(20) NOT NULL,
    "message" TEXT NOT NULL,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "timestamp" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "logging.entries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "templates.instances" (
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

    CONSTRAINT "templates.instances_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ai.conversations" (
    "id" TEXT NOT NULL,
    "project_id" TEXT NOT NULL,
    "user_id" TEXT,
    "type" VARCHAR(50) NOT NULL DEFAULT 'general',
    "model" VARCHAR(100) NOT NULL,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "token_count" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "ai.conversations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ai.messages" (
    "id" TEXT NOT NULL,
    "conversation_id" TEXT NOT NULL,
    "role" VARCHAR(50) NOT NULL,
    "content" TEXT NOT NULL,
    "model" VARCHAR(100) NOT NULL,
    "token_count" INTEGER NOT NULL DEFAULT 0,
    "latency_ms" INTEGER,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ai.messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "marketplace.items" (
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

    CONSTRAINT "marketplace.items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "marketplace.reviews" (
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

    CONSTRAINT "marketplace.reviews_pkey" PRIMARY KEY ("id")
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
CREATE UNIQUE INDEX "email.domains_project_id_domain_key" ON "email.domains"("project_id", "domain");

-- CreateIndex
CREATE UNIQUE INDEX "email.mailboxes_domain_id_localPart_key" ON "email.mailboxes"("domain_id", "localPart");

-- CreateIndex
CREATE UNIQUE INDEX "email.aliases_domain_id_localPart_key" ON "email.aliases"("domain_id", "localPart");

-- CreateIndex
CREATE UNIQUE INDEX "email.sender_identities_domain_id_email_key" ON "email.sender_identities"("domain_id", "email");

-- CreateIndex
CREATE INDEX "email.messages_mailbox_id_created_at_idx" ON "email.messages"("mailbox_id", "created_at");

-- CreateIndex
CREATE INDEX "email.messages_project_id_created_at_idx" ON "email.messages"("project_id", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "email.catch_all_rules_domain_id_key" ON "email.catch_all_rules"("domain_id");

-- CreateIndex
CREATE UNIQUE INDEX "email.suppressions_domain_id_email_key" ON "email.suppressions"("domain_id", "email");

-- CreateIndex
CREATE INDEX "email.api_usage_project_id_date_idx" ON "email.api_usage"("project_id", "date");

-- CreateIndex
CREATE UNIQUE INDEX "email.api_usage_project_id_api_key_id_date_key" ON "email.api_usage"("project_id", "api_key_id", "date");

-- CreateIndex
CREATE UNIQUE INDEX "realtime.channels_project_id_name_key" ON "realtime.channels"("project_id", "name");

-- CreateIndex
CREATE UNIQUE INDEX "realtime.presence_project_id_userId_channel_id_key" ON "realtime.presence"("project_id", "userId", "channel_id");

-- CreateIndex
CREATE UNIQUE INDEX "databases.managed_project_id_environment_name_key" ON "databases.managed"("project_id", "environment", "name");

-- CreateIndex
CREATE INDEX "infrastructure.database_metrics_database_id_recorded_at_idx" ON "infrastructure.database_metrics"("database_id", "recorded_at");

-- CreateIndex
CREATE UNIQUE INDEX "functions.instances_project_id_name_key" ON "functions.instances"("project_id", "name");

-- CreateIndex
CREATE UNIQUE INDEX "queues.instances_project_id_name_key" ON "queues.instances"("project_id", "name");

-- CreateIndex
CREATE UNIQUE INDEX "scheduler.cron_jobs_project_id_name_key" ON "scheduler.cron_jobs"("project_id", "name");

-- CreateIndex
CREATE INDEX "monitoring.metrics_project_id_metric_timestamp_idx" ON "monitoring.metrics"("project_id", "metric", "timestamp");

-- CreateIndex
CREATE UNIQUE INDEX "logging.streams_project_id_name_key" ON "logging.streams"("project_id", "name");

-- CreateIndex
CREATE INDEX "logging.entries_stream_id_timestamp_idx" ON "logging.entries"("stream_id", "timestamp");

-- CreateIndex
CREATE INDEX "logging.entries_stream_id_level_idx" ON "logging.entries"("stream_id", "level");

-- CreateIndex
CREATE UNIQUE INDEX "templates.instances_project_id_name_key" ON "templates.instances"("project_id", "name");

-- CreateIndex
CREATE INDEX "ai.conversations_project_id_created_at_idx" ON "ai.conversations"("project_id", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "marketplace.items_slug_key" ON "marketplace.items"("slug");

-- CreateIndex
CREATE INDEX "marketplace.items_type_status_is_active_idx" ON "marketplace.items"("type", "status", "is_active");

-- CreateIndex
CREATE INDEX "marketplace.items_type_category_idx" ON "marketplace.items"("type", "category");

-- CreateIndex
CREATE INDEX "marketplace.items_author_id_idx" ON "marketplace.items"("author_id");

-- CreateIndex
CREATE UNIQUE INDEX "marketplace.reviews_item_id_user_id_key" ON "marketplace.reviews"("item_id", "user_id");

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
ALTER TABLE "storage.buckets" ADD CONSTRAINT "storage.buckets_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects.projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "storage.files" ADD CONSTRAINT "storage.files_bucket_id_fkey" FOREIGN KEY ("bucket_id") REFERENCES "storage.buckets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

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
ALTER TABLE "email.domains" ADD CONSTRAINT "email.domains_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects.projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "email.mailboxes" ADD CONSTRAINT "email.mailboxes_domain_id_fkey" FOREIGN KEY ("domain_id") REFERENCES "email.domains"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "email.aliases" ADD CONSTRAINT "email.aliases_domain_id_fkey" FOREIGN KEY ("domain_id") REFERENCES "email.domains"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "email.sender_identities" ADD CONSTRAINT "email.sender_identities_domain_id_fkey" FOREIGN KEY ("domain_id") REFERENCES "email.domains"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "email.api_keys" ADD CONSTRAINT "email.api_keys_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects.projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "email.messages" ADD CONSTRAINT "email.messages_mailbox_id_fkey" FOREIGN KEY ("mailbox_id") REFERENCES "email.mailboxes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "email.messages" ADD CONSTRAINT "email.messages_sender_identity_id_fkey" FOREIGN KEY ("sender_identity_id") REFERENCES "email.sender_identities"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "email.messages" ADD CONSTRAINT "email.messages_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects.projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "email.catch_all_rules" ADD CONSTRAINT "email.catch_all_rules_domain_id_fkey" FOREIGN KEY ("domain_id") REFERENCES "email.domains"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "email.suppressions" ADD CONSTRAINT "email.suppressions_domain_id_fkey" FOREIGN KEY ("domain_id") REFERENCES "email.domains"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "email.api_usage" ADD CONSTRAINT "email.api_usage_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects.projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "email.api_usage" ADD CONSTRAINT "email.api_usage_api_key_id_fkey" FOREIGN KEY ("api_key_id") REFERENCES "email.api_keys"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "realtime.channels" ADD CONSTRAINT "realtime.channels_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects.projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "realtime.messages" ADD CONSTRAINT "realtime.messages_channel_id_fkey" FOREIGN KEY ("channel_id") REFERENCES "realtime.channels"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "realtime.presence" ADD CONSTRAINT "realtime.presence_channel_id_fkey" FOREIGN KEY ("channel_id") REFERENCES "realtime.channels"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "databases.managed" ADD CONSTRAINT "databases.managed_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects.projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "databases.backups" ADD CONSTRAINT "databases.backups_database_id_fkey" FOREIGN KEY ("database_id") REFERENCES "databases.managed"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "infrastructure.database_metrics" ADD CONSTRAINT "infrastructure.database_metrics_database_id_fkey" FOREIGN KEY ("database_id") REFERENCES "databases.managed"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "functions.instances" ADD CONSTRAINT "functions.instances_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects.projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "functions.logs" ADD CONSTRAINT "functions.logs_function_id_fkey" FOREIGN KEY ("function_id") REFERENCES "functions.instances"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "queues.instances" ADD CONSTRAINT "queues.instances_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects.projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "queues.messages" ADD CONSTRAINT "queues.messages_queue_id_fkey" FOREIGN KEY ("queue_id") REFERENCES "queues.instances"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scheduler.cron_jobs" ADD CONSTRAINT "scheduler.cron_jobs_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects.projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scheduler.runs" ADD CONSTRAINT "scheduler.runs_cron_job_id_fkey" FOREIGN KEY ("cron_job_id") REFERENCES "scheduler.cron_jobs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "monitoring.metrics" ADD CONSTRAINT "monitoring.metrics_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects.projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "monitoring.alert_rules" ADD CONSTRAINT "monitoring.alert_rules_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects.projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "monitoring.alerts" ADD CONSTRAINT "monitoring.alerts_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects.projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "monitoring.alerts" ADD CONSTRAINT "monitoring.alerts_rule_id_fkey" FOREIGN KEY ("rule_id") REFERENCES "monitoring.alert_rules"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "monitoring.notification_channels" ADD CONSTRAINT "monitoring.notification_channels_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects.projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "logging.streams" ADD CONSTRAINT "logging.streams_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects.projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "logging.entries" ADD CONSTRAINT "logging.entries_stream_id_fkey" FOREIGN KEY ("stream_id") REFERENCES "logging.streams"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "templates.instances" ADD CONSTRAINT "templates.instances_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects.projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai.conversations" ADD CONSTRAINT "ai.conversations_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects.projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai.messages" ADD CONSTRAINT "ai.messages_conversation_id_fkey" FOREIGN KEY ("conversation_id") REFERENCES "ai.conversations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "marketplace.reviews" ADD CONSTRAINT "marketplace.reviews_item_id_fkey" FOREIGN KEY ("item_id") REFERENCES "marketplace.items"("id") ON DELETE CASCADE ON UPDATE CASCADE;

