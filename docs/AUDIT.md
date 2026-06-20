# Architecture Audit — Current State of FIDScript Deploy

> **Date:** 2026-06-16
> **Status:** Pre-hardening snapshot. This document is the honest record of what the Phase 00–23 scaffold actually does (and does not do) today.
> **Purpose:** Source of truth for "where are we." The rewritten phase documents (`docs/phases/phase-XX.md`) are the forward-looking specs for "what each phase must deliver to be production-grade."

---

## Headline

**As written, FIDScript Deploy does not compile, cannot be installed on a VPS, and roughly three-quarters of what is marked "COMPLETE" is scaffolding** — controllers and services that read and write Prisma rows while doing little or none of the real infrastructure work each feature promises. The defect was never caught because **nothing was ever compiled or run.** The "23 phases complete" status was an illusion created by the absence of verification.

The one genuinely substantial, real piece is `apps/api` — a NestJS application with 23 modules and real Prisma data access. It is simply **undelivered**: it does not build, its schema is not migrated, and it is not containerized. Everything else (Dashboard, CLI, MCP, Skills, SDK, Installer) is placeholder, partial, duplicate, or missing.

---

## A. Build / Run Blockers (why nothing works end-to-end)

These are the highest-severity findings. Until they are resolved, **no feature can be demonstrated**.

| # | Defect | Evidence | Effect |
|---|--------|----------|--------|
| 1 | AI + Marketplace modules import a file that does not exist | `ai.service.ts`, `marketplace.service.ts` import `EventsService` from `../events/events.service.js`; the real file is `event.service.ts` (singular), class `EventService` | Compile failure |
| 2 | AI dependency-injection token mismatch | `ai.service.ts` injects `@Inject('AI_PROVIDER')` (string); `ai.module.ts` provides `AIProvider` (symbol) | Boot failure even after compile |
| 3 | ESM/CommonJS landmine | `apps/api` is `module: commonjs` + `"type":"module"` + every import uses `.js` extensions | Emitted `require('./x.js')` resolves to files that do not exist |
| 4 | Workspace packages point at unbuilt `dist/` | `@fidscript/types`, `@fidscript/shared`, `@fidscript/events` declare `main: ./dist/index.js`, never built | Imports resolve to nothing |
| 5 | No Dockerfiles for the app itself | `find apps -iname Dockerfile*` is empty | `docker compose up` fails on `api`/`dashboard` build |
| 6 | Compose cannot connect to Postgres | `$(cat /run/secrets/...)` in `environment:` is not substituted by Compose | `DATABASE_URL` is a literal broken string |
| 7 | No Prisma migrations, no seed file | No `migrations/` dir; `db:seed` points at a non-existent `prisma/seed.ts` | Database never receives a schema or an admin user |
| 8 | Installer does not deploy the app | `install.sh` copies only `installer/`, never builds/starts app containers; `mkdir ".../{postgres,redis}"` brace-expansion bug | A fresh VPS yields a Traefik 404 |
| 9 | MCP server SDK missing from lockfile | `@modelcontextprotocol/sdk` is absent from `pnpm-lock.yaml` | MCP server cannot start |
| 10 | Nothing committed | Only 2 commits existed; all of `apps/`, `installer/`, `packages/`, `docs/` were untracked | All work existed only in the working tree |

### "If I run install.sh on a fresh VPS today, what works?"

- **Works:** the infrastructure stack comes up — Postgres, Redis, NATS, MinIO, Stalwart, Traefik start healthy (real images, real healthchecks).
- **Does not work:** the API and dashboard fail to build (no Dockerfiles, broken compose build contexts); the database has no schema (zero migrations) and no admin user (no seed file); the MCP server cannot start (SDK not installed); there is no CLI; the dashboard is a single title page; the "Claude skill" is plain markdown with no `SKILL.md` frontmatter. `deploy.fidscript.com` shows a Traefik 404.

---

## B. The Event Bus (the linchpin)

> **Updated verdict (2026-06-19): VERIFIED-in-practice.** Phase 02 fixed the original defects below (`nats.ws`→`nats`, JetStream `EVENTS` stream created on boot, `EventNatsConsumerService` durable consumer `audit-replay` re-emits onto the NestJS `EventEmitter2`, `AuditEventConsumer` records every event to `platform.events`). The bullets underneath are the **pre-hardening snapshot**. One latent bug survived until Phase 13 surfaced it: `EventEmitterModule.forRoot()` was created **without `{ wildcard: true }`**, so `@OnEvent('**')` matched nothing and **no wildcard consumer ever fired** (0 `platform.events` rows). Fixed 2026-06-19 — audit recording and the realtime fan-out bridge now work. Remaining design quirk (not a defect): local emits go to EventService's private emitter, so `@OnEvent` consumers see them only after the NATS round-trip; correct while NATS is up.

**Pre-hardening verdict (historical): STUB — and deceptive.** It looks like a real NATS integration but is not.

- **Wrong package.** `event.service.ts` imports `nats.ws`, which is the **browser WebSocket client**. The Node package is `nats`. It will not behave as a durable JetStream publisher.
- **Zero subscribers anywhere.** No `.subscribe`, `@OnEvent`, or consumer exists in `apps/api/src`. Events are **write-only**. The platform's "Event Driven" rule is satisfied only in the publish direction.
- **Silent degradation.** With `NATS_URL` unset (every fresh VPS), `emit()` silently drops to `logger.debug`. Events vanish with no record.
- **No JetStream stream is ever created**, so even with the correct package, `publish('events.<type>')` returns `NoStreamResponse`.
- **Duplicated, divergent schema.** `packages/events` defines a rich `PlatformEvent` + `EventType` union that the service ignores. `docs/EVENT_CATALOG.md` documents subject schemes (`identity.user.*`) that match nothing in the code.
- **Publishing IS broad** — user, project, deployment, domain, database, function, email, queue, cron, and monitoring events all emit. The surface area exists; it just dead-ends.

**This is the correct #1 fix.** An in-process `@nestjs/event-emitter` fallback alone would make the platform react to its own events (audit logs, webhooks, realtime fan-out) even with zero external infrastructure.

---

## C. Module Reality

| Module | Status | The uncomfortable truth |
|--------|--------|------------------------|
| **Auth** | PARTIAL (hardened post-audit) | **Updated 2026-06-20:** the BROKEN verdict below was the pre-hardening snapshot and is now **stale**. The token/session machinery has since been fixed and verified: `resolveJwtSecret` (`common/secrets.ts`) honors `JWT_SECRET`/`JWT_SECRET_FILE` and fails-closed on `change-me`; `createSession` mints a signed refresh JWT carrying `sessionId`; `refreshToken` verifies + rotates it; `logout` reads `user.sessionId` (surfaced by `JwtStrategy`) and revokes the `Session` row. `pnpm --filter @fidscript/api typecheck` clean. See `docs/backend-prerequisites.md` Phase A (✅ Closed). **Pre-hardening (historical):** Login returned a raw hex token while `JwtStrategy` verified it as a JWT → every guarded route 401; `JWT_SECRET` defaulted to `change-me`; magic-link queried `where user.email === token` and never sent email; no MFA. bcrypt was always real. **Still genuinely missing (Phase B):** `mustChangePassword` field + change-password endpoint + platform magic-code + the flag on `/auth/me`. The old `verifyMagicLink` is still broken (treats the token as an email) — replaced by magic-code when `PREREQ-AUTH-3` lands. |
| **Projects** | PARTIAL | The best module — real multi-tenant CRUD, real RBAC, real access checks. But env-vars are stored in plaintext, there are no invites, and subdomains are never routed. Unreachable until auth is fixed. |
| **Deployments** | STUB | "Deploy" inserts a row with `status:'PENDING'`. `triggerBuild`/`completeBuild` flip a column and have **zero callers** — dead code. No Docker, no build, no container, no `deploymentUrl`. The core product promise is not implemented. |
| **Domains** | VERIFIED | Real Cloudflare DNS API via DnsProvider interface, Mode A (manual) and Mode B (cloudflare_auto), 5-step verify pipeline (PENDING → OWNERSHIP_PENDING → VALIDATING → TLS_PENDING → ACTIVE), real TLS cert inspection, health check loop, BROKEN/ACTIVE recovery, email MX safety, DomainConnection model. |
| **Storage** | PARTIAL | The one honest subsystem — real MinIO SDK calls, real uploads, real presigned URLs. But `createBucket`/`deleteBucket` only write rows (no `makeBucket`), fake etag, `getPublicUrl` leaks `http://localhost:9000`. |
| **Email (Stalwart)** | VERIFIED (2026-06-19) | External email now works end-to-end for the platform domain (`deploy.fidscript.com`). DKIM keys live in Stalwart's **internal store** (created via `POST /api/dkim`, read via `GET /api/dkim/{id}`) — NOT on a filesystem volume; `DkimService` registers keys over the management API and publishes only the public key to DNS. `EmailBootstrapService` (`OnApplicationBootstrap`) ensures the platform domain is a LOCAL Stalwart domain + provisions `alert@`/`noreply@` system mailboxes (with `emails` set — recipient validation requires it) on every boot. `[session.rcpt] directory = "internal"` added so inbound recipients validate (without it every local address bounces 550 5.1.2). Stalwart SMTP/IMAP ports (25/465/587/143/993) published + firewall-opened; `[auth.dkim] sign` signs outbound for local domains. Outbound verified (Stalwart delivers to Gmail MX; queue drains); local delivery verified (alert@ receives). All email DTOs carry class-validator decorators (ValidationPipe was stripping every bare-property body). DNS setup is idempotent (upsert TXT/MX). **Gaps:** Stalwart tracer logs go nowhere (`/opt/stalwart/logs` never created) — observability, not delivery; SPF/DKIM/DMARC merge with a user's pre-existing records is future "DNS planner" work. |
| **Databases** | VERIFIED | Real `CREATE DATABASE` + `CREATE ROLE` provisioning via `pg` Pool; PgBouncer (transaction mode) in docker-compose; `DATABASE_URL` auto-injected into project env vars on provision; credentials encrypted at rest (AES-256-GCM); `sslmode=require` on all app connection strings; `CONNECTION LIMIT 20 + statement_timeout='60s'` per role; `pg_database_size()` tracked in `used_bytes`; real `pg_dump|gzip` → MinIO backups; `pg_restore` from MinIO; `ALTER ROLE ... WITH PASSWORD` rotation re-injects env vars; `DIRECT_URL` for unpooled Prisma migrations. |
| **Functions** | PARTIAL (dangerous) | Actually executes code via `child_process.exec` — but **zero sandboxing**, Docker socket mounted, `/tmp` storage, `memoryMb` ignored, env vars not injected, Python payload is shell-injection-prone. A function can read `/etc/shadow`. |
| **Queues** | VERIFIED (Phase 11, 2026-06-19) | Backed on **NATS JetStream** (`QUEUES` stream), not just a Prisma table. Server-side `QueueWorkerService` pull-consumes and dispatches to HTTP/function/internal targets, with a DLQ and retry/ack/nak. Worker loops run **fire-and-forget** (ADR-023) so they no longer block API bootstrap. See `docs/phases/phase-11.md`. |
| **Scheduler** | VERIFIED (Phase 12, 2026-06-19) | Real `cron` library. `CronJobSchedulerService` now implements `OnApplicationBootstrap` and restores every enabled job on restart (the old "every restart silently disables all cron jobs" defect is closed — verified). `functionId` targets dispatch via `FunctionsService.invokeFunction` (verified via `FunctionLog`); HTTP targets fire on schedule. `nextRunAt` is computed from the real expression. Redis distributed lock (`SET NX PX` + Lua compare-and-delete) prevents double-fire. `CronJobRun` history records accurate success/failure. **Gaps:** only cron-expression schedules (no fixed-interval/one-shot); no explicit concurrency-policy field; function *execution* blocked on the current VPS (no `node:18-alpine` image cached, no egress) though *dispatch* is verified. See `docs/phases/phase-12.md`. |
| **Realtime** | VERIFIED (Phase 13, 2026-06-19) | Socket.IO gateway wired and instantiating; JWT handshake auth verifies the real JWT (`sub` claim — bugfix applied; it previously read a non-existent `userId` claim so every socket action ran on `undefined`). `validateChannelToken` does a real bcrypt compare. Presence Redis-backed (TTL; verified keys survive API restart). **Platform events now fan out to clients:** a new `RealtimeBridgeService` (`@OnEvent('**')`) routes every project-scoped event to `project:<id>` rooms, and `subscribe_project` enforces owner-or-member before joining (non-members rejected — verified). `@socket.io/redis-adapter` attached via `RedisIoAdapter` (multi-instance broadcasts). 9/9 prove-it passes incl. after `restart api`. See `docs/phases/phase-13.md`. |
| **Monitoring** | VERIFIED (Phase 14, 2026-06-19) | Alert state machine OK→PENDING→FIRING→RESOLVED is live (`durationSeconds` honored; PENDING→FIRING transitions on re-evaluation by a second metric sample). Prometheus `/metrics` endpoint returns valid text exposition. `NotificationService` dispatches to email (via Stalwart SMTP, confirmed accepted), webhook (HMAC-SHA256), and Slack. `Notification` delivery rows written with status. `monitoring.notification.sent/failed` events emitted and fanned out via Realtime bridge. Channel test endpoint works. **Gaps:** external email delivery to Gmail requires SPF/DKIM/DMARC for `deploy.fidscript.com` (Phase 09); webhook/Slack live delivery blocked by VPS no-egress (dispatch path exercised, real delivery deferred). |
| **Logging** | PARTIAL | Real ingestion + genuinely good cursor-paginated query. But `retentionDays` is never enforced, there is no retention sweep, and no log shipping. |
| **Templates** | STUB | `{{var}}` substitution is real, but "generate a project" creates **one Project row** and returns a string that goes nowhere. No files, no repo, no deploy. |
| **AI** | STUB/broken | The Gemini call itself is real — but the module will not compile (blockers #1, #2). No streaming, key passed as a query parameter, no retry/budget. |
| **Marketplace** | PARTIAL/broken | Rating aggregation genuinely works. But the module will not compile (#1), and **admin actions (approve/reject/verify/feature) have no role guard — any authenticated user can approve their own item.** Reviews never display (`isVerified:false` forever). |

---

## D. The Three Access Surfaces

| Surface | Status | Reality |
|---------|--------|---------|
| **Dashboard** | STUB | `apps/dashboard` is Next.js 15 but has **one page**: an `<h1>FIDScript Deploy</h1>`. No routes, no screens, no API calls, no auth. `packages/ui` has 8 real components used by nothing. The root `src/pages/*` is a broken orphan Vite scaffold (missing `main.tsx`, missing dependencies) — should be deleted. |
| **CLI** | MISSING | No CLI exists — no `bin`, no `commander`/`inquirer`/`yargs` anywhere. One of the three required surfaces is simply absent. |
| **MCP** | PARTIAL | The modular `tools/*` + `handlers.ts` + `server.ts` path is real and live (real HTTP calls). But `index.ts` is a **1526-line dead duplicate** (zero importers — delete it), the SDK is not in the lockfile so it cannot start, and `install.sh` tries to `npx` an unpublished package. |
| **Skills** | STUB | `fidscript-skill.md` is plain documentation with no `SKILL.md` frontmatter — not an installable skill. References fictional commands and repositories. |
| **SDK** | PARTIAL | Two duplicated SDKs (`apps/sdk` axios + `packages/sdk` fetch), both named `@fidscript/sdk` → arbitrary resolution. `apps/sdk` is stronger but is **missing a `databases` module**. Neither is published. |

---

## E. Recommended Hardening Tracks

The "build Phase 24" mindset is retired. Work proceeds in dependency-correct tracks, **each verified on the VPS before the next begins**.

- **Track 0 — Make it build & run.** Resolve blockers #1–#10. *Exit criterion: `docker compose up` on a fresh VPS yields a reachable `deploy.fidscript.com` where a user can register, log in, and call a guarded endpoint.*
- **Track 1 — The event bus.** `nats.ws` → `nats` + in-process `@nestjs/event-emitter` fallback + first real consumer + reconcile `packages/events`. Everything downstream depends on this.
- **Track 2 — Core platform reality**, in dependency order: Auth → Deployments → Domains → Storage → Databases → Email/Stalwart → Functions (sandboxing) → Queues → Scheduler → Realtime → Monitoring → Logging.
- **Track 3 — The three surfaces:** real Dashboard, CLI from scratch, fix & ship MCP, real Skill, dedupe SDK.
- **Track 4 — Polish:** Templates, AI, Marketplace (including the privilege-escalation fix).

---

## How to use this document

The rewritten phase documents reference this audit's sections for "current state." When a phase doc says *"Current state: STUB — see AUDIT.md §C,"* it means: the scaffold exists but does not do the real work, and the phase's job is to make it real.
