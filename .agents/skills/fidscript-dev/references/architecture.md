# FIDScript Deploy — Platform Architecture

## Overview
FIDScript Deploy is a full-stack deployment platform with:
- **apps/api** — NestJS backend (REST + WebSocket)
- **apps/dashboard** — Next.js 15 frontend
- **apps/cli** — Commander.js terminal client
- **apps/mcp-server** — Model Context Protocol server for AI tool use
- **packages/sdk** — Canonical TypeScript SDK
- **packages/events** — Typed event emitter
- **packages/types** — Shared TypeScript types

## apps/api

### Stack
- **Runtime**: Node.js ≥20, pnpm ≥9
- **Framework**: NestJS 10, TypeScript 5.4
- **ORM**: Prisma 5 with multi-schema PostgreSQL (16 schemas)
- **Real-time**: Socket.IO + Redis adapter (multi-instance broadcasts + restart-safe presence)
- **Event bus**: NATS (inter-service events)
- **Email**: Stalwart (JMAP for reading, SMTP for sending), body NOT stored in DB
- **Cache/Queue**: Redis, NATS JetStream (queues)
- **Auth**: JWT (access 15min) + refresh tokens

### Prisma Schemas (16)
```
public          — enums only
platform        — PlatformEvent, InstallationStatus, InstallationSettings, IntegrationProvider
identity        — User, Session, ApiKey, AuditLog, MagicCode, GithubConnection,
                   Organization, OrgRole, OrganizationMember, Team, TeamMember,
                   Invitation, Permission, VerificationToken, UserCredential
projects        — Project, ProjectMember, ProjectSettings, ProjectEnv, ProjectInvitation,
                   ProjectApiKey, Deployment, Release, BuildConfig, Domain,
                   DomainWebhook, DomainConnection, DomainEmailKey, ManagedDnsRecord,
                   DomainChangeSet, DomainHealthCheck, DomainVerificationRun,
                   DomainIncident, DomainRepairPolicy, DomainRepairRun
email           — EmailDomain, EmailMailbox, EmailAlias, SenderIdentity, EmailApiKey,
                   EmailRateLimitPlan, EmailMessage, EmailSyncCursor, EmailTrackingEvent,
                   EmailWebhookSubscription, EmailDeliveryAttempt, CatchAllRule,
                   EmailTemplate, EmailMessageTemplate, EmailSuppression, EmailApiUsage,
                   EmailDomainReputation, EmailWarmup, EmailAbuseEvent, EmailIpPool,
                   EmailMailboxMember, EmailConversation, EmailConversationAssignment,
                   EmailRetentionPolicy, EmailLegalHold, EmailIdempotencyRecord,
                   EmailAttachmentConfig, EmailAttachment
storage         — Bucket, File, ProjectStorageConfig
functions       — Function, FunctionLog
queues          — Queue, QueueMessage
scheduler       — CronJob, CronJobRun
realtime        — RealtimeChannel, RealtimeMessage, RealtimePresence
monitoring      — Metric, AlertRule, Alert, Notification, NotificationChannel
logging         — LogStream, LogEntry
marketplace     — MarketplaceItem, MarketplaceReview
ai              — AIConversation, AIMessage
databases       — ManagedDatabase, DatabaseBackup
templates       — Template
infrastructure  — DatabaseMetric
```

### API Prefix
All routes: `api/v1/*`
Swagger docs: `/docs`
Metrics: `/metrics` (no prefix)

### Global Pipes
ValidationPipe: `whitelist: true, forbidNonWhitelisted: true, transform: true`

### Event Emission
API emits via `@fidscript-deploy/events` → NATS → consumed by workers.

---

## apps/dashboard

### Stack
- Next.js 15 (App Router), React 19, TypeScript 5.4
- Tailwind CSS v4
- hugeicons + @hugeicons/react
- Monaco Editor (@monaco-editor/react)
- SDK from `@fidscript-deploy/sdk`

### SDK Initialization (`src/lib/sdk.ts`)
```typescript
// Real API mode
NEXT_PUBLIC_API_URL=https://deploy.fidscript.com/api
NEXT_PUBLIC_USE_MOCK_API=false

// Mock mode (dev without backend)
NEXT_PUBLIC_USE_MOCK_API=true
```
Token storage: localStorage (`fidscript_access_token`, `fidscript_refresh_token`, `fidscript_token` legacy)

### Build
- `output: 'standalone'` — creates Docker-friendly build
- `next build` symlinks fail on Windows (EPERM) — works in Docker/Linux CI
- Dashboard build args: `--build-arg NEXT_PUBLIC_API_URL=...`

---

## packages/sdk

### Structure
```
packages/sdk/
├── src/
│   ├── index.ts              — createFidscript() entry
│   ├── client.ts             — FidscriptClient (axios-based)
│   ├── modules/
│   │   ├── auth.ts
│   │   ├── projects.ts
│   │   ├── deployments.ts
│   │   ├── storage.ts
│   │   ├── databases.ts       — DatabaseProvider (per-db connection factory)
│   │   ├── domains.ts
│   │   ├── email.ts           — AdminMailboxModule, AdminAttachmentConfigModule
│   │   ├── functions.ts
│   │   ├── queues.ts
│   │   ├── cron.ts
│   │   ├── realtime.ts
│   │   ├── monitoring.ts
│   │   ├── logging.ts
│   │   ├── templates.ts
│   │   ├── github.ts
│   │   ├── installation.ts
│   │   ├── notifications.ts
│   │   └── errors.ts         — FidscriptError, AuthError, NotFoundError, etc.
```

### FidscriptClient
- Base URL: user-provided (no default, open-source must specify)
- Auto-prefixes all routes with `/api/v1`
- 401 interceptor: transparent token refresh via `onUnauthorized` callback
- Error normalization: axios errors → typed platform errors

---

## packages/events

`@fidscript-deploy/events` — Typed event emitter with schema validation.

### Key APIs
- `validatePayload(type, payload, version?)` — validates against registry, migrates if needed
- `resolveEventType(type)` — resolves legacy aliases to canonical names
- `isKnownEventType(type)` — checks if schema exists
- `buildPlatformEvent(type, projectId, payload, context?)` — builds with trace context

### Event Schema Registry
Lives in `@fidscript-deploy/types/src/events/event-registry.ts`.
New event types must be registered before emission.

---

## packages/types

`@fidscript-deploy/types` — Single source of truth for all SDK/API contracts.

Exports:
- Email types: `src/email/index.ts`
- Event types: `src/events/index.ts`

---

## apps/cli

Commander.js-based CLI. SDK imported dynamically (`await import(...)`) to avoid bundling issues.

Key commands:
- `fidscript login <key>` — store credentials in `~/.fidscript/credentials.json` (mode 0o600)
- `fidscript whoami` — show current user
- `fidscript projects create/list`
- `fidscript deployments list`
- `fidscript logs tail`
- `fidscript email send/inbox/status/domains/analytics/templates`
- `fidscript init <template> <name>`

Config: `~/.fidscript/config.json` or `FIDScript_API_URL` env var. No hardcoded API URL.

---

## apps/mcp-server

MCP server using `@modelcontextprotocol/sdk`. Exposes FIDScript platform tools to AI agents.

---

## turbo.json

```json
{
  "tasks": {
    "build": { "dependsOn": ["^build"], "outputs": ["dist/**", ".next/**"] },
    "dev": { "cache": false, "persistent": true },
    "lint": { "dependsOn": ["^build"] },
    "test": { "dependsOn": ["build"], "outputs": ["coverage/**"] },
    "typecheck": { "dependsOn": ["^build"] },
    "clean": { "cache": false }
  }
}
```

`"dependsOn": ["^build"]` means a task waits for all upstream dependencies to build first.
