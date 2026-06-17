# Platform Boundaries

> **⚠ Aspirational target spec — not current reality.** Written before the hardening reset; describes the *intended* design. For what actually builds/runs today read [`START_HERE`](./START_HERE.md), [`AUDIT`](./AUDIT.md), and [`AGENT_STATUS`](../AGENT_STATUS.md). Phase docs (`docs/phases/`) are the source of truth for current state and next work.

Defines what belongs inside FIDScript Deploy and what does not.

---

## Purpose

As FIDScript Deploy grows, it risks absorbing application-specific logic that should remain outside the platform. This document establishes clear boundaries to prevent scope creep and maintain focus.

---

## What FIDScript Deploy Provides

### Core Platform Services

These are platform-level concerns that apply to ALL projects:

| Service | Description |
|---------|-------------|
| **Projects** | Project lifecycle, isolation, settings |
| **Deployments** | Build, release, container management |
| **Domains** | DNS, SSL, routing |
| **Storage** | File upload, buckets, object storage |
| **Database** | Managed PostgreSQL instances |
| **Auth** | Platform user authentication |
| **Auth Platform** | Application-level auth for projects |
| **Email** | Transactional email sending |
| **Realtime** | WebSocket channels, pub/sub |
| **Functions** | Serverless function execution |
| **Queues** | Background job processing |
| **Cron** | Scheduled job management |
| **Monitoring** | Metrics, health, alerts |
| **Logging** | Centralized log aggregation |
| **Skills** | Installable extensions |
| **Templates** | Project scaffolding |
| **AI** | Platform intelligence |
| **MCP** | AI agent tool access |
| **Integration Hub** | External provider management |

### Shared Infrastructure

These are shared resources managed by the platform:

- **PostgreSQL** - All project databases share the same cluster
- **Redis** - Caching and session storage shared
- **NATS** - Event bus, queues, realtime all share NATS
- **MinIO** - Object storage shared across projects
- **Traefik** - Reverse proxy and SSL termination shared
- **Docker** - Container runtime shared

### Multi-Tenant Isolation

The platform handles:

- Project-level data isolation
- User access control per project
- Resource quotas per project
- Billing aggregation (future)

---

## What Does NOT Belong

### Application Business Logic

Things applications do that are NOT platform responsibilities:

```
[x] Custom database schemas beyond platform tables
[x] Application-specific API endpoints
[x] Business logic implementation
[x] Application-specific background jobs
[x] Custom authentication logic (use platform auth)
[x] Application workflows
[x] Customer-specific configurations
```

### Project-Provided Resources

Applications MUST NOT provision:

```
[x] Their own PostgreSQL instances
[x] Their own Redis instances
[x] Their own NATS clusters
[x] Their own MinIO buckets (they USE platform buckets)
[x] Their own email infrastructure
[x] Their own container registries
```

### What Projects Can Do

Projects CAN use platform services:

```
[+] Connect to platform PostgreSQL databases
[+] Use platform storage buckets
[+] Publish to platform queues
[+] Subscribe to platform realtime channels
[+] Send emails through platform email service
[+] Deploy functions to platform functions runtime
[+] Schedule jobs through platform cron service
[+] Use platform auth for their users
```

---

## Boundary Enforcement Rules

### Rule 1: No Application Schemas

The platform database contains ONLY platform tables:

```sql
-- Platform tables (allowed)
identity.users
identity.sessions
projects.projects
projects.deployments
storage.buckets
storage.files
-- etc.

-- NOT allowed (application tables)
-- projects.my_app_users
-- projects.my_app_orders
-- projects.my_app_products
```

Applications needing databases use their own schema within the shared PostgreSQL, managed by the Database Service.

### Rule 2: No Application Containers

Applications deploy code, NOT infrastructure:

```dockerfile
# Allowed: Application code
FROM node:18-alpine
COPY . .
RUN npm install
CMD ["npm", "start"]

# NOT allowed: Infrastructure provisioning
FROM postgres:15
RUN initdb...
# Should use platform Database Service instead
```

### Rule 3: No Shared State

Applications MUST NOT:

```
[x] Write to shared filesystem
[x] Use local storage for persistence
[x] Maintain in-memory state across requests
[x] Create network connections to backend services directly
```

Applications SHOULD:

```
[+] Use platform storage for files
[+] Use platform databases for data
[+] Use platform queues for async processing
[+] Use platform realtime for live updates
```

---

## Extension Points

### Skills System

Applications can extend functionality through Skills, which are:

```
[+] Pre-built business modules (CRM, ERP, etc.)
[+] Packaged as Docker images
[+] Installed per-project
[+] Can access platform services
[+] Run in isolated containers
```

Skills are NOT platform core but are supported extensions.

### Custom Templates

Organizations can create custom templates for:

```
[+] Project scaffolding
[+] Stack-specific configurations
[+] Industry-specific starting points
```

Templates are configuration, not platform code.

---

## Version Boundaries

### v1.0 Scope

The initial release includes:

```
[+] Projects & Deployments
[+] Domains & SSL
[+] Platform Auth
[+] Application Auth
[+] Storage
[+] PostgreSQL Databases
[+] Email (Stalwart)
[+] Realtime (NATS)
[+] Functions
[+] Queues
[+] Cron
[+] Basic Monitoring
[+] Basic Logging
[+] SDK (JavaScript/TypeScript)
[+] MCP Tools
```

### v1.5 Scope

```
[+] CLI
[+] Template System
[+] Advanced Monitoring
```

### v2.0 Scope

```
[+] AI Copilot
[+] Agent Actions
```

### v3.0 Scope

```
[+] Skills Marketplace
[+] Community Extensions
```

### Out of Scope (Forever)

```
[x] Kubernetes orchestration (Docker only)
[x] Multi-VPS clustering (single VPS)
[x] GraphQL API (REST only in v1.0)
[x] Mobile SDKs
[x] DNS management
[x] CDN
[x] Custom container orchestration
```

---

## Decision Framework

When deciding if something belongs in the platform:

### Questions to Ask

1. **Does this apply to ALL projects?**
   - Yes → Platform service
   - No → Consider Skills or out of scope

2. **Does this require shared infrastructure?**
   - Yes → Platform service
   - No → Could be application logic

3. **Would multiple projects need this?**
   - Yes → Platform service
   - No → Application-specific

4. **Does this span across projects?**
   - Yes → Platform service
   - No → Consider isolation

### Example Decisions

| Feature | Decision | Reason |
|---------|-----------|--------|
| Email sending | Platform | All projects need it |
| Custom email templates | Application | Per-project customization |
| Database backups | Platform | Shared infrastructure |
| Database migrations | Application | Project-specific |
| SSL certificates | Platform | Shared Traefik |
| Custom domains | Platform | Project-specific but shared infrastructure |
| User authentication | Platform | All projects need it |
| Application users | Application | Per-project users |
| File uploads | Platform | Shared storage |
| File processing | Application | Project-specific logic |

---

## Enforcement

### Code Review

Contributors must justify:

- New platform tables
- New shared services
- Changes to shared infrastructure

### Architecture Review

Changes to boundaries require:

1. ADR creation
2. Impact assessment
3. Team review
4. Documentation update

### Testing Requirements

Platform changes require:

- Integration tests
- Multi-tenant isolation tests
- Backward compatibility tests

---

## Summary

FIDScript Deploy owns:

- **Infrastructure** (Postgres, Redis, NATS, MinIO, Traefik)
- **Cross-cutting services** (Auth, Email, Storage, Monitoring)
- **Multi-tenant isolation**
- **Deployment pipeline**
- **Platform API/SDK/MCP**

FIDScript Deploy does NOT own:

- **Application business logic**
- **Project-specific schemas**
- **Custom workflows**
- **Customer data**

The platform provides the operating system. Applications provide the business logic.
