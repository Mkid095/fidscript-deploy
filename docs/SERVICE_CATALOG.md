# Service Catalog

Each platform service follows a standardized template.

## Service Template

```yaml
name: <ServiceName>
purpose: <One-line description>
status: <planned|in_progress|active|deprecated>

features:
  - <feature>

dependencies:
  - <service>
  - <external_provider>

events:
  produced:
    - <event>
  consumed:
    - <event>

api:
  base: /api/v1/<resource>

sdk:
  namespace: platform.<resource>

mcp:
  tools:
    - <tool>

database:
  tables:
    - <schema.table>

dashboard:
  section: <navigation_section>
  screens:
    - <screen>
```

---

## Core Services

### 1. Identity Service

**Purpose:** User authentication, authorization, and session management.

**Features:**
- Email/password registration and login
- Magic link authentication
- Session management with JWT
- Role-based access control (RBAC)
- Permission system with granular roles
- Audit logging of auth events
- MFA-ready architecture (TOTP)

**Dependencies:**
- PostgreSQL (identity schema)
- Redis (session cache)

**API:** `/api/v1/auth/*`

**SDK:** `platform.auth.*`

**MCP:**
- `create_user`
- `verify_user`
- `login_user`
- `logout_user`
- `list_sessions`
- `revoke_session`

**Database Tables:**
- `identity.users`
- `identity.sessions`
- `identity.roles`
- `identity.permissions`
- `identity.api_keys`
- `identity.audit_logs`

**Events Produced:**
- `user.created`
- `user.updated`
- `user.deleted`
- `user.login`
- `user.logout`
- `session.created`
- `session.revoked`
- `api_key.created`
- `api_key.revoked`

---

### 2. Project Service

**Purpose:** Project lifecycle management and isolation.

**Features:**
- Create, update, delete projects
- Project types: frontend, backend, worker, cron, docker, static
- Project suspension and archival
- Project cloning
- Project-level settings and configuration
- Team membership and roles per project

**Dependencies:**
- PostgreSQL (projects schema)
- Auth Service (owner verification)

**API:** `/api/v1/projects/*`

**SDK:** `platform.projects.*`

**MCP:**
- `create_project`
- `get_project`
- `update_project`
- `delete_project`
- `suspend_project`
- `archive_project`
- `list_projects`

**Database Tables:**
- `projects.projects`
- `projects.project_members`
- `projects.project_settings`

**Events Produced:**
- `project.created`
- `project.updated`
- `project.deleted`
- `project.suspended`
- `project.archived`
- `project.cloned`
- `project.restored`

---

### 3. Deployment Service

**Purpose:** Application build and release management.

**Features:**
- Git-based deployments (GitHub, GitLab, Bitbucket)
- ZIP and CLI deployments
- Buildpack auto-detection (Node.js, Python, PHP)
- Dockerfile support
- Build log streaming
- Deployment versioning
- Rollback to previous version
- Environment variable management

**Dependencies:**
- PostgreSQL (projects schema)
- Docker (build runtime)
- Traefik (routing)
- Storage Service (build artifacts)

**API:** `/api/v1/projects/:id/deployments/*`

**SDK:** `platform.deployments.*`

**MCP:**
- `create_deployment`
- `get_deployment`
- `list_deployments`
- `get_deployment_logs`
- `rollback_deployment`

**Database Tables:**
- `projects.deployments`
- `projects.build_logs`

**Events Produced:**
- `deployment.started`
- `deployment.building`
- `deployment.deploying`
- `deployment.succeeded`
- `deployment.failed`
- `deployment.rolled_back`

---

### 4. Domain Service

**Purpose:** Domain registration, DNS validation, and SSL provisioning.

**Features:**
- Automatic subdomain assignment
- Custom domain registration
- DNS A-record validation
- Automatic SSL/TLS via Let's Encrypt
- Multi-region DNS propagation checking
- Domain status monitoring

**Dependencies:**
- PostgreSQL (projects schema)
- Traefik (ACME integration)

**API:** `/api/v1/domains/*`

**SDK:** `platform.domains.*`

**MCP:**
- `add_domain`
- `verify_domain`
- `delete_domain`
- `list_domains`
- `get_domain_status`

**Database Tables:**
- `projects.domains`

**Events Produced:**
- `domain.added`
- `domain.verified`
- `domain.failed`
- `domain.ssl_enabled`
- `domain.deleted`

---

### 5. Storage Service

**Purpose:** File upload, download, and management with multi-provider support.

**Features:**
- Bucket creation per project
- Multipart file upload
- Signed URL generation
- Public file access
- File metadata and tagging
- Provider abstraction (MinIO, Cloudinary, Telegram)

**Dependencies:**
- PostgreSQL (storage schema)
- MinIO or external provider

**API:** `/api/v1/storage/*`

**SDK:** `platform.storage.*`

**MCP:**
- `create_bucket`
- `delete_bucket`
- `upload_file`
- `download_file`
- `delete_file`
- `list_files`
- `generate_signed_url`

**Database Tables:**
- `storage.buckets`
- `storage.files`

**Events Produced:**
- `storage.bucket_created`
- `storage.bucket_deleted`
- `storage.file_uploaded`
- `storage.file_deleted`

---

### 6. Database Service

**Purpose:** Managed PostgreSQL databases for applications.

**Features:**
- Database provisioning per project
- Connection string management
- Automated backups
- Backup restoration
- Connection pooling
- Database status monitoring

**Dependencies:**
- PostgreSQL (infrastructure schema)
- MinIO (backup storage)

**API:** `/api/v1/databases/*`

**SDK:** `platform.databases.*`

**MCP:**
- `create_database`
- `get_database`
- `list_databases`
- `delete_database`
- `trigger_backup`
- `list_backups`
- `restore_backup`

**Database Tables:**
- `infrastructure.databases`
- `infrastructure.db_credentials`
- `infrastructure.db_backups`

**Events Produced:**
- `database.provisioned`
- `database.updated`
- `database.backup_started`
- `database.backup_completed`
- `database.restored`
- `database.deleted`

---

### 7. Auth Platform Service

**Purpose:** Application-level authentication (separate from platform auth).

**Features:**
- Email/password authentication for apps
- Magic link authentication
- Magic code authentication
- OAuth integration (Google, GitHub, etc.)
- Role and permission management per app
- API key management for apps
- Branded login pages
- User management dashboard

**Dependencies:**
- PostgreSQL (projects schema)
- Redis (session/cache)
- Email Service

**API:** `/api/v1/auth-platform/*`

**SDK:** `platform.authPlatform.*`

**MCP:**
- `create_auth_user`
- `verify_auth_user`
- `manage_api_keys`
- `configure_oauth`

**Database Tables:**
- `projects.app_users`
- `projects.app_sessions`
- `projects.app_roles`
- `projects.app_permissions`

**Events Produced:**
- `auth.user_created`
- `auth.user_verified`
- `auth.login_succeeded`
- `auth.login_failed`
- `auth.api_key_created`

---

### 8. Email Service

**Purpose:** Transactional email sending and management.

**Features:**
- Domain management (DKIM, SPF, DMARC)
- Mailbox creation per domain
- Alias management
- SMTP sending
- Email templates
- Delivery tracking
- Bounce handling
- Provider abstraction (Stalwart, Resend, SMTP)

**Dependencies:**
- PostgreSQL (email schema)
- Stalwart or external provider

**API:** `/api/v1/email/*`

**SDK:** `platform.email.*`

**MCP:**
- `add_email_domain`
- `create_mailbox`
- `delete_mailbox`
- `send_email`
- `list_email_logs`

**Database Tables:**
- `email.domains`
- `email.mailboxes`
- `email.logs`

**Events Produced:**
- `email.sent`
- `email.delivered`
- `email.bounced`
- `email.domain_added`
- `email.mailbox_created`

---

### 9. Realtime Service

**Purpose:** WebSocket channels, pub/sub, and presence.

**Features:**
- Channel creation and management
- Message broadcasting
- Presence detection
- Channel subscriptions
- Private channels
- Realtime database events

**Dependencies:**
- NATS (JetStream for persistence)

**API:** `/api/v1/realtime/*`

**SDK:** `platform.realtime.*`

**MCP:**
- `create_channel`
- `delete_channel`
- `list_channels`
- `get_presence`

**Database Tables:**
- `realtime.channels`
- `realtime.subscriptions`

**Events Produced:**
- `realtime.channel_created`
- `realtime.channel_deleted`
- `realtime.client_joined`
- `realtime.client_left`
- `realtime.message_sent`

---

### 10. Functions Service

**Purpose:** Serverless function execution environment.

**Features:**
- Function deployment
- Multiple runtimes (Node.js, Python, PHP)
- Environment variables
- Memory and timeout configuration
- Version management
- Invocation logs
- Error tracking

**Dependencies:**
- Docker (isolated execution)
- PostgreSQL (functions schema)

**API:** `/api/v1/functions/*`

**SDK:** `platform.functions.*`

**MCP:**
- `create_function`
- `deploy_function`
- `invoke_function`
- `list_functions`
- `get_function_logs`
- `delete_function`

**Database Tables:**
- `functions.functions`
- `functions.versions`
- `functions.invocation_logs`

**Events Produced:**
- `function.created`
- `function.deployed`
- `function.invoked`
- `function.error`
- `function.deleted`

---

### 11. Queue Service

**Purpose:** Background job processing with NATS JetStream.

**Features:**
- Queue creation and management
- Message publishing
- Message consumption
- Retry configuration
- Dead letter queues
- Queue flushing

**Dependencies:**
- NATS (JetStream)

**API:** `/api/v1/queues/*`

**SDK:** `platform.queues.*`

**MCP:**
- `create_queue`
- `delete_queue`
- `publish_message`
- `list_messages`
- `flush_queue`

**Database Tables:**
- `queues.queues`
- `queues.messages`

**Events Produced:**
- `queue.created`
- `queue.message_published`
- `queue.message_consumed`
- `queue.message_failed`
- `queue.message_retried`
- `queue.dead_lettered`

---

### 12. Cron Service

**Purpose:** Scheduled job management and execution.

**Features:**
- Cron expression parsing
- Scheduled execution
- Manual triggering
- Execution history
- Retry logic
- Timezone support

**Dependencies:**
- NATS (scheduling)
- PostgreSQL (cron schema)

**API:** `/api/v1/cron/*`

**SDK:** `platform.cron.*`

**MCP:**
- `create_cron_job`
- `update_cron_job`
- `delete_cron_job`
- `run_cron_job`
- `list_cron_executions`

**Database Tables:**
- `cron.jobs`
- `cron.executions`

**Events Produced:**
- `cron.job_created`
- `cron.job_updated`
- `cron.job_deleted`
- `cron.job_run_started`
- `cron.job_run_completed`
- `cron.job_run_failed`

---

### 13. Monitoring Service

**Purpose:** Infrastructure and application metrics.

**Features:**
- CPU, RAM, disk metrics
- Network I/O metrics
- Application metrics per project
- Prometheus integration
- Grafana dashboards
- Alert rules

**Dependencies:**
- Prometheus
- Grafana

**API:** `/api/v1/monitoring/*`

**SDK:** `platform.monitoring.*`

**MCP:**
- `get_metrics`
- `list_alerts`
- `configure_alert`

**Events Consumed:**
- All service events for aggregation

---

### 14. Logging Service

**Purpose:** Centralized log aggregation and search.

**Features:**
- Application log ingestion
- Function log aggregation
- Email log storage
- Deployment log storage
- Full-text search
- Log filtering by project, service, severity
- Log retention policies

**Dependencies:**
- Loki
- Vector (log shipping)

**API:** `/api/v1/logs/*`

**SDK:** `platform.logs.*`

**MCP:**
- `search_logs`
- `get_log_stream`

**Events Consumed:**
- All service events for log generation

---

### 15. Integration Hub Service

**Purpose:** Centralized provider management for all external integrations.

**Features:**
- Storage provider configuration
- Email provider configuration
- Git provider configuration
- AI provider configuration
- Provider health monitoring
- Provider fallback routing

**Dependencies:**
- PostgreSQL (configurations)

**API:** `/api/v1/integrations/*`

**SDK:** `platform.integrations.*`

**MCP:**
- `configure_provider`
- `get_provider_status`
- `list_providers`

**Database Tables:**
- `platform.integrations`

---

### 16. Skills Service

**Purpose:** Reusable business modules marketplace.

**Features:**
- Skill discovery
- One-click installation
- Version management
- Skill configuration
- Update propagation
- Community skills

**Dependencies:**
- Git (skill repositories)
- Docker (skill runtime)

**API:** `/api/v1/skills/*`

**SDK:** `platform.skills.*`

**MCP:**
- `list_skills`
- `install_skill`
- `uninstall_skill`

**Database Tables:**
- `skills.skills`
- `skills.installations`

**Events Produced:**
- `skill.installed`
- `skill.uninstalled`
- `skill.updated`

---

### 17. Templates Service

**Purpose:** Project scaffolding and generation.

**Features:**
- Template discovery
- Project generation from template
- Template variables
- Custom template creation
- Official and community templates

**Dependencies:**
- Git (template repositories)

**API:** `/api/v1/templates/*`

**SDK:** `platform.templates.*`

**MCP:**
- `list_templates`
- `generate_from_template`

**Database Tables:**
- `templates.templates`

---

### 18. AI Service

**Purpose:** Platform intelligence and assistance.

**Features:**
- Project generation assistance
- Error diagnosis
- Deployment assistance
- Infrastructure recommendations
- Skill generation
- Gemini integration

**Dependencies:**
- External AI providers (Gemini, OpenAI, Anthropic)

**API:** `/api/v1/ai/*`

**SDK:** `platform.ai.*`

**MCP:**
- `ai_assist`
- `diagnose_error`
- `generate_project`

---

## Service Dependencies Map

```
Auth Service
    |
    +-- Project Service
    |       |
    |       +-- Deployment Service
    |       |       +-- Storage Service
    |       |       +-- Domain Service
    |       |
    |       +-- Database Service
    |       |       +-- Storage Service (backups)
    |       |
    |       +-- Functions Service
    |       |       +-- Queue Service
    |       |
    |       +-- Cron Service
    |       |       +-- Queue Service
    |       |
    |       +-- Realtime Service
    |       +-- Auth Platform Service
    |               +-- Email Service
    |
    +-- Monitoring Service
    +-- Logging Service
    +-- Integration Hub Service
    +-- Skills Service
    +-- Templates Service
    +-- AI Service
```
