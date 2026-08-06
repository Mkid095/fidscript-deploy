# FIDScript Deploy — Complete Platform Architecture Audit & Production Readiness Guide

> **Mission:** FIDScript is a true Backend-as-a-Service (BaaS) and Deployment Platform. Every service must be project-scoped, fully wired, and behave like Supabase/Vercel/Convex.

## Global Architecture

```
Installation
  └── Organizations
    └── Projects
      ├── Database (PostgreSQL, per-project schema)
      ├── Storage (MinIO/S3/Cloudinary/Telegram)
      ├── Authentication (JWT, per-project)
      ├── Realtime (WebSocket, per-project namespace)
      ├── Functions (Edge serverless)
      ├── Queues (BullMQ-style, per-project)
      ├── Email (Stalwart SMTP)
      ├── Domains (Cloudflare SaaS)
      ├── Deployments (CI/CD, per-project)
      ├── Scheduler (Cron, per-project)
      ├── Logs (per-project)
      └── Monitoring (per-project)
```

## Core Principles

1. **Every resource is project-scoped** — never global
2. **Realtime runs in the background** — not per-page connect/disconnect
3. **Services are wired together** — Database → Events → Queues → Email
4. **CLI = UI** — every action possible in UI is possible via CLI
5. **MCP = CLI** — AI agents get full access via MCP tools

## Service Standards

### Database (like Supabase)
- Per-project PostgreSQL schema
- REST endpoints: `GET /projects/:id/tables`, `POST /projects/:id/sql`
- SQL Editor with Monaco
- Migration history
- Cell editing with optimistic UI

### Realtime (like Supabase Realtime)
- PostgreSQL WAL → Event Bus → WebSocket → Project Channels
- Global connection established on login (not per-page)
- Database change events pushed to connected clients
- Fallback to polling when disconnected

### Storage
- Multiple providers: Internal (MinIO), AWS S3, Cloudinary, Telegram
- Pre-signed URL pattern for uploads
- Provider credentials configurable in settings
- S3 must be fully configurable before being selectable in UI

### Queues
- Per-project isolation
- Create queue: name, type, retries, timeout
- Dashboard: waiting/processing/completed/failed counts
- Realtime depth updates

### Scheduler
- Per-project cron jobs
- Actions: HTTP Request, Function, Email, Queue Job
- Custom code editor (sandboxed)
- Execution history

### Email
- Per-domain mailbox/alias/identity management
- IMAP/SMTP credentials displayed
- Integration: Scheduler can trigger emails, Functions can send emails
- Template editor with variable substitution
- Delivery analytics

### Domains
- One project = one main domain
- Cloudflare SaaS integration for subdomains
- SSL auto-provisioning
- DNS verification flow
- Wizard: Records → Verify → Active

### Deployments
- GitHub → Webhook → Build → Deploy
- Environment variables: encrypted at rest, decrypted via SDK/CLI
- Instant rollback (no rebuild)
- Per-deployment env var management

### Monitoring & Logs
- **Logs page must be project-scoped** — never "create project first" when inside a project
- Log sources: Deployment, API, Database, Auth
- Monitoring: Alert rules, notification channels, active alerts

## Wiring Diagram

```
User Signup → Auth Service → user.created event
                                    ↓
                              Email Service → Welcome email queued
                                              ↓
                                      Queue Service → Email Worker

Database Row Update → WAL → Event Bus → Realtime → WebSocket → Dashboard

Scheduler Cron → HTTP Request / Function / Queue Job / Email

Deployment → Environment Variables (encrypted) → Runtime
```

## Onboarding — Automatic Provisioning

When a user creates a project, the platform must automatically provision:

1. **Database:** Default PostgreSQL schema with connection credentials
2. **Storage:** Default `project-assets` bucket
3. **Realtime:** Initialize `project:{projectId}` namespace
4. **Auth:** Generate JWT configuration and session settings
5. **API Keys:** Public and server API keys

```
User clicks "Create Project"
    → POST /api/projects
    → Project record created
    → Database schema created
    → Storage bucket created
    → Realtime namespace initialized
    → API keys generated
    → "provisioning_complete" event emitted
    → Frontend redirects to project dashboard
```

## CLI and MCP Integration

- **CLI:** Every UI action available via CLI (`fid project create`, `fid deploy`, `fid logs`, `fid env pull/push`)
- **MCP:** Full service access for AI agents — every tool mirrored from CLI

## Audit Deliverables

1. **Service Status Report** — Complete / Partial / Broken per service
2. **Wiring Diagram** — how services interact
3. **Missing Implementation List** — P0 (Critical), P1 (Blockers), P2 (Improvements)
4. **UI Audit** — data source, API calls, loading/empty states, permissions, project context
5. **Production Readiness Score** — Backend, Frontend, Infrastructure, DX, Security

## References

- Supabase Architecture: https://supabase.com/docs/guides/getting-started/architecture
- Supabase Realtime: https://supabase.com/docs/guides/realtime
- BullMQ: https://docs.bullmq.io/
- Vercel Custom Domains: https://vercel.com/docs/domains/working-with-domains
- Cloudflare for SaaS: https://developers.cloudflare.com/cloudflare-for-platforms/cloudflare-for-saas/
- Supabase Auth: https://supabase.com/docs/guides/auth
- Vercel Builds: https://vercel.com/docs/fundamentals/builds
- Vercel Instant Rollback: https://vercel.com/docs/instant-rollback
- Convex Functions: https://docs.convex.dev/functions/overview
