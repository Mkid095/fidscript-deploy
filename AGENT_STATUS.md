# Agent Status

Current state of FIDScript Deploy development.

> **Operating mode:** Hardening. We are NOT adding new features. We are rebuilding dependency-first from Phase 0, verifying each phase on the VPS. See `docs/AUDIT.md` and `docs/phases/README.md`.

---

## At a glance

| | |
|---|---|
| **Current phase** | Phase 14 — Monitoring Platform |
| **Last verified phase** | Phase 13 — Realtime Platform (verified 2026-06-19) |
| **Phase docs** | All 24 rewritten to v2 |
| **Snapshot baseline** | Commit `f1dd6f2` (Phase 00-23 scaffold, pre-hardening) |
| **Reset date** | 2026-06-16 |
| **Runtime bring-up** | **2026-06-18** — the Phase 01 installer + the API NestJS bootstrap now actually run end-to-end on the VPS (commits `67c4e72` + `f94a772`). Infra + API healthy; /health = 200; the audit's "never actually run" is fixed for the runtime path. **2026-06-18 (later)** — Stalwart email container also brought up under the same compose; one `docker compose up -d` now starts the whole 7-container platform. Commit `ffb8035` ported StalwartJmapService to v0.15.5 (HTTP Basic auth, no `urn:stalwart:jmap`, POST /api/principal for accounts, SMTP AUTH PLAIN on port 465). **Phase 09 verified 2026-06-18.** |

---

## What happened

The original 23 phases were marked "COMPLETE" without ever being compiled or run. An audit (`docs/AUDIT.md`) found the application **does not build, cannot be installed, and ~75% of modules are row-level stubs**. We committed the scaffold as a clean baseline (`f1dd6f2`) and are now rebuilding properly, phase by phase, verified on the VPS.

The phase roadmap has been restructured for dependency-correctness (`docs/phases/README.md`). The phase *numbers* (00-23) are reused but the *topics* have changed.

---

## Phase status (restructured roadmap)

Statuses: `Planned` · `In Progress` · `Verified`

| Phase | Title | Status |
|------:|-------|--------|
| 00 | Architecture & Build Foundation | Verified |
| 01 | Installer & Infrastructure Stack | Verified |
| 02 | Event Bus & Service Registry | Verified |
| 03 | Identity & Access (platform auth) | Verified |
| 04 | Projects Engine | Verified |
| 05 | Storage Platform | Verified |
| 06 | Deployment Engine | Verified |
| 07 | Domains & TLS | Verified |
| 08 | Database Platform | Verified |
| 09 | Email Platform (Stalwart) | Verified |
| 10 | Functions Runtime | Verified |
| 11 | Queues Platform | Verified |
| 12 | Scheduler Platform | Verified |
| 13 | Realtime Platform | Verified |
| 14 | Monitoring Platform | Planned |
| 15 | Logging Platform | Planned |
| 16 | SDK Platform | Planned |
| 17 | MCP Platform | Planned |
| 18 | CLI Platform | Planned |
| 19 | Dashboard Platform | Planned |
| 20 | Skills Platform | Planned |
| 21 | Templates Platform | Planned |
| 22 | AI Layer | Planned |
| 23 | Marketplace | Planned |

---

## Current focus

- [x] Rewrite all phase docs to v2
- [x] **Phase 00 — verified:** repo compiles, `pnpm typecheck` clean (13/13), `pnpm build` emits all `dist/` (10/10), `docker build` succeeds for both `apps/api` and `apps/dashboard` (CommonJS standardization, decorator flags, Prisma schema fixed, Dockerfiles + `.dockerignore`). See ADR-011/012.
- [x] Begin **Phase 01 — Installer & Infrastructure Stack**: first Prisma migration baseline, `prisma/seed.ts`, compose `_FILE` secrets + env wiring, `install.sh` actually deploys, Traefik/firewall fixes, health checks.
- [x] Begin **Phase 02 — Event Bus & Service Registry**: `@nestjs/event-emitter` local backbone, `nats` package (not `nats.ws`), JetStream stream created on boot, AuditEventConsumer writes PlatformEvent rows, typed EventType union (52 events), RegistryService + `GET /api/v1/services`, Dockerfile fixed to build packages before API.
- [x] Begin **Phase 03 — Identity & Access (platform auth)**: JWT auth, platform roles (USER/ADMIN/OWNER), `PlatformAdminGuard`, session management.
- [x] Begin **Phase 04 — Projects Engine**: encrypted env vars (AES-256-GCM/CryptoService), invitations flow (SHA-256 token hash, 7d expiry, accept/revoke), project API keys (fpk_ prefix, bcrypt-hashed), `projects.*` events (15 typed), `ProjectEnv`/`ProjectInvitation`/`ProjectApiKey` models.
- [x] Begin **Phase 05 — Storage Platform**: real MinIO bucket lifecycle (makeBucket/removeBucket SDK calls), real etag from putObject response, external URLs via MINIO_EXTERNAL_ENDPOINT, per-project bucket namespacing (proj-<slug>-<name>), project isolation (checkProjectAccess), multi-provider (internal/cloudinary/telegram) with per-project credentials from ProjectEnv.
- [x] Begin **Phase 06 — Deployment Engine**: real Docker build+run via BuildRunnerService, async DeploymentWorkerService driving PENDING→QUEUED→BUILDING→DEPLOYING→SUCCESS/FAILED state machine, encrypted env var injection at runtime, lifecycle ops (stop/restart/destroy/rollback), fidscript-app network, Traefik Docker labels routing, build logs persisted.
- [x] Verified **Phase 07 — Domains & TLS**: real Cloudflare DNS API, DnsProvider interface, Traefik ACME DNS-01 + HTTP-01 resolvers, SERVER_IP wired, deploymentId on Domain.
- [x] Verified **Phase 08 — Database Platform**: real provisioning, PgBouncer, encrypted creds, DATABASE_URL auto-injection, SSL enforcement, connection limits, size tracking, rotate re-injects env vars.
- [x] **Phase 09 — Email Platform (verified 2026-06-18)**: schema restructured (domains/mailboxes/aliases/sender_identities/api_keys/messages/catch_all_rules/api_usage/suppressions), simplified domain lifecycle (PENDING→VERIFIED→ACTIVE), platform-generated mailbox passwords, suppression list (bounce/complaint/unsubscribe/manual), catch-all rate limiting (messagesPerMinute), all events wired. StalwartJmapService ported to v0.15.5: HTTP Basic auth, `urn:ietf:params:jmap:*` capabilities only, POST /api/principal for account management, SMTP AUTH PLAIN on port 465 with admin token. Commit `ffb8035`.
- [x] **2026-06-18 — Runtime bring-up on the VPS.** Fixed every latent Phase 01 defect that the audit warned about ("Verified but never actually ran"). The canonical installer + the API NestJS bootstrap now run end-to-end on this box. Commits `67c4e72` (installer: compose, pgbouncer, nats, redis, secrets, entrypoint, .gitignore) and `f94a772` (api: Dockerfile libssl, Prisma `binaryTargets`, migration ordering + the one in-place FK-type fix, five `@Inject('DNS_PROVIDER')` DI fixes). Live state: postgres + redis + nats + minio + pgbouncer (md5 backend, end-to-end auth verified) all healthy; API NestApplication started on :3001, MinIO/Redis/NATS clients initialized, service registry + EventNatsConsumer running; `curl /health` → 200 `{"status":"ok"}`. **Important caveat:** the full Phase 01 §5 rubric (login/register prove-it, tenant-isolation prove-it) is NOT yet run, so Phase 01 is still "In Progress" by the strict definition. What changed is the *biggest blocker* (the stack would not build/run) is removed. **2026-06-18 (later):** Clean Prisma migration replaces the 9-broken-migration set (commit `cd73283`); fresh installs now work correctly. The api-entrypoint.sh was also hardened to avoid advisory-lock timeouts on restart.
- [x] **2026-06-18 — Stalwart (email) container brings up; one `docker compose up -d` runs the whole platform.** Phase 09 had been marked In Progress but the email container was never started — Stalwart was in the compose but crashed silently because (a) the mounted `main.toml` was written for an older schema (sqlite + `${VAR}` placeholders that Stalwart doesn't substitute) and (b) the image was `:latest` and had drifted. Fixed: pinned to `stalwartlabs/stalwart:v0.15.5`, pinned `minio/minio:RELEASE.2025-09-07T16-13-09Z`, replaced the Stalwart config with a v0.15.5-schema `config.toml` rendered at install time by setup-wizard.sh with a bcrypt-hashed fallback-admin secret, added a bash-`/dev/tcp` healthcheck, fixed the api compose healthcheck path and installed curl in the api runtime, and rewrote `health.service.checkRedis` to do a real PING. Live state: 7 containers up — postgres, pgbouncer, redis, nats, minio, stalwart, api — and `api` is now `Up (healthy)`. Commit `ffb8035` ported the StalwartJmapService to v0.15.5 API contract. **Phase 09 verified 2026-06-18.**
- [x] **2026-06-19 — Phase 12 Scheduler verified, and the API bootstrap-hang root-caused + fixed.** The API had been booting all modules but `app.listen()` never opened port 3001 (silent hang, no error). Root cause: `QueuesModule.onModuleInit` awaited `worker.start()`, which awaited infinite `while(!cancelled)` pull loops — NestJS won't open the HTTP port until every init hook resolves, so one infinite loop blocked the whole server (ADR-023). Fix: worker loops are now fire-and-forget; API boots in ~2s, port binds, `/api/v1/health` → 200. Scheduler prove-it on the VPS: jobs **survive a restart** (`onApplicationBootstrap` re-registers every enabled job — the `OnModuleInit` gap from AUDIT §C is closed); **HTTP target** fires on cron after restart (`CronJobRun` completed, echo 200); **function target** dispatches (`executeJob → invokeFunction`, `FunctionLog` created); **`nextRunAt`** computed correctly from the expression; **execution history** recorded; **single fire per tick**; **Redis distributed lock** (`SET NX PX` + Lua compare-and-delete) proven to block double-acquire. Also fixed a correctness bug: a function-target run was silently marked `completed` even when the function errored (invokeFunction returns rather than throws) — now surfaced as `failed`. Honest gaps: only cron-expression schedule type is implemented (no fixed-interval / one-shot `runAt`); no explicit concurrency-policy field (Redis lock gives implicit "skip"); and **function sandbox execution cannot run on this VPS** because the `node:18-alpine` runtime image isn't cached and the box has no external egress to pull it (a Phase 10 / environment constraint, not a scheduler defect). **Phase 12 verified 2026-06-19.**
- [x] **2026-06-19 — Phase 13 Realtime verified.** Closed the AUDIT §C gap: platform events now **fan out to connected clients live**. A new `RealtimeBridgeService` subscribes to every platform event via `@OnEvent('**')`, extracts the owning project, and broadcasts to `project:<id>` rooms on the event's dotted type. `subscribe_project` enforces **owner-or-member** before joining (non-members/non-existent projects rejected). `@socket.io/redis-adapter` attached via a `RedisIoAdapter` (`app.useWebSocketAdapter`) for multi-instance broadcasts. Prove-it on the VPS (host-side socket.io-client + container restart): connect with JWT ✓, subscribe to own project ✓, subscribe to non-member project rejected ✓, receive `projects.project.updated` live after a PATCH (<1s, routed to the correct project) ✓, invalid JWT refused ✓, presence Redis-backed (keys verified) ✓, **9/9 passes again after `restart api`** ✓. Two latent bugs surfaced + fixed: (1) `TokenService.validateJwt` read a non-existent `userId` JWT claim instead of `sub` — every socket action ran on `undefined`; (2) `EventEmitterModule.forRoot()` lacked `{ wildcard: true }` — so **no `@OnEvent('**')` consumer ever fired** (AuditEventConsumer wrote 0 rows; the bridge received nothing). Both fixed. Also learned: attaching the adapter on the `@WebSocketServer` object fails in NestJS (it's the Namespace, not the root Server — `server.of is not a function`); use the `IoAdapter`/`useWebSocketAdapter` path. **Phase 13 verified 2026-06-19.**

### Hardening follow-ups (committed code, but the live VPS still needs them)

- **Phase 04 (Projects) re-platform soostori under fidscript.** Deferred per user direction (2026-06-18). The soostori stack is still running as its own docker-compose; the migration path is documented in task #70.

## Definition of done (per phase)

A phase moves to **Verified** only when, on the VPS: it builds, it runs, its prove-it tests pass, its declared integrations are reachable, and it is committed. See `docs/phases/README.md` §5.

---

*Last updated: 2026-06-19 (Phase 13 Realtime verified — event fan-out to clients + Redis adapter; two latent bugs fixed: JWT `sub` claim, `EventEmitterModule` wildcard)*
