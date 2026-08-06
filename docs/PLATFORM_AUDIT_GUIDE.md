# FIDScript Deploy — Platform Architecture Audit Guide

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
