# FIDScript Deploy — Architecture Vision Document

> **Version:** 1.0  
> **Phase:** 0 — Architecture First  
> **Status:** Foundation for all subsequent phases  
> **Last Updated:** 2026-06-16

---

## Table of Contents

1. [Project Vision](#1-project-vision)
2. [System Architecture](#2-system-architecture)
3. [Database Architecture](#3-database-architecture)
4. [API Architecture](#4-api-architecture)
5. [Event Architecture](#5-event-architecture)
6. [SDK Architecture](#6-sdk-architecture)
7. [MCP Architecture](#7-mcp-architecture)
8. [Service Boundaries](#8-service-boundaries)
9. [Provider Abstraction Strategy](#9-provider-abstraction-strategy)
10. [Security Architecture](#10-security-architecture)
11. [Scaling Strategy](#11-scaling-strategy)
12. [Technology Stack](#12-technology-stack)
13. [Monorepo Structure](#13-monorepo-structure)
14. [Phase Dependencies](#14-phase-dependencies)
15. [Implementation Priorities](#15-implementation-priorities)

---

## 1. Project Vision

### 1.1 Mission Statement

FIDScript Deploy transforms any VPS into a complete, self-hosted Developer Operating System capable of providing application hosting, backend-as-a-service, realtime infrastructure, authentication, email, storage, queues, cron jobs, functions, monitoring, AI integration, and MCP-native platform management.

### 1.2 Design Philosophy

**Core Principle:** Applications deploy business logic; the platform provides infrastructure.

Applications must **never** create their own PostgreSQL, Redis, Realtime Servers, Email Workers, Queue Workers, or Cron Workers unless explicitly configured to do so.

### 1.3 Core Platform Rules

| Rule | Description |
|------|-------------|
| **Rule 1** | Everything must be API-first. If functionality cannot be accessed through API, it is incomplete. |
| **Rule 2** | Everything exposed through Dashboard must also be exposed through API, SDK, and MCP. |
| **Rule 3** | All platform actions must generate events (e.g., `project.created`, `deployment.started`). |
| **Rule 4** | All platform services must be independently replaceable via provider adapters. |
| **Rule 5** | Platform services should be shared whenever possible. |

### 1.4 Multi-Interface Strategy

All interfaces consume the same backend services:

- **Dashboard** — Human-facing web interface
- **API** — REST/GraphQL programmatic access
- **SDK** — Type-safe client libraries (JavaScript/TypeScript)
- **CLI** — Terminal-based management
- **MCP Server** — AI agent integration
- **AI Agents** — Intelligent platform automation

---

## 2. System Architecture

### 2.1 Architectural Layers

```
┌─────────────────────────────────────────────────────────────────┐
│                        CLIENT LAYER                              │
│  Dashboard (Next.js)  │  CLI  │  SDK  │  MCP Client  │  AI Agents│
└─────────────────────────────────────────────────────────────────┘
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────────┐
│                      INTEGRATION LAYER                           │
│                    API Gateway / Load Balancer                   │
│                         (Traefik)                                │
└─────────────────────────────────────────────────────────────────┘
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────────┐
│                       CONTROL PLANE                              │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────────────────┐  │
│  │ Auth Service │ │ Project Svc  │ │ Deployment Engine       │  │
│  │ Users/Roles  │ │ Management   │ │ Build & Release         │  │
│  └──────────────┘ └──────────────┘ └──────────────────────────┘  │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────────────────┐  │
│  │ Domain Svc   │ │ Storage Svc  │ │ Function Runtime        │  │
│  │ SSL/TLS      │ │ Multi-cloud │ │ Serverless Exec         │  │
│  └──────────────┘ └──────────────┘ └──────────────────────────┘  │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────────────────┐  │
│  │ Queue Svc    │ │ Cron Svc     │ │ Email Platform         │  │
│  │ NATS-based   │ │ Scheduler    │ │ Stalwart/SMTP/Resend   │  │
│  └──────────────┘ └──────────────┘ └──────────────────────────┘  │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────────────────┐  │
│  │ Realtime Svc │ │ Database Svc │ │ Monitoring              │  │
│  │ NATS Pubsub  │ │ Postgres     │ │ Prometheus/Grafana      │  │
│  └──────────────┘ └──────────────┘ └──────────────────────────┘  │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────────────────┐  │
│  │ Skills Svc   │ │ Templates    │ │ AI Layer               │  │
│  │ Marketplace │ │ Generator    │ │ Gemini Integration     │  │
│  └──────────────┘ └──────────────┘ └──────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────────┐
│                      RUNTIME PLANE                               │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────────────────┐  │
│  │ PostgreSQL   │ │ Redis        │ │ NATS                     │  │
│  │ Primary DB   │ │ Cache/Session│ │ Event Bus/Queue/Realtime│  │
│  └──────────────┘ └──────────────┘ └──────────────────────────┘  │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────────────────┐  │
│  │ MinIO        │ │ Traefik      │ │ Docker Engine           │  │
│  │ S3 Storage   │ │ Proxy/Router │ │ Container Runtime       │  │
│  └──────────────┘ └──────────────┘ └──────────────────────────┘  │
│  ┌──────────────┐ ┌──────────────┐                              │
│  │ Stalwart     │ │ Domain DNS    │                              │
│  │ Mail Server  │ │ Validator     │                              │
│  └──────────────┘ └──────────────┘                              │
└─────────────────────────────────────────────────────────────────┘
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────────┐
│                       AI LAYER                                   │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────────────────┐  │
│  │ AI Copilot   │ │ MCP Server    │ │ Skill Generator         │  │
│  │ Gemini       │ │ AI-Native MGMT│ │ AI-Assisted Dev        │  │
│  └──────────────┘ └──────────────┘ └──────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

### 2.2 Control Plane Services

| Service | Responsibility | Technology | Phase |
|---------|---------------|------------|-------|
| **Auth Service** | Identity, sessions, MFA, OAuth | NestJS + Passport | Phase 3 |
| **Project Service** | CRUD operations, lifecycle | NestJS | Phase 4 |
| **Deployment Engine** | Build, release, containers | Docker + Buildpacks | Phase 6 |
| **Domain Service** | DNS, SSL, routing | Traefik + Let's Encrypt | Phase 7 |
| **Storage Service** | File upload, multi-cloud | MinIO + Adapters | Phase 8 |
| **Auth Platform** | App-level auth, API keys | NestJS + JWT | Phase 9 |
| **Email Platform** | Transactional email | Stalwart + SMTP | Phase 10 |
| **Realtime Service** | WebSocket, pub/sub | NATS | Phase 11 |
| **Database Service** | Postgres management | PostgreSQL | Phase 12 |
| **Functions Runtime** | Serverless execution | Node.js isolated VMs | Phase 13 |
| **Queue Service** | Background jobs | NATS JetStream | Phase 14 |
| **Scheduler Service** | Cron management | NATS + PostgreSQL | Phase 15 |
| **Monitoring Service** | Metrics, alerting | Prometheus + Grafana | Phase 16 |
| **Logging Service** | Centralized logs | Loki + Vector | Phase 17 |
| **Skills Service** | Marketplace, install | Git + Docker | Phase 20 |
| **Template Service** | Project generation | Templates + AI | Phase 21 |
| **AI Layer** | Intelligent assistance | Gemini API | Phase 22 |

### 2.3 Runtime Plane Components

| Component | Purpose | Provider | Phase |
|-----------|---------|----------|-------|
| **PostgreSQL** | Primary database | Internal (PostgreSQL 16) | Phase 5 |
| **Redis** | Caching, sessions | Internal (Redis 7) | Phase 5 |
| **NATS** | Events, queues, realtime | Internal (NATS 2.10) | Phase 5 |
| **MinIO** | S3-compatible storage | Internal (MinIO 2024) | Phase 5 |
| **Traefik** | Reverse proxy, routing | Internal (Traefik 3.0) | Phase 2 |
| **Docker** | Container runtime | Internal (Docker 25) | Phase 2 |
| **Stalwart** | Mail server | Internal (Stalwart 3.0) | Phase 10 |

---

## 3. Database Architecture

### 3.1 Schema Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                      PLATFORM DATABASE                           │
│                     (PostgreSQL 16+)                             │
└─────────────────────────────────────────────────────────────────┘
```

### 3.2 Core Schemas

#### 3.2.1 Identity Schema (`identity`)

```sql
-- Users and authentication
CREATE TABLE identity.users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255),
    name VARCHAR(255),
    avatar_url TEXT,
    role VARCHAR(50) DEFAULT 'user',
    mfa_enabled BOOLEAN DEFAULT false,
    mfa_secret VARCHAR(255),
    last_login_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Sessions
CREATE TABLE identity.sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES identity.users(id) ON DELETE CASCADE,
    token_hash VARCHAR(255) NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Roles and permissions
CREATE TABLE identity.roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) UNIQUE NOT NULL,
    description TEXT,
    permissions JSONB DEFAULT '[]',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- API Keys
CREATE TABLE identity.api_keys (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES identity.users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    key_hash VARCHAR(255) NOT NULL,
    permissions JSONB DEFAULT '[]',
    last_used_at TIMESTAMP WITH TIME ZONE,
    expires_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Audit logs
CREATE TABLE identity.audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES identity.users(id),
    action VARCHAR(100) NOT NULL,
    resource_type VARCHAR(100),
    resource_id UUID,
    metadata JSONB DEFAULT '{}',
    ip_address INET,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### 3.2.2 Projects Schema (`projects`)

```sql
-- Projects
CREATE TABLE projects.projects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(255) UNIQUE NOT NULL,
    description TEXT,
    type VARCHAR(50) NOT NULL, -- frontend, backend, worker, cron, docker, static
    status VARCHAR(50) DEFAULT 'creating', -- creating, active, suspended, archived
    owner_id UUID REFERENCES identity.users(id) ON DELETE CASCADE,
    region VARCHAR(100),
    subdomain VARCHAR(255),
    custom_domains JSONB DEFAULT '[]',
    env_vars JSONB DEFAULT '{}',
    build_settings JSONB DEFAULT '{}',
    deployment_strategy VARCHAR(50) DEFAULT 'buildpack', -- buildpack, dockerfile
    source_provider VARCHAR(50), -- github, gitlab, bitbucket, cli, zip
    source_repo VARCHAR(500),
    source_branch VARCHAR(255) DEFAULT 'main',
    last_deploy_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Project deployments
CREATE TABLE projects.deployments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID REFERENCES projects.projects(id) ON DELETE CASCADE,
    version VARCHAR(50) NOT NULL,
    status VARCHAR(50) DEFAULT 'pending', -- pending, building, deploying, success, failed, rolled_back
    commit_sha VARCHAR(40),
    commit_message TEXT,
    build_logs TEXT,
    build_duration_ms INTEGER,
    deployment_url TEXT,
    rolled_back_to UUID REFERENCES projects.deployments(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE
);

-- Project domains
CREATE TABLE projects.domains (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID REFERENCES projects.projects(id) ON DELETE CASCADE,
    domain VARCHAR(255) NOT NULL,
    is_custom BOOLEAN DEFAULT false,
    ssl_enabled BOOLEAN DEFAULT true,
    ssl_cert_arn VARCHAR(255),
    dns_status VARCHAR(50) DEFAULT 'pending',
    dns_verified_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### 3.2.3 Infrastructure Schema (`infrastructure`)

```sql
-- Managed database instances
CREATE TABLE infrastructure.databases (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID REFERENCES projects.projects(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    type VARCHAR(50) NOT NULL, -- postgres, mysql, redis
    status VARCHAR(50) DEFAULT 'provisioning',
    host VARCHAR(255),
    port INTEGER,
    max_connections INTEGER DEFAULT 100,
    storage_gb DECIMAL(10,2),
    backup_enabled BOOLEAN DEFAULT true,
    backup_schedule CRON,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Database credentials (encrypted)
CREATE TABLE infrastructure.db_credentials (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    database_id UUID REFERENCES infrastructure.databases(id) ON DELETE CASCADE,
    username VARCHAR(255) NOT NULL,
    password_encrypted BYTEA NOT NULL,
    connection_string_encrypted BYTEA NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### 3.2.4 Storage Schema (`storage`)

```sql
-- Storage buckets
CREATE TABLE storage.buckets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID REFERENCES projects.projects(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    provider VARCHAR(50) DEFAULT 'internal', -- internal, cloudinary, telegram
    region VARCHAR(100),
    is_public BOOLEAN DEFAULT false,
    max_size_bytes BIGINT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Storage files (metadata)
CREATE TABLE storage.files (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    bucket_id UUID REFERENCES storage.buckets(id) ON DELETE CASCADE,
    key VARCHAR(1024) NOT NULL,
    original_name VARCHAR(255),
    mime_type VARCHAR(255),
    size_bytes BIGINT DEFAULT 0,
    etag VARCHAR(255),
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### 3.2.5 Email Schema (`email`)

```sql
-- Email domains
CREATE TABLE email.domains (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID REFERENCES projects.projects(id) ON DELETE CASCADE,
    domain VARCHAR(255) NOT NULL,
    dkim_verified BOOLEAN DEFAULT false,
    spf_verified BOOLEAN DEFAULT false,
    dmarc_verified BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Email mailboxes
CREATE TABLE email.mailboxes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    domain_id UUID REFERENCES email.domains(id) ON DELETE CASCADE,
    local_part VARCHAR(255) NOT NULL,
    password_encrypted BYTEA NOT NULL,
    quota_mb INTEGER DEFAULT 1024,
    is_alias BOOLEAN DEFAULT false,
    forwards_to TEXT[],
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Email logs
CREATE TABLE email.logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID REFERENCES projects.projects(id) ON DELETE CASCADE,
    from_address VARCHAR(500) NOT NULL,
    to_address TEXT[] NOT NULL,
    subject VARCHAR(500),
    status VARCHAR(50) DEFAULT 'sent', -- sent, delivered, bounced, failed
    provider VARCHAR(50) DEFAULT 'internal',
    message_id VARCHAR(500),
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### 3.2.6 Functions Schema (`functions`)

```sql
-- Serverless functions
CREATE TABLE functions.functions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID REFERENCES projects.projects(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    runtime VARCHAR(50) NOT NULL, -- nodejs18, python311, php82
    code_path VARCHAR(1024),
    environment JSONB DEFAULT '{}',
    memory_mb INTEGER DEFAULT 256,
    timeout_seconds INTEGER DEFAULT 30,
    max_instances INTEGER DEFAULT 10,
    current_version VARCHAR(50),
    status VARCHAR(50) DEFAULT 'active',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Function versions
CREATE TABLE functions.versions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    function_id UUID REFERENCES functions.functions(id) ON DELETE CASCADE,
    version VARCHAR(50) NOT NULL,
    code_digest VARCHAR(64) NOT NULL,
    environment JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Function invocation logs
CREATE TABLE functions.invocation_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    function_id UUID REFERENCES functions.functions(id) ON DELETE CASCADE,
    version VARCHAR(50) NOT NULL,
    status VARCHAR(50) NOT NULL, -- started, completed, failed, timeout
    duration_ms INTEGER,
    memory_used_mb INTEGER,
    logs TEXT,
    error TEXT,
    invoked_by VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### 3.2.7 Queues Schema (`queues`)

```sql
-- Queue definitions
CREATE TABLE queues.queues (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID REFERENCES projects.projects(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    type VARCHAR(50) DEFAULT 'work', -- work, stream, dead_letter
    max_retries INTEGER DEFAULT 3,
    visibility_timeout_secs INTEGER DEFAULT 30,
    retention_hours INTEGER DEFAULT 72,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Queue messages (for dead letter tracking)
CREATE TABLE queues.messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    queue_id UUID REFERENCES queues.queues(id) ON DELETE CASCADE,
    message_id VARCHAR(255) NOT NULL,
    payload JSONB NOT NULL,
    status VARCHAR(50) DEFAULT 'pending',
    retry_count INTEGER DEFAULT 0,
    last_error TEXT,
    process_after TIMESTAMP WITH TIME ZONE,
    processed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### 3.2.8 Cron Schema (`cron`)

```sql
-- Cron jobs
CREATE TABLE cron.jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID REFERENCES projects.projects(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    cron_expression VARCHAR(100) NOT NULL,
    endpoint VARCHAR(1024) NOT NULL,
    method VARCHAR(10) DEFAULT 'POST',
    headers JSONB DEFAULT '{}',
    body TEXT,
    timezone VARCHAR(100) DEFAULT 'UTC',
    is_active BOOLEAN DEFAULT true,
    last_run_at TIMESTAMP WITH TIME ZONE,
    next_run_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Cron execution history
CREATE TABLE cron.executions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_id UUID REFERENCES cron.jobs(id) ON DELETE CASCADE,
    status VARCHAR(50) NOT NULL, -- running, success, failed
    duration_ms INTEGER,
    response_code INTEGER,
    response_body TEXT,
    error TEXT,
    started_at TIMESTAMP WITH TIME ZONE NOT NULL,
    completed_at TIMESTAMP WITH TIME ZONE
);
```

#### 3.2.9 Realtime Schema (`realtime`)

```sql
-- Realtime channels
CREATE TABLE realtime.channels (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID REFERENCES projects.projects(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    is_private BOOLEAN DEFAULT false,
    presence_enabled BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Channel subscriptions
CREATE TABLE realtime.subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    channel_id UUID REFERENCES realtime.channels(id) ON DELETE CASCADE,
    connection_id VARCHAR(255) NOT NULL,
    user_id UUID REFERENCES identity.users(id),
    metadata JSONB DEFAULT '{}',
    subscribed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### 3.2.10 Skills Schema (`skills`)

```sql
-- Available skills
CREATE TABLE skills.skills (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(255) UNIQUE NOT NULL,
    category VARCHAR(100),
    description TEXT,
    version VARCHAR(50),
    manifest JSONB NOT NULL,
    docker_image VARCHAR(500),
    repository_url VARCHAR(500),
    is_official BOOLEAN DEFAULT false,
    is_installed BOOLEAN DEFAULT false,
    installed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Installed skill configurations
CREATE TABLE skills.installations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    skill_id UUID REFERENCES skills.skills(id) ON DELETE CASCADE,
    project_id UUID REFERENCES projects.projects(id) ON DELETE CASCADE,
    config JSONB DEFAULT '{}',
    version VARCHAR(50),
    status VARCHAR(50) DEFAULT 'active',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### 3.2.11 Templates Schema (`templates`)

```sql
-- Project templates
CREATE TABLE templates.templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(255) UNIQUE NOT NULL,
    category VARCHAR(100),
    description TEXT,
    preview_images TEXT[],
    manifest JSONB NOT NULL,
    source_url VARCHAR(500),
    variables JSONB DEFAULT '[]',
    is_official BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### 3.2.12 Events Schema (`events`)

```sql
-- Platform events (immutable audit trail)
CREATE TABLE events.events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_type VARCHAR(100) NOT NULL,
    source_service VARCHAR(100) NOT NULL,
    project_id UUID REFERENCES projects.projects(id) ON DELETE SET NULL,
    user_id UUID REFERENCES identity.users(id) ON DELETE SET NULL,
    resource_type VARCHAR(100),
    resource_id UUID,
    payload JSONB DEFAULT '{}',
    correlation_id UUID,
    causation_id UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Event subscriptions (for webhooks, etc.)
CREATE TABLE events.subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID REFERENCES projects.projects(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    event_types TEXT[] NOT NULL,
    endpoint_url VARCHAR(1024) NOT NULL,
    secret_encrypted BYTEA,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### 3.3 Indexes

```sql
-- High-frequency query indexes
CREATE INDEX idx_projects_owner ON projects.projects(owner_id);
CREATE INDEX idx_projects_slug ON projects.projects(slug);
CREATE INDEX idx_projects_status ON projects.projects(status);
CREATE INDEX idx_deployments_project ON projects.deployments(project_id);
CREATE INDEX idx_deployments_created ON projects.deployments(created_at DESC);
CREATE INDEX idx_files_bucket ON storage.files(bucket_id);
CREATE INDEX idx_files_created ON storage.files(created_at DESC);
CREATE INDEX idx_email_logs_project ON email.logs(project_id);
CREATE INDEX idx_email_logs_created ON email.logs(created_at DESC);
CREATE INDEX idx_events_type ON events.events(event_type);
CREATE INDEX idx_events_project ON events.events(project_id);
CREATE INDEX idx_events_created ON events.events(created_at DESC);
CREATE INDEX idx_cron_jobs_project ON cron.jobs(project_id);
CREATE INDEX idx_functions_project ON functions.functions(project_id);
CREATE INDEX idx_queues_project ON queues.queues(project_id);
CREATE INDEX idx_sessions_user ON identity.sessions(user_id);
CREATE INDEX idx_audit_logs_user ON identity.audit_logs(user_id);
CREATE INDEX idx_audit_logs_created ON identity.audit_logs(created_at DESC);
```

---

## 4. API Architecture

### 4.1 API Design Principles

1. **RESTful with JSON:API hints** — Predictable URLs, standard HTTP methods
2. **Versioned** — `/api/v1/` prefix, deprecation notices
3. **Consistent response format** — Always returns `{ data, meta, error }`
4. **Pagination** — Cursor-based for lists, `?cursor=X&limit=50`
5. **Filtering & Sorting** — `?filter[status]=active&sort=-created_at`

### 4.2 API Routes Overview

```
/api/v1
├── /auth
│   ├── POST   /login                    # Email/password login
│   ├── POST   /logout                   # Invalidate session
│   ├── POST   /register                 # Create account
│   ├── POST   /mfa/setup                # Initialize MFA
│   ├── POST   /mfa/verify               # Verify MFA code
│   ├── POST   /magic-link               # Send magic link
│   └── GET    /me                       # Current user profile
│
├── /projects
│   ├── GET    /                         # List projects
│   ├── POST   /                         # Create project
│   ├── GET    /:id                       # Get project
│   ├── PATCH  /:id                       # Update project
│   ├── DELETE /:id                       # Delete project
│   ├── POST   /:id/suspend              # Suspend project
│   ├── POST   /:id/archive              # Archive project
│   └── POST   /:id/clone                # Clone project
│
│   ├── /:id/deployments
│   │   ├── GET    /                      # List deployments
│   │   ├── POST   /                      # Trigger deployment
│   │   ├── GET    /:deploymentId         # Get deployment
│   │   └── POST   /:deploymentId/rollback # Rollback
│   │
│   ├── /:id/domains
│   │   ├── GET    /                      # List domains
│   │   ├── POST   /                      # Add domain
│   │   ├── DELETE /:domainId             # Remove domain
│   │   └── POST   /:domainId/verify     # Verify DNS
│   │
│   ├── /:id/env-vars
│   │   ├── GET    /                      # List env vars
│   │   ├── PUT    /                      # Update env vars
│   │   └── DELETE /:key                  # Remove env var
│   │
│   └── /:id/logs
│       ├── GET    /build                 # Build logs
│       ├── GET    /runtime                # Runtime logs
│       └── GET    /streaming             # Stream logs (SSE)
│
├── /databases
│   ├── GET    /                          # List managed databases
│   ├── POST   /                          # Provision database
│   ├── GET    /:id                       # Get database
│   ├── PATCH  /:id                       # Update database
│   ├── DELETE /:id                       # Delete database
│   ├── GET    /:id/credentials           # Get connection info
│   ├── POST   /:id/backup                # Trigger backup
│   └── GET    /:id/backups               # List backups
│
├── /storage
│   ├── GET    /buckets                  # List buckets
│   ├── POST   /buckets                  # Create bucket
│   ├── DELETE /buckets/:id              # Delete bucket
│   ├── GET    /buckets/:id/files        # List files
│   ├── POST   /buckets/:id/files/upload # Upload file (multipart)
│   ├── GET    /buckets/:id/files/:fileId # Download file
│   ├── DELETE /buckets/:id/files/:fileId # Delete file
│   └── POST   /buckets/:id/generate-url  # Generate signed URL
│
├── /email
│   ├── GET    /domains                  # List email domains
│   ├── POST   /domains                  # Add email domain
│   ├── DELETE /domains/:id              # Remove domain
│   ├── GET    /domains/:id/mailboxes    # List mailboxes
│   ├── POST   /domains/:id/mailboxes    # Create mailbox
│   ├── DELETE /mailboxes/:id            # Delete mailbox
│   ├── POST   /send                      # Send email
│   └── GET    /logs                     # View email logs
│
├── /functions
│   ├── GET    /                          # List functions
│   ├── POST   /                          # Create function
│   ├── GET    /:id                       # Get function
│   ├── PATCH  /:id                       # Update function
│   ├── DELETE /:id                       # Delete function
│   ├── POST   /:id/deploy                # Deploy new version
│   ├── GET    /:id/versions              # List versions
│   ├── POST   /:id/invoke                # Invoke function
│   └── GET    /:id/logs                  # Get invocation logs
│
├── /queues
│   ├── GET    /                          # List queues
│   ├── POST   /                          # Create queue
│   ├── GET    /:id                       # Get queue
│   ├── DELETE /:id                       # Delete queue
│   ├── POST   /:id/messages              # Publish message
│   ├── GET    /:id/messages              # List messages
│   └── POST   /:id/flush                 # Flush queue
│
├── /cron
│   ├── GET    /                          # List cron jobs
│   ├── POST   /                          # Create cron job
│   ├── GET    /:id                       # Get cron job
│   ├── PATCH  /:id                       # Update cron job
│   ├── DELETE /:id                       # Delete cron job
│   ├── POST   /:id/run                   # Run manually
│   ├── GET    /:id/executions            # Execution history
│   └── GET    /executions/:execId        # Get execution details
│
├── /realtime
│   ├── GET    /channels                 # List channels
│   ├── POST   /channels                  # Create channel
│   ├── GET    /channels/:id             # Get channel
│   ├── DELETE /channels/:id             # Delete channel
│   └── GET    /channels/:id/presence   # Channel presence
│
├── /skills
│   ├── GET    /                          # List available skills
│   ├── GET    /installed                # List installed skills
│   ├── POST   /:id/install              # Install skill
│   ├── POST   /:id/uninstall            # Uninstall skill
│   └── GET    /:id/config               # Get skill config
│
├── /templates
│   ├── GET    /                          # List templates
│   ├── GET    /:id                       # Get template
│   └── POST   /:id/generate              # Generate project from template
│
├── /events
│   ├── GET    /                          # List events (with filters)
│   ├── GET    /:id                       # Get event details
│   ├── POST   /subscriptions             # Create webhook
│   └── GET    /subscriptions             # List webhooks
│
└── /platform
    ├── GET    /stats                     # Platform statistics
    ├── GET    /health                    # Health check
    ├── GET    /metrics                    # Prometheus metrics
    └── GET    /regions                    # Available regions
```

### 4.3 Response Format

#### Success Response
```json
{
  "data": { ... },
  "meta": {
    "requestId": "req_abc123",
    "timestamp": "2026-06-16T12:00:00Z"
  }
}
```

#### List Response
```json
{
  "data": [ ... ],
  "meta": {
    "requestId": "req_abc123",
    "timestamp": "2026-06-16T12:00:00Z",
    "pagination": {
      "cursor": "eyJpZCI6MTIzfQ==",
      "hasMore": true,
      "limit": 50
    }
  }
}
```

#### Error Response
```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid input",
    "details": [
      { "field": "email", "message": "Must be a valid email" }
    ]
  },
  "meta": {
    "requestId": "req_abc123",
    "timestamp": "2026-06-16T12:00:00Z"
  }
}
```

### 4.4 HTTP Status Codes

| Code | Usage |
|------|-------|
| 200 | Success |
| 201 | Created |
| 204 | No Content (deleted) |
| 400 | Validation error |
| 401 | Unauthenticated |
| 403 | Forbidden |
| 404 | Not found |
| 409 | Conflict |
| 429 | Rate limited |
| 500 | Internal error |

---

## 5. Event Architecture

### 5.1 Event System Design

All platform actions generate events. Events are:
- **Immutable** — Never modified after creation
- **Ordered** — Strict ordering within a project
- **Queryable** — Indexed for filtering and replay

### 5.2 Event Schema

```typescript
interface PlatformEvent {
  id: string;                    // UUID
  eventType: string;             // e.g., "project.created"
  sourceService: string;        // e.g., "projects-service"
  projectId?: string;           // Optional project association
  userId?: string;               // Optional user association
  resourceType?: string;         // e.g., "project", "deployment"
  resourceId?: string;          // UUID of the resource
  payload: Record<string, any>;   // Event-specific data
  correlationId?: string;        // For tracing related events
  causationId?: string;          // ID of the event that caused this
  timestamp: string;            // ISO 8601
}
```

### 5.3 Event Catalog

#### Identity Events
| Event | Description |
|-------|-------------|
| `user.created` | New user registered |
| `user.updated` | User profile changed |
| `user.deleted` | User account deleted |
| `user.login` | User logged in |
| `user.logout` | User logged out |
| `session.created` | New session created |
| `session.revoked` | Session invalidated |
| `api_key.created` | API key generated |
| `api_key.revoked` | API key revoked |
| `mfa.enabled` | MFA enabled |
| `mfa.disabled` | MFA disabled |

#### Project Events
| Event | Description |
|-------|-------------|
| `project.created` | New project created |
| `project.updated` | Project settings changed |
| `project.deleted` | Project deleted |
| `project.suspended` | Project suspended |
| `project.archived` | Project archived |
| `project.cloned` | Project cloned |
| `project.restored` | Project restored |

#### Deployment Events
| Event | Description |
|-------|-------------|
| `deployment.started` | Deployment initiated |
| `deployment.building` | Build phase started |
| `deployment.deploying` | Deploy phase started |
| `deployment.succeeded` | Deployment successful |
| `deployment.failed` | Deployment failed |
| `deployment.rolled_back` | Rolled back to previous |

#### Domain Events
| Event | Description |
|-------|-------------|
| `domain.added` | Domain added to project |
| `domain.verified` | DNS verification passed |
| `domain.failed` | DNS verification failed |
| `domain.ssl_enabled` | SSL certificate provisioned |
| `domain.deleted` | Domain removed |

#### Database Events
| Event | Description |
|-------|-------------|
| `database.provisioned` | Database instance created |
| `database.updated` | Database settings changed |
| `database.backup_started` | Backup initiated |
| `database.backup_completed` | Backup finished |
| `database.restored` | Data restored from backup |
| `database.deleted` | Database deleted |

#### Storage Events
| Event | Description |
|-------|-------------|
| `storage.bucket_created` | New bucket created |
| `storage.file_uploaded` | File uploaded |
| `storage.file_deleted` | File deleted |
| `storage.bucket_deleted` | Bucket deleted |

#### Email Events
| Event | Description |
|-------|-------------|
| `email.sent` | Email dispatched |
| `email.delivered` | Email delivered to recipient |
| `email.bounced` | Email bounced |
| `email.opened` | Email opened (tracking) |
| `email.link_clicked` | Link in email clicked |
| `email.domain_added` | Email domain added |
| `email.mailbox_created` | Mailbox created |

#### Functions Events
| Event | Description |
|-------|-------------|
| `function.created` | Function created |
| `function.deployed` | New version deployed |
| `function.invoked` | Function called |
| `function.error` | Function execution error |
| `function.deleted` | Function deleted |

#### Queue Events
| Event | Description |
|-------|-------------|
| `queue.created` | Queue created |
| `queue.message_published` | Message sent to queue |
| `queue.message_consumed` | Message processed |
| `queue.message_failed` | Message processing failed |
| `queue.message_retried` | Message retried |
| `queue.dead_lettered` | Message moved to DLQ |
| `queue.flushed` | Queue flushed |

#### Cron Events
| Event | Description |
|-------|-------------|
| `cron.job_created` | Cron job created |
| `cron.job_updated` | Cron job updated |
| `cron.job_deleted` | Cron job deleted |
| `cron.job_run_started` | Cron execution started |
| `cron.job_run_completed` | Cron execution finished |
| `cron.job_run_failed` | Cron execution failed |

#### Realtime Events
| Event | Description |
|-------|-------------|
| `realtime.channel_created` | Channel created |
| `realtime.channel_deleted` | Channel deleted |
| `realtime.client_joined` | Client subscribed |
| `realtime.client_left` | Client unsubscribed |
| `realtime.message_sent` | Message published |

#### Skills Events
| Event | Description |
|-------|-------------|
| `skill.installed` | Skill installed |
| `skill.uninstalled` | Skill removed |
| `skill.updated` | Skill updated |

---

## 6. SDK Architecture

### 6.1 SDK Packages

```
packages/
├── sdk/                    # JavaScript/TypeScript SDK
│   ├── src/
│   │   ├── index.ts       # Main export
│   │   ├── client.ts      # Core client
│   │   ├── auth/          # Authentication
│   │   │   ├── index.ts
│   │   │   ├── login.ts
│   │   │   ├── magic-link.ts
│   │   │   └── oauth.ts
│   │   ├── projects/      # Project management
│   │   │   ├── index.ts
│   │   │   ├── create.ts
│   │   │   ├── list.ts
│   │   │   └── manage.ts
│   │   ├── storage/       # Storage operations
│   │   │   ├── index.ts
│   │   │   ├── upload.ts
│   │   │   ├── download.ts
│   │   │   └── signed-urls.ts
│   │   ├── email/         # Email operations
│   │   │   ├── index.ts
│   │   │   ├── send.ts
│   │   │   └── templates.ts
│   │   ├── db/            # Database operations
│   │   │   ├── index.ts
│   │   │   ├── query.ts
│   │   │   └── migrations.ts
│   │   ├── realtime/      # Realtime subscriptions
│   │   │   ├── index.ts
│   │   │   ├── channel.ts
│   │   │   └── presence.ts
│   │   ├── functions/     # Serverless functions
│   │   │   ├── index.ts
│   │   │   └── invoke.ts
│   │   ├── queues/        # Queue operations
│   │   │   ├── index.ts
│   │   │   ├── publish.ts
│   │   │   └── consume.ts
│   │   ├── cron/          # Cron management
│   │   │   ├── index.ts
│   │   │   └── schedules.ts
│   │   └── types/         # Shared TypeScript types
│   │       ├── index.ts
│   │       ├── project.ts
│   │       ├── deployment.ts
│   │       └── ...
│   ├── package.json
│   └── tsconfig.json
│
└── shared/                 # Shared utilities
    └── src/
        ├── errors/        # Error classes
        ├── validators/   # Input validation
        └── utils/        # Common utilities
```

### 6.2 SDK Usage Examples

```typescript
import { createClient } from '@fidscript/sdk';

// Initialize client
const client = createClient({
  apiKey: process.env.FIDSCRIPT_API_KEY,
  projectId: 'proj_abc123'
});

// Authentication
const { user, session } = await client.auth.login({
  email: 'user@example.com',
  password: 'secure-password'
});

// Project management
const project = await client.projects.create({
  name: 'my-app',
  type: 'frontend',
  framework: 'nextjs'
});

const deployment = await client.projects.deployments.create(project.id, {
  branch: 'main'
});

// Storage
const upload = await client.storage.upload({
  bucket: 'assets',
  key: 'images/logo.png',
  body: fs.createReadStream('./logo.png'),
  contentType: 'image/png'
});

const signedUrl = await client.storage.getSignedUrl({
  bucket: 'assets',
  key: 'images/logo.png',
  expiresIn: 3600
});

// Email
await client.email.send({
  from: 'no-reply@myapp.com',
  to: ['user@example.com'],
  subject: 'Welcome!',
  template: 'welcome',
  data: { name: 'User' }
});

// Realtime
const channel = client.realtime.channel('updates');
channel.on('message', (msg) => {
  console.log('Received:', msg);
});
await channel.subscribe();

// Functions
const result = await client.functions.invoke('processPayment', {
  orderId: 'ord_123',
  amount: 99.99
});

// Queues
await client.queues.publish('order-notifications', {
  orderId: 'ord_123',
  type: 'confirmation'
});

// Cron
await client.cron.create({
  name: 'Daily Report',
  schedule: '0 9 * * *',
  endpoint: '/api/reports/generate',
  method: 'POST'
});
```

### 6.3 Type Generation

SDK types are auto-generated from the API schema:

```typescript
// Auto-generated from OpenAPI spec
interface Project {
  id: string;
  name: string;
  slug: string;
  type: 'frontend' | 'backend' | 'worker' | 'cron' | 'docker' | 'static';
  status: 'creating' | 'active' | 'suspended' | 'archived';
  ownerId: string;
  subdomain: string;
  customDomains: string[];
  envVars: Record<string, string>;
  createdAt: string;
  updatedAt: string;
}
```

---

## 7. MCP Architecture

### 7.1 MCP Server Design

FIDScript MCP Server provides AI-native platform management. All tools follow the Model Context Protocol specification.

### 7.2 MCP Tools

```typescript
// Project Management
mcp_project_list()           // List all projects
mcp_project_create()          // Create new project
mcp_project_get()             // Get project details
mcp_project_update()          // Update project settings
mcp_project_delete()          // Delete project
mcp_project_suspend()         // Suspend project
mcp_project_archive()         // Archive project

// Deployment Management
mcp_deployment_list()         // List deployments
mcp_deployment_create()       // Trigger deployment
mcp_deployment_get()          // Get deployment status
mcp_deployment_logs()         // Stream deployment logs
mcp_deployment_rollback()     // Rollback to previous

// Domain Management
mcp_domain_list()             // List domains
mcp_domain_add()              // Add custom domain
mcp_domain_verify()          // Verify DNS
mcp_domain_delete()           // Remove domain

// Storage Operations
mcp_storage_bucket_list()     // List buckets
mcp_storage_file_upload()     // Upload file
mcp_storage_file_list()       // List files
mcp_storage_file_get()        // Get file URL
mcp_storage_file_delete()     // Delete file

// Database Management
mcp_database_list()          // List databases
mcp_database_create()        // Provision database
mcp_database_get()           // Get database info
mcp_database_backup()         // Trigger backup

// Function Management
mcp_function_list()          // List functions
mcp_function_create()        // Create function
mcp_function_deploy()        // Deploy version
mcp_function_invoke()        // Invoke function
mcp_function_logs()          // Get invocation logs

// Queue Operations
mcp_queue_list()             // List queues
mcp_queue_create()           // Create queue
mcp_queue_publish()          // Publish message
mcp_queue_get_messages()    // Get queue messages

// Cron Management
mcp_cron_list()              // List cron jobs
mcp_cron_create()            // Create cron job
mcp_cron_update()            // Update cron job
mcp_cron_delete()            // Delete cron job
mcp_cron_run()               // Run manually
mcp_cron_history()           // Get execution history

// Email Operations
mcp_email_domain_list()      // List email domains
mcp_email_mailbox_list()     // List mailboxes
mcp_email_send()             // Send email
mcp_email_logs()             // View email logs

// Skills Marketplace
mcp_skill_list()             // List available skills
mcp_skill_install()          // Install skill
mcp_skill_uninstall()        // Uninstall skill

// Template Operations
mcp_template_list()          // List templates
mcp_template_generate()      // Generate project from template

// Platform Operations
mcp_platform_stats()         // Get platform statistics
mcp_platform_health()        // Health check
```

### 7.3 MCP Resource Types

```typescript
// Project resources
mcp://projects/{projectId}
mcp://projects/{projectId}/deployments
mcp://projects/{projectId}/domains
mcp://projects/{projectId}/logs
mcp://projects/{projectId}/env-vars

// Database resources
mcp://databases/{databaseId}
mcp://databases/{databaseId}/backups

// Storage resources
mcp://buckets/{bucketId}
mcp://buckets/{bucketId}/files/{fileId}

// Function resources
mcp://functions/{functionId}
mcp://functions/{functionId}/versions
mcp://functions/{functionId}/logs

// Queue resources
mcp://queues/{queueId}/messages
```

### 7.4 MCP Prompt Templates

```typescript
// Deployment assistance prompt
`Help me deploy project {projectName} from {sourceRepo} branch {branch}.
 I want to configure:
 - Build command: {buildCommand}
 - Output directory: {outputDir}
 - Environment variables: {envVars}`

// Error diagnosis prompt
`Analyze the following deployment error logs:
 {logs}

 Project: {projectName}
 Deployment ID: {deploymentId}

 Provide:
 1. Root cause analysis
 2. Suggested fix
 3. Steps to retry`

// Infrastructure recommendation prompt
`For a {projectType} project with:
 - Expected traffic: {traffic}
 - Required services: {services}
 - Budget: {budget}

 Recommend:
 1. Appropriate instance sizing
 2. Database configuration
 3. Caching strategy
 4. CDN setup`
```

---

## 8. Service Boundaries

### 8.1 Service Ownership Matrix

| Service | Owner | Consumes | Produces Events |
|---------|-------|----------|-----------------|
| **Auth Service** | Identity | Sessions, JWT | user.*, session.* |
| **Project Service** | Projects | Auth, Storage, DB | project.*, deployment.* |
| **Deployment Engine** | Projects | Git, Docker, Storage | deployment.* |
| **Domain Service** | Infrastructure | DNS, Traefik | domain.* |
| **Storage Service** | Infrastructure | MinIO, S3 | storage.* |
| **Database Service** | Infrastructure | PostgreSQL | database.* |
| **Email Service** | Infrastructure | Stalwart, SMTP | email.* |
| **Functions Runtime** | Runtime | Docker, NATS | function.* |
| **Queue Service** | Runtime | NATS | queue.* |
| **Cron Service** | Runtime | NATS, PostgreSQL | cron.* |
| **Realtime Service** | Runtime | NATS | realtime.* |
| **Skills Service** | Marketplace | Git, Docker | skill.* |
| **Template Service** | Marketplace | Git | template.* |

### 8.2 Service Communication

Services communicate via:
1. **Synchronous** — REST for user-initiated actions
2. **Asynchronous** — NATS for events and background tasks
3. **Streaming** — SSE/WebSocket for logs and realtime

### 8.3 Service Dependency Graph

```
                    ┌──────────────┐
                    │  Auth Svc    │
                    └──────┬───────┘
                           │
           ┌───────────────┼───────────────┐
           │               │               │
           ▼               ▼               ▼
    ┌────────────┐  ┌────────────┐  ┌────────────┐
    │ Project Svc│  │ Domain Svc│  │ Storage Svc│
    └─────┬──────┘  └─────┬──────┘  └─────┬──────┘
          │               │               │
          └───────────────┼───────────────┘
                          │
                          ▼
                 ┌──────────────────┐
                 │ Deployment Engine│
                 └────────┬─────────┘
                          │
          ┌───────────────┼───────────────┐
          │               │               │
          ▼               ▼               ▼
    ┌────────────┐  ┌────────────┐  ┌────────────┐
    │  Functions │  │   Queues   │  │    Cron    │
    └─────┬──────┘  └─────┬──────┘  └─────┬──────┘
          │               │               │
          └───────────────┼───────────────┘
                          │
                          ▼
    ┌──────────────────────────────────────────┐
    │              NATS (Event Bus)            │
    └──────────────────────────────────────────┘
                          │
          ┌───────────────┼───────────────┐
          │               │               │
          ▼               ▼               ▼
    ┌────────────┐  ┌────────────┐  ┌────────────┐
    │  Realtime  │  │   Email    │  │ Monitoring │
    └────────────┘  └────────────┘  └────────────┘
```

---

## 9. Provider Abstraction Strategy

### 9.1 Storage Providers

```typescript
interface StorageAdapter {
  name: string;
  
  // File operations
  upload(key: string, body: Buffer, options: UploadOptions): Promise<UploadResult>;
  download(key: string): Promise<Buffer>;
  delete(key: string): Promise<void>;
  
  // Bucket operations
  createBucket(bucket: string): Promise<void>;
  deleteBucket(bucket: string): Promise<void>;
  
  // URL operations
  getSignedUrl(key: string, expiresIn: number): Promise<string>;
  getPublicUrl(key: string): string;
}

// Implementations
class MinIOAdapter implements StorageAdapter { ... }
class CloudinaryAdapter implements StorageAdapter { ... }
class TelegramAdapter implements StorageAdapter { ... }
```

### 9.2 Email Providers

```typescript
interface EmailAdapter {
  name: string;
  
  send(email: EmailMessage): Promise<SendResult>;
  sendTemplate(template: string, data: any): Promise<SendResult>;
  
  // Domain management
  verifyDKIM(domain: string): Promise<boolean>;
  verifySPF(domain: string): Promise<boolean>;
}

// Implementations
class StalwartAdapter implements EmailAdapter { ... }
class ResendAdapter implements EmailAdapter { ... }
class SMTPAdapter implements EmailAdapter { ... }
```

### 9.3 Git Providers

```typescript
interface GitAdapter {
  name: string;
  
  listRepos(): Promise<Repo[]>;
  getRepo(owner: string, repo: string): Promise<Repo>;
  getBranches(owner: string, repo: string): Promise<Branch[]>;
  getCommits(owner: string, repo: string, branch: string): Promise<Commit[]>;
  downloadArchive(owner: string, repo: string, ref: string): Promise<Buffer>;
  setupWebhook(owner: string, repo: string, webhook: Webhook): Promise<void>;
}

// Implementations
class GitHubAdapter implements GitAdapter { ... }
class GitLabAdapter implements GitAdapter { ... }
class BitbucketAdapter implements GitAdapter { ... }
```

---

## 10. Security Architecture

### 10.1 Authentication Flow

```
1. User submits credentials
2. Auth Service validates against identity.users
3. Session created in identity.sessions
4. JWT issued with user claims
5. Refresh token stored in httpOnly cookie
6. Subsequent requests validated via JWT + session
```

### 10.2 Authorization Model

```typescript
// Role-Based Access Control (RBAC)
const roles = {
  admin: ['*'],                    // All permissions
  owner: ['projects:*', 'domains:*', ...],
  developer: ['projects:read', 'projects:write', 'deployments:*', ...],
  viewer: ['projects:read', 'logs:read']
};

// Permission check middleware
can(user, action, resource) => {
  const userRole = getRole(user);
  const permissions = roles[userRole];
  return permissions.includes(action) || permissions.includes('*');
}
```

### 10.3 Encryption Standards

| Data | At Rest | In Transit |
|------|---------|------------|
| User passwords | bcrypt (cost 12) | TLS 1.3 |
| Database credentials | AES-256-GCM | TLS 1.3 |
| API keys | Argon2 | TLS 1.3 |
| File storage | AES-256-GCM | TLS 1.3 |
| Session tokens | None (random) | httpOnly + secure |

### 10.4 Audit Logging

All sensitive operations logged to `identity.audit_logs`:
- Authentication events
- Resource creation/deletion
- Permission changes
- API key operations
- Billing changes

---

## 11. Scaling Strategy

### 11.1 Horizontal Scaling

- **Stateless services** — Deploy multiple replicas
- **Database pooling** — PgBouncer for PostgreSQL
- **Redis clustering** — For session/cache scaling
- **NATS streaming** — JetStream for queue/event scaling

### 11.2 Vertical Scaling

- **Database** — PostgreSQL with table partitioning
- **Storage** — MinIO distributed mode
- **Container runtime** — Docker Swarm or Kubernetes

### 11.3 Multi-Region

```
┌─────────────────────────────────────────────────┐
│                 Global Load Balancer            │
│                    (Traefik Global)               │
└─────────────────────────────────────────────────┘
          │                │                │
          ▼                ▼                ▼
   ┌────────────┐   ┌────────────┐   ┌────────────┐
   │   Region   │   │   Region   │   │   Region   │
   │     1      │   │     2      │   │     3      │
   │ (Primary)  │   │ (Replica)  │   │ (Replica)  │
   └────────────┘   └────────────┘   └────────────┘
```

---

## 12. Technology Stack

### 12.1 Core Technologies

| Layer | Technology | Version |
|-------|------------|---------|
| **Frontend** | Next.js | 15.x |
| **Backend** | NestJS | 10.x |
| **Database** | PostgreSQL | 16.x |
| **Cache** | Redis | 7.x |
| **Queue/Events** | NATS | 2.10.x |
| **Object Storage** | MinIO | 2024.x |
| **Proxy/Router** | Traefik | 3.x |
| **Container Runtime** | Docker | 25.x |
| **Mail Server** | Stalwart | 3.x |
| **CLI** | Commander.js | 12.x |
| **SDK** | TypeScript | 5.x |
| **Package Manager** | pnpm | 9.x |

### 12.2 Monitoring Stack

| Component | Technology |
|-----------|------------|
| Metrics | Prometheus |
| Dashboards | Grafana |
| Log Aggregation | Loki |
| Log Shipping | Vector |
| Alerting | Alertmanager |

### 12.3 AI Integration

| Component | Technology |
|-----------|------------|
| AI Backend | Google Gemini |
| MCP Server | @modelcontextprotocol/sdk |
| Vector Storage | pgvector |

---

## 13. Monorepo Structure

```
fidscript-deploy/
├── apps/
│   ├── dashboard/              # Next.js frontend
│   │   ├── app/
│   │   │   ├── (auth)/
│   │   │   │   ├── login/
│   │   │   │   └── register/
│   │   │   ├── (dashboard)/
│   │   │   │   ├── projects/
│   │   │   │   ├── deployments/
│   │   │   │   ├── domains/
│   │   │   │   ├── databases/
│   │   │   │   ├── storage/
│   │   │   │   ├── email/
│   │   │   │   ├── functions/
│   │   │   │   ├── queues/
│   │   │   │   ├── cron/
│   │   │   │   ├── skills/
│   │   │   │   ├── templates/
│   │   │   │   └── settings/
│   │   │   ├── installer/
│   │   │   ├── layout.tsx
│   │   │   └── page.tsx
│   │   ├── components/
│   │   ├── lib/
│   │   ├── package.json
│   │   └── tsconfig.json
│   │
│   └── api/                   # NestJS backend
│       ├── src/
│       │   ├── main.ts
│       │   ├── app.module.ts
│       │   ├── common/
│       │   │   ├── guards/
│       │   │   ├── interceptors/
│       │   │   ├── filters/
│       │   │   └── decorators/
│       │   ├── modules/
│       │   │   ├── auth/
│       │   │   ├── users/
│       │   │   ├── projects/
│       │   │   ├── deployments/
│       │   │   ├── domains/
│       │   │   ├── databases/
│       │   │   ├── storage/
│       │   │   ├── email/
│       │   │   ├── functions/
│       │   │   ├── queues/
│       │   │   ├── cron/
│       │   │   ├── realtime/
│       │   │   ├── skills/
│       │   │   ├── templates/
│       │   │   ├── events/
│       │   │   └── health/
│       │   ├── services/
│       │   ├── repositories/
│       │   └── dto/
│       ├── test/
│       ├── package.json
│       └── tsconfig.json
│
├── packages/
│   ├── sdk/                   # JavaScript/TypeScript SDK
│   ├── shared/                # Shared utilities
│   ├── types/                # TypeScript types
│   ├── events/               # Event definitions
│   └── config/               # Shared configuration
│
├── installer/                # VPS installer scripts
│   ├── scripts/
│   ├── docker/
│   └── docker-compose.yml
│
├── scripts/                  # Dev/CI scripts
│   ├── generate-types.ts
│   └── migrate.ts
│
├── docs/                     # Documentation
│   ├── api/
│   ├── sdk/
│   └── mcp/
│
├── .env.example
├── .gitignore
├── package.json
├── pnpm-workspace.yaml
├── turbo.json
├── tsconfig.base.json
└── README.md
```

---

## 14. Phase Dependencies

### 14.1 Phase Dependency Graph

```
Phase 0: Architecture ──────────────────────────────────────────────────────
    │                        (This Document)
    ▼
Phase 1: Repository ◄───────────────────────────────────────────────────────
    │                        (Monorepo Setup)
    ▼
Phase 2: Installer ◄────────────────────────────────────────────────────────
    │                        (Docker + Traefik)
    ▼
Phase 3: Identity ◄─────────────────────────────────────────────────────────
    │                        (Auth + Users + Roles)
    ▼
Phase 4: Projects ─────────────────────────────────────────────────────────
    │                        (Project CRUD)
    │
    ├──────────────────────────────────────────────────────────────────────
    │                        (Shared Infrastructure)
    ▼
Phase 5: Infrastructure ◄───────────────────────────────────────────────────
    │                        (Postgres + Redis + NATS + MinIO)
    ▼
Phase 6: Deployment ◄──────────────────────────────────────────────────────
    │                        (Build + Release)
    │
    ├──────────────────────────────────────────────────────────────────────
    │                        (Projects Engine)
    ▼
Phase 7: Domain ◄──────────────────────────────────────────────────────────
    │                        (DNS + SSL)
    │
    ├──────────────────────────┬───────────────────────────────────────────
    │                          │
    ▼                          ▼
Phase 8: Storage ◄─────────── Phase 9: Auth Platform
    │                          │
    │                          ▼
    │                    Phase 10: Email
    │                          │
    └──────────┬───────────────┘
               │
               ▼
         Phase 11: Realtime ◄─────────┐
               │                      │
               ▼                      ▼
         Phase 12: Database      Phase 13: Functions
               │                      │
               └──────────┬───────────┘
                          │
                          ▼
                    Phase 14: Queues
                          │
                          ▼
                    Phase 15: Scheduler
                          │
                          ▼
                    Phase 16: Monitoring
                          │
                          ▼
                    Phase 17: Logging
                          │
                          ▼
                    Phase 18: SDK
                          │
                          ▼
                    Phase 19: MCP
                          │
                          ▼
                    Phase 20: Skills
                          │
                          ▼
                    Phase 21: Templates
                          │
                          ▼
                    Phase 22: AI Layer
                          │
                          ▼
                    Phase 23: Marketplace
```

### 14.2 Critical Path

```
Phase 0 → Phase 1 → Phase 2 → Phase 3 → Phase 4 → Phase 5 → Phase 6 → Phase 7
```

---

## 15. Implementation Priorities

### 15.1 Immediate (Phase 0-2)

- [ ] Finalize this architecture document
- [ ] Set up monorepo with pnpm workspaces
- [ ] Configure NestJS API with modular structure
- [ ] Configure Next.js dashboard
- [ ] Set up Docker-based installer

### 15.2 Short-term (Phase 3-6)

- [ ] Implement authentication system
- [ ] Build project management CRUD
- [ ] Deploy infrastructure (Postgres, Redis, NATS, MinIO)
- [ ] Build deployment engine with buildpacks

### 15.3 Medium-term (Phase 7-12)

- [ ] Domain management with SSL
- [ ] Storage abstraction layer
- [ ] Application auth platform
- [ ] Email infrastructure
- [ ] Realtime platform
- [ ] Database platform

### 15.4 Long-term (Phase 13+)

- [ ] Functions runtime
- [ ] Queue system
- [ ] Cron scheduler
- [ ] Monitoring & logging
- [ ] SDK packages
- [ ] MCP server
- [ ] Skills marketplace
- [ ] Template system
- [ ] AI layer
- [ ] Marketplace

---

## Appendix A: Glossary

| Term | Definition |
|------|------------|
| **Control Plane** | Services that manage platform operations |
| **Runtime Plane** | Infrastructure services that run workloads |
| **Provider Adapter** | Abstraction layer for external services |
| **Buildpack** | Auto-detection of runtime and build process |
| **Project Slug** | URL-safe identifier for a project |
| **Deployment Version** | Immutable snapshot of deployed code |
| **Channel** | Realtime messaging topic |

## Appendix B: Reference Documents

- [FIDScript Master Development Guide](./MASTER_DEVELOPMENT_GUIDE.md)
- [API Documentation](./docs/api/README.md)
- [SDK Documentation](./docs/sdk/README.md)
- [MCP Documentation](./docs/mcp/README.md)
- [Installer Guide](./installer/README.md)

---

*This document is the authoritative source for FIDScript Deploy architecture. All implementation must conform to these specifications. Update this document before implementing any architectural changes.*
