# Data Model

> **⚠ Aspirational target spec — not current reality.** Written before the hardening reset; describes the *intended* design. For what actually builds/runs today read [`START_HERE`](./START_HERE.md), [`AUDIT`](./AUDIT.md), and [`AGENT_STATUS`](../AGENT_STATUS.md). Phase docs (`docs/phases/`) are the source of truth for current state and next work.

Complete entity definitions with fields, relationships, and constraints.

---

## Entity Relationship Overview

```
User
  +-- Session
  +-- APIKey
  +-- AuditLog
  +-- Project (owner)
       +-- Deployment
       +-- Domain
       +-- Database
       +-- StorageBucket
       +-- Function
       +-- Queue
       +-- CronJob
       +-- RealtimeChannel
       +-- AppUser (auth platform)

Project
  +-- ProjectMember

Integration (global)
```

---

## Identity Schema

### User

Primary authentication and authorization entity.

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| id | UUID | PK | Unique identifier |
| email | VARCHAR(255) | UNIQUE, NOT NULL | User email address |
| password_hash | VARCHAR(255) | NULL | Bcrypt hashed password |
| name | VARCHAR(255) | NULL | Display name |
| avatar_url | TEXT | NULL | Profile image URL |
| role | VARCHAR(50) | DEFAULT 'user' | Platform role |
| mfa_enabled | BOOLEAN | DEFAULT false | MFA status |
| mfa_secret | VARCHAR(255) | NULL | TOTP secret |
| last_login_at | TIMESTAMPTZ | NULL | Last login timestamp |
| created_at | TIMESTAMPTZ | DEFAULT NOW() | Creation timestamp |
| updated_at | TIMESTAMPTZ | DEFAULT NOW() | Last update timestamp |

**Indexes:**
- `idx_users_email ON users(email)`
- `idx_users_role ON users(role)`

**Relationships:**
- User creates Sessions (1:N)
- User creates APIKeys (1:N)
- User owns Projects (1:N)
- User triggers AuditLogs (1:N)

---

### Session

Active user sessions for authentication.

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| id | UUID | PK | Unique identifier |
| user_id | UUID | FK -> users.id | Associated user |
| token_hash | VARCHAR(255) | NOT NULL | Hashed session token |
| expires_at | TIMESTAMPTZ | NOT NULL | Session expiry |
| ip_address | INET | NULL | Client IP |
| user_agent | TEXT | NULL | Client user agent |
| created_at | TIMESTAMPTZ | DEFAULT NOW() | Creation timestamp |

**Indexes:**
- `idx_sessions_user ON sessions(user_id)`
- `idx_sessions_token ON sessions(token_hash)`
- `idx_sessions_expires ON sessions(expires_at)`

**Relationships:**
- Session belongs to User (N:1)

---

### APIKey

Long-lived API access credentials.

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| id | UUID | PK | Unique identifier |
| user_id | UUID | FK -> users.id | Owner user |
| name | VARCHAR(255) | NOT NULL | Key name/description |
| key_hash | VARCHAR(255) | NOT NULL | Argon2 hashed key |
| permissions | JSONB | DEFAULT '[]' | Granted permissions |
| last_used_at | TIMESTAMPTZ | NULL | Last usage timestamp |
| expires_at | TIMESTAMPTZ | NULL | Optional expiry |
| created_at | TIMESTAMPTZ | DEFAULT NOW() | Creation timestamp |

**Indexes:**
- `idx_api_keys_user ON api_keys(user_id)`
- `idx_api_keys_hash ON api_keys(key_hash)`

**Relationships:**
- APIKey belongs to User (N:1)

---

### AuditLog

Immutable record of security-sensitive actions.

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| id | UUID | PK | Unique identifier |
| user_id | UUID | FK -> users.id | Acting user |
| action | VARCHAR(100) | NOT NULL | Action performed |
| resource_type | VARCHAR(100) | NULL | Target resource type |
| resource_id | UUID | NULL | Target resource ID |
| metadata | JSONB | DEFAULT '{}' | Additional context |
| ip_address | INET | NULL | Client IP |
| created_at | TIMESTAMPTZ | DEFAULT NOW() | Timestamp |

**Indexes:**
- `idx_audit_logs_user ON audit_logs(user_id)`
- `idx_audit_logs_action ON audit_logs(action)`
- `idx_audit_logs_created ON audit_logs(created_at DESC)`

**Relationships:**
- AuditLog belongs to User (N:1)

---

## Projects Schema

### Project

Top-level isolation boundary for applications.

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| id | UUID | PK | Unique identifier |
| name | VARCHAR(255) | NOT NULL | Project display name |
| slug | VARCHAR(255) | UNIQUE, NOT NULL | URL-safe identifier |
| description | TEXT | NULL | Project description |
| type | VARCHAR(50) | NOT NULL | Project type |
| status | VARCHAR(50) | DEFAULT 'creating' | Current status |
| owner_id | UUID | FK -> users.id | Owner user |
| region | VARCHAR(100) | NULL | Deployment region |
| subdomain | VARCHAR(255) | NULL | Auto-assigned subdomain |
| custom_domains | JSONB | DEFAULT '[]' | Custom domain list |
| env_vars | JSONB | DEFAULT '{}' | Environment variables |
| build_settings | JSONB | DEFAULT '{}' | Build configuration |
| deployment_strategy | VARCHAR(50) | DEFAULT 'buildpack' | Build approach |
| source_provider | VARCHAR(50) | NULL | Git provider |
| source_repo | VARCHAR(500) | NULL | Repository URL |
| source_branch | VARCHAR(255) | DEFAULT 'main' | Deployment branch |
| last_deploy_at | TIMESTAMPTZ | NULL | Last deployment time |
| created_at | TIMESTAMPTZ | DEFAULT NOW() | Creation timestamp |
| updated_at | TIMESTAMPTZ | DEFAULT NOW() | Last update timestamp |

**Project Types:**
- `frontend` - Single-page applications
- `backend` - API services
- `worker` - Background job processors
- `cron` - Scheduled task runners
- `docker` - Custom Docker applications
- `static` - Static site generators

**Project Statuses:**
- `creating` - Initial provisioning
- `active` - Running normally
- `suspended` - Paused (billing issue)
- `archived` - Read-only for preservation

**Indexes:**
- `idx_projects_owner ON projects(owner_id)`
- `idx_projects_slug ON projects(slug)`
- `idx_projects_status ON projects(status)`

**Relationships:**
- Project has many Deployments (1:N)
- Project has many Domains (1:N)
- Project has many Databases (1:N)
- Project has many StorageBuckets (1:N)
- Project has many Functions (1:N)
- Project has many Queues (1:N)
- Project has many CronJobs (1:N)
- Project has many RealtimeChannels (1:N)
- Project owned by User (N:1)

---

### ProjectMember

Project access for non-owner users.

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| id | UUID | PK | Unique identifier |
| project_id | UUID | FK -> projects.id | Project reference |
| user_id | UUID | FK -> users.id | Member user |
| role | VARCHAR(100) | NOT NULL | Project role |
| created_at | TIMESTAMPTZ | DEFAULT NOW() | Creation timestamp |

**Indexes:**
- `idx_project_members_project ON project_members(project_id)`
- `idx_project_members_user ON project_members(user_id)`

**Relationships:**
- ProjectMember belongs to Project (N:1)
- ProjectMember belongs to User (N:1)

---

### Deployment

Immutable snapshot of a deployed application version.

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| id | UUID | PK | Unique identifier |
| project_id | UUID | FK -> projects.id | Parent project |
| version | VARCHAR(50) | NOT NULL | Semantic version |
| status | VARCHAR(50) | DEFAULT 'pending' | Deployment status |
| commit_sha | VARCHAR(40) | NULL | Git commit hash |
| commit_message | TEXT | NULL | Commit description |
| build_logs | TEXT | NULL | Build output logs |
| build_duration_ms | INTEGER | NULL | Build time |
| deployment_url | TEXT | NULL | Live URL after deploy |
| rolled_back_to | UUID | FK -> deployments.id | Rollback target |
| created_at | TIMESTAMPTZ | DEFAULT NOW() | Creation timestamp |
| completed_at | TIMESTAMPTZ | NULL | Completion timestamp |

**Deployment Statuses:**
- `pending` - Queued for build
- `building` - Docker image building
- `deploying` - Container starting
- `success` - Live and healthy
- `failed` - Build or deploy error
- `rolled_back` - Reverted to previous

**Indexes:**
- `idx_deployments_project ON deployments(project_id)`
- `idx_deployments_created ON deployments(created_at DESC)`
- `idx_deployments_status ON deployments(status)`

**Relationships:**
- Deployment belongs to Project (N:1)
- Deployment may roll back to another Deployment (N:1 self-reference)

---

### Domain

Custom domain configuration for projects.

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| id | UUID | PK | Unique identifier |
| project_id | UUID | FK -> projects.id | Parent project |
| domain | VARCHAR(255) | NOT NULL | Full domain name |
| is_custom | BOOLEAN | DEFAULT false | Custom vs. subdomain |
| ssl_enabled | BOOLEAN | DEFAULT true | SSL status |
| ssl_cert_arn | VARCHAR(255) | NULL | Certificate ARN |
| dns_status | VARCHAR(50) | DEFAULT 'pending' | DNS validation |
| dns_verified_at | TIMESTAMPTZ | NULL | Validation time |
| created_at | TIMESTAMPTZ | DEFAULT NOW() | Creation timestamp |

**DNS Statuses:**
- `pending` - Awaiting validation
- `valid` - DNS checks passing
- `failed` - Validation error

**Indexes:**
- `idx_domains_project ON domains(project_id)`
- `idx_domains_domain ON domains(domain)`

**Relationships:**
- Domain belongs to Project (N:1)

---

## Infrastructure Schema

### Database

Managed PostgreSQL instance for a project.

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| id | UUID | PK | Unique identifier |
| project_id | UUID | FK -> projects.id | Owner project |
| name | VARCHAR(255) | NOT NULL | Database name |
| type | VARCHAR(50) | NOT NULL | Database type |
| status | VARCHAR(50) | DEFAULT 'provisioning' | Current status |
| host | VARCHAR(255) | NULL | Connection host |
| port | INTEGER | NULL | Connection port |
| max_connections | INTEGER | DEFAULT 100 | Connection limit |
| storage_gb | DECIMAL(10,2) | NULL | Storage size |
| backup_enabled | BOOLEAN | DEFAULT true | Auto-backup |
| backup_schedule | CRON | NULL | Backup schedule |
| created_at | TIMESTAMPTZ | DEFAULT NOW() | Creation timestamp |

**Indexes:**
- `idx_databases_project ON databases(project_id)`
- `idx_databases_status ON databases(status)`

**Relationships:**
- Database belongs to Project (N:1)

---

## Storage Schema

### StorageBucket

File storage container for projects.

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| id | UUID | PK | Unique identifier |
| project_id | UUID | FK -> projects.id | Owner project |
| name | VARCHAR(255) | NOT NULL | Bucket name |
| provider | VARCHAR(50) | DEFAULT 'internal' | Storage provider |
| region | VARCHAR(100) | NULL | Provider region |
| is_public | BOOLEAN | DEFAULT false | Public access |
| max_size_bytes | BIGINT | NULL | Size limit |
| created_at | TIMESTAMPTZ | DEFAULT NOW() | Creation timestamp |

**Indexes:**
- `idx_buckets_project ON storage_buckets(project_id)`

**Relationships:**
- StorageBucket belongs to Project (N:1)
- StorageBucket has many Files (1:N)

---

### StorageFile

Metadata for uploaded files.

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| id | UUID | PK | Unique identifier |
| bucket_id | UUID | FK -> storage_buckets.id | Parent bucket |
| key | VARCHAR(1024) | NOT NULL | Object key |
| original_name | VARCHAR(255) | NULL | Original filename |
| mime_type | VARCHAR(255) | NULL | MIME type |
| size_bytes | BIGINT | DEFAULT 0 | File size |
| etag | VARCHAR(255) | NULL | Provider ETag |
| metadata | JSONB | DEFAULT '{}' | Custom metadata |
| created_at | TIMESTAMPTZ | DEFAULT NOW() | Upload timestamp |

**Indexes:**
- `idx_files_bucket ON storage_files(bucket_id)`
- `idx_files_created ON storage_files(created_at DESC)`

**Relationships:**
- StorageFile belongs to StorageBucket (N:1)

---

## Email Schema

### EmailDomain

Verified sending domain.

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| id | UUID | PK | Unique identifier |
| project_id | UUID | FK -> projects.id | Owner project |
| domain | VARCHAR(255) | NOT NULL | Email domain |
| dkim_verified | BOOLEAN | DEFAULT false | DKIM status |
| spf_verified | BOOLEAN | DEFAULT false | SPF status |
| dmarc_verified | BOOLEAN | DEFAULT false | DMARC status |
| created_at | TIMESTAMPTZ | DEFAULT NOW() | Creation timestamp |

**Indexes:**
- `idx_email_domains_project ON email_domains(project_id)`

**Relationships:**
- EmailDomain belongs to Project (N:1)
- EmailDomain has many Mailboxes (1:N)

---

### EmailMailbox

Individual email inbox.

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| id | UUID | PK | Unique identifier |
| domain_id | UUID | FK -> email_domains.id | Parent domain |
| local_part | VARCHAR(255) | NOT NULL | Local address part |
| password_encrypted | BYTEA | NOT NULL | Mailbox password |
| quota_mb | INTEGER | DEFAULT 1024 | Storage quota |
| is_alias | BOOLEAN | DEFAULT false | Alias vs. inbox |
| forwards_to | TEXT[] | NULL | Forward addresses |
| created_at | TIMESTAMPTZ | DEFAULT NOW() | Creation timestamp |

**Indexes:**
- `idx_mailboxes_domain ON email_mailboxes(domain_id)`

**Relationships:**
- EmailMailbox belongs to EmailDomain (N:1)

---

### EmailLog

Email delivery record.

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| id | UUID | PK | Unique identifier |
| project_id | UUID | FK -> projects.id | Owner project |
| from_address | VARCHAR(500) | NOT NULL | Sender address |
| to_address | TEXT[] | NOT NULL | Recipient list |
| subject | VARCHAR(500) | NULL | Email subject |
| status | VARCHAR(50) | DEFAULT 'sent' | Delivery status |
| provider | VARCHAR(50) | DEFAULT 'internal' | Email provider |
| message_id | VARCHAR(500) | NULL | Provider message ID |
| metadata | JSONB | DEFAULT '{}' | Additional data |
| created_at | TIMESTAMPTZ | DEFAULT NOW() | Send timestamp |

**Email Statuses:**
- `pending` - Queued for sending
- `sent` - Submitted to provider
- `delivered` - Confirmed delivery
- `bounced` - Delivery failed
- `failed` - Send error

**Indexes:**
- `idx_email_logs_project ON email_logs(project_id)`
- `idx_email_logs_created ON email_logs(created_at DESC)`
- `idx_email_logs_status ON email_logs(status)`

**Relationships:**
- EmailLog belongs to Project (N:1)

---

## Functions Schema

### Function

Serverless function definition.

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| id | UUID | PK | Unique identifier |
| project_id | UUID | FK -> projects.id | Owner project |
| name | VARCHAR(255) | NOT NULL | Function name |
| description | TEXT | NULL | Function description |
| runtime | VARCHAR(50) | NOT NULL | Execution runtime |
| code_path | VARCHAR(1024) | NULL | Code location |
| environment | JSONB | DEFAULT '{}' | Env variables |
| memory_mb | INTEGER | DEFAULT 256 | Memory allocation |
| timeout_seconds | INTEGER | DEFAULT 30 | Execution timeout |
| max_instances | INTEGER | DEFAULT 10 | Scaling limit |
| current_version | VARCHAR(50) | NULL | Active version |
| status | VARCHAR(50) | DEFAULT 'active' | Function status |
| created_at | TIMESTAMPTZ | DEFAULT NOW() | Creation timestamp |
| updated_at | TIMESTAMPTZ | DEFAULT NOW() | Last update |

**Indexes:**
- `idx_functions_project ON functions(project_id)`
- `idx_functions_status ON functions(status)`

**Relationships:**
- Function belongs to Project (N:1)
- Function has many FunctionVersions (1:N)
- Function has many InvocationLogs (1:N)

---

### FunctionInvocationLog

Function execution record.

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| id | UUID | PK | Unique identifier |
| function_id | UUID | FK -> functions.id | Target function |
| version | VARCHAR(50) | NOT NULL | Executed version |
| status | VARCHAR(50) | NOT NULL | Execution status |
| duration_ms | INTEGER | NULL | Execution time |
| memory_used_mb | INTEGER | NULL | Memory consumed |
| logs | TEXT | NULL | Execution logs |
| error | TEXT | NULL | Error message |
| invoked_by | VARCHAR(100) | NULL | Caller identifier |
| created_at | TIMESTAMPTZ | DEFAULT NOW() | Invocation time |

**Indexes:**
- `idx_invocation_logs_function ON function_invocation_logs(function_id)`
- `idx_invocation_logs_created ON function_invocation_logs(created_at DESC)`

**Relationships:**
- FunctionInvocationLog belongs to Function (N:1)

---

## Queues Schema

### Queue

Message queue definition.

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| id | UUID | PK | Unique identifier |
| project_id | UUID | FK -> projects.id | Owner project |
| name | VARCHAR(255) | NOT NULL | Queue name |
| type | VARCHAR(50) | DEFAULT 'work' | Queue type |
| max_retries | INTEGER | DEFAULT 3 | Retry limit |
| visibility_timeout_secs | INTEGER | DEFAULT 30 | Poll timeout |
| retention_hours | INTEGER | DEFAULT 72 | Message retention |
| created_at | TIMESTAMPTZ | DEFAULT NOW() | Creation timestamp |

**Indexes:**
- `idx_queues_project ON queues(project_id)`

**Relationships:**
- Queue belongs to Project (N:1)
- Queue has many QueueMessages (1:N)

---

## Cron Schema

### CronJob

Scheduled task definition.

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| id | UUID | PK | Unique identifier |
| project_id | UUID | FK -> projects.id | Owner project |
| name | VARCHAR(255) | NOT NULL | Job name |
| description | TEXT | NULL | Job description |
| cron_expression | VARCHAR(100) | NOT NULL | Schedule expression |
| endpoint | VARCHAR(1024) | NOT NULL | Target endpoint |
| method | VARCHAR(10) | DEFAULT 'POST' | HTTP method |
| headers | JSONB | DEFAULT '{}' | Request headers |
| body | TEXT | NULL | Request body |
| timezone | VARCHAR(100) | DEFAULT 'UTC' | Execution timezone |
| is_active | BOOLEAN | DEFAULT true | Enabled status |
| last_run_at | TIMESTAMPTZ | NULL | Last execution |
| next_run_at | TIMESTAMPTZ | NULL | Next scheduled run |
| created_at | TIMESTAMPTZ | DEFAULT NOW() | Creation timestamp |

**Indexes:**
- `idx_cron_jobs_project ON cron_jobs(project_id)`
- `idx_cron_jobs_active ON cron_jobs(is_active)`

**Relationships:**
- CronJob belongs to Project (N:1)
- CronJob has many CronExecutions (1:N)

---

### CronExecution

Single cron job run record.

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| id | UUID | PK | Unique identifier |
| job_id | UUID | FK -> cron_jobs.id | Parent job |
| status | VARCHAR(50) | NOT NULL | Execution status |
| duration_ms | INTEGER | NULL | Execution time |
| response_code | INTEGER | NULL | HTTP response code |
| response_body | TEXT | NULL | Response content |
| error | TEXT | NULL | Error message |
| started_at | TIMESTAMPTZ | NOT NULL | Start timestamp |
| completed_at | TIMESTAMPTZ | NULL | Completion timestamp |

**Indexes:**
- `idx_cron_executions_job ON cron_executions(job_id)`
- `idx_cron_executions_started ON cron_executions(started_at DESC)`

**Relationships:**
- CronExecution belongs to CronJob (N:1)

---

## Realtime Schema

### RealtimeChannel

WebSocket messaging channel.

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| id | UUID | PK | Unique identifier |
| project_id | UUID | FK -> projects.id | Owner project |
| name | VARCHAR(255) | NOT NULL | Channel name |
| is_private | BOOLEAN | DEFAULT false | Access control |
| presence_enabled | BOOLEAN | DEFAULT false | Presence feature |
| created_at | TIMESTAMPTZ | DEFAULT NOW() | Creation timestamp |

**Indexes:**
- `idx_realtime_channels_project ON realtime_channels(project_id)`

**Relationships:**
- RealtimeChannel belongs to Project (N:1)
- RealtimeChannel has many Subscriptions (1:N)

---

## Skills Schema

### Skill

Installable platform extension.

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| id | UUID | PK | Unique identifier |
| name | VARCHAR(255) | NOT NULL | Skill name |
| slug | VARCHAR(255) | UNIQUE, NOT NULL | URL-safe name |
| category | VARCHAR(100) | NULL | Skill category |
| description | TEXT | NULL | Skill description |
| version | VARCHAR(50) | NULL | Current version |
| manifest | JSONB | NOT NULL | Skill manifest |
| docker_image | VARCHAR(500) | NULL | Runtime image |
| repository_url | VARCHAR(500) | NULL | Source repository |
| is_official | BOOLEAN | DEFAULT false | First-party |
| is_installed | BOOLEAN | DEFAULT false | Installation status |
| installed_at | TIMESTAMPTZ | NULL | Install timestamp |
| created_at | TIMESTAMPTZ | DEFAULT NOW() | Creation timestamp |

**Indexes:**
- `idx_skills_slug ON skills(slug)`
- `idx_skills_installed ON skills(is_installed)`

**Relationships:**
- Skill has many SkillInstallations (1:N)

---

## Events Schema

### PlatformEvent

Immutable audit trail entry.

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| id | UUID | PK | Unique identifier |
| event_type | VARCHAR(100) | NOT NULL | Event type name |
| source_service | VARCHAR(100) | NOT NULL | Originating service |
| project_id | UUID | FK -> projects.id | Associated project |
| user_id | UUID | FK -> users.id | Acting user |
| resource_type | VARCHAR(100) | NULL | Target type |
| resource_id | UUID | NULL | Target ID |
| payload | JSONB | DEFAULT '{}' | Event data |
| correlation_id | UUID | NULL | Event chain ID |
| causation_id | UUID | NULL | Triggering event ID |
| created_at | TIMESTAMPTZ | DEFAULT NOW() | Event timestamp |

**Indexes:**
- `idx_events_type ON events(event_type)`
- `idx_events_project ON events(project_id)`
- `idx_events_user ON events(user_id)`
- `idx_events_created ON events(created_at DESC)`
- `idx_events_correlation ON events(correlation_id)`

**Relationships:**
- PlatformEvent may belong to Project (N:1)
- PlatformEvent may belong to User (N:1)
- PlatformEvent may reference another PlatformEvent (N:1 self-reference via causation_id)
