# System Overview

**Purpose:** Deployment platform for Fidscript — one-command VPS deployments, serverless functions, managed databases, email, and storage for Kenyan businesses.

**Version:** Phases 00–23 backend verified; Frontend in Phase D0 (documentation blueprint)

**Last Updated:** 2026-07-30

---

## Core Domains

- **Deployments:** Project lifecycle — create, build, start, stop, restart, delete
- **Functions:** Serverless functions — create, deploy, invoke, logs, environment variables
- **Databases:** Managed PostgreSQL — create, connect, backup, restore
- **Email:** Stalwart email server — domains, mailboxes, aliases, DKIM/SPF/DMARC
- **Storage:** S3-compatible object storage — buckets, uploads, signed URLs
- **Queue:** Managed message queues — NATS JetStream
- **Monitoring:** Health checks, metrics, alerting, log aggregation
- **Auth:** Multi-user auth — magic code, password, OAuth (GitHub/Google)

---

## Critical Flows

### Deployment Flow
```
Client → POST /deployments → Prisma → Docker build on VPS
    → nginx routing → domain bound → HTTPS provisioned
    → Release created → success/failure logged
```

### Function Execution
```
Invoke → NATS queue → Worker picks up
    → Docker run function image → stdout/stderr captured
    → Result returned → metrics recorded
```

### Email Reception
```
MX → Stalwart → LMTP → apps/api email webhook
    → Contact matched → conversation updated
    → Notification sent
```

---

## Technology Stack

| Layer | Technology | Version |
|-------|-----------|---------|
| Backend | Node.js + Fastify + Prisma | 22.x / 4.x / 6.x |
| Frontend | Next.js 15 + TypeScript | 15.x |
| Database | PostgreSQL + Redis | 16.x / 7.x |
| Email | Stalwart | latest |
| Queue | NATS JetStream | 2.x |
| Container | Docker | 27.x |
| Reverse Proxy | Traefik | 3.x |
| Auth | Fastify auth plugins + Prisma | — |

---

## Project Structure

```
fidscript-deploy/
├── apps/
│   ├── api/           # Fastify API server + Prisma
│   └── frontend/      # Next.js 15 dashboard + public site
├── packages/          # Shared TypeScript types
├── installer/         # Server setup script
├── setup-wizard.sh    # Interactive VPS setup
├── install.sh         # One-line install
├── docs/              # Full project documentation
│   ├── phases/         # Backend phase docs (00–23)
│   │   └── frontend/   # Frontend phase docs (F00–F11)
│   ├── product/        # Product specs (philosophy, journeys, UX)
│   └── services/        # Service specs (authoritative)
├── .ai/              # AI operating layer (ANPAS)
├── CLAUDE.md          # Root project identity
├── AGENTS.md          # AI agent rules
├── CHANGELOG.md       # Change log
└── docs/decisions/     # Architecture decision records
```

---

## Existing Documentation (preserved — do not duplicate)

| Doc | Purpose |
|-----|---------|
| `CLAUDE.md` | Root project identity + navigation (30K, detailed) |
| `ARCHITECTURE.md` | System architecture (72K) |
| `DECISIONS.md` | Architecture decision records (69K) |
| `AGENT_STATUS.md` | Current phase and status |
| `docs/phases/phase-*.md` | Backend phase docs (00–23) |
| `docs/product/` | Product specs |
| `docs/phases/frontend/` | Frontend phase docs |
| `docs/DEFINITION_OF_DONE.md` | Merge gate |
| `docs/EXECUTION_PROTOCOL.md` | Execution flow |
| `docs/AUDIT.md` | Why reset + honest state |

---

## Entry Points

### For Humans
- Start here: `README.md`
- Architecture: `ARCHITECTURE.md`
- Phase docs: `docs/phases/phase-*.md`
- Decisions: `DECISIONS.md`

### For AI Agents
- First read: `CLAUDE.md` (root)
- Coding rules: `.ai/coding-rules.md`
- Review checklist: `.ai/review-checklist.md`
- Feature details: `docs/phases/phase-*.md`
