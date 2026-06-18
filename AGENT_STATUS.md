# Agent Status

Current state of FIDScript Deploy development.

> **Operating mode:** Hardening. We are NOT adding new features. We are rebuilding dependency-first from Phase 0, verifying each phase on the VPS. See `docs/AUDIT.md` and `docs/phases/README.md`.

---

## At a glance

| | |
|---|---|
| **Current phase** | Phase 09 — Email Platform (Stalwart) (in progress) |
| **Last verified phase** | Phase 08 — Database Platform (verified 2026-06-17) |
| **Phase docs** | All 24 rewritten to v2 |
| **Snapshot baseline** | Commit `f1dd6f2` (Phase 00-23 scaffold, pre-hardening) |
| **Reset date** | 2026-06-16 |
| **Runtime bring-up** | **2026-06-18** — the Phase 01 installer + the API NestJS bootstrap now actually run end-to-end on the VPS (commits `67c4e72` + `f94a772`). Infra + API healthy; /health = 200; the audit's "never actually run" is fixed for the runtime path. |

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
| 09 | Email Platform (Stalwart) | In Progress |
| 10 | Functions Runtime | In Progress |
| 10 | Functions Runtime | Planned |
| 11 | Queues Platform | Planned |
| 12 | Scheduler Platform | Planned |
| 13 | Realtime Platform | Planned |
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
- [x] **Phase 09 — Email Platform**: schema restructured (domains/mailboxes/aliases/sender_identities/api_keys/messages/catch_all_rules/api_usage/suppressions), simplified domain lifecycle (PENDING→VERIFIED→ACTIVE), platform-generated mailbox passwords, suppression list (bounce/complaint/unsubscribe/manual), catch-all rate limiting (messagesPerMinute), StalwartJmapService (full JMAP admin client), all events wired.
- [x] **2026-06-18 — Runtime bring-up on the VPS.** Fixed every latent Phase 01 defect that the audit warned about ("Verified but never actually ran"). The canonical installer + the API NestJS bootstrap now run end-to-end on this box. Commits `67c4e72` (installer: compose, pgbouncer, nats, redis, secrets, entrypoint, .gitignore) and `f94a772` (api: Dockerfile libssl, Prisma `binaryTargets`, migration ordering + the one in-place FK-type fix, five `@Inject('DNS_PROVIDER')` DI fixes). Live state: postgres + redis + nats + minio + pgbouncer (md5 backend, end-to-end auth verified) all healthy; API NestApplication started on :3001, MinIO/Redis/NATS clients initialized, service registry + EventNatsConsumer running; `curl /health` → 200 `{"status":"ok"}`. **Important caveat:** the full Phase 01 §5 rubric (login/register prove-it, tenant-isolation prove-it) is NOT yet run, so Phase 01 is still "In Progress" by the strict definition. What changed is the *biggest blocker* (the stack would not build/run) is removed.

### Hardening follow-ups (committed code, but the live VPS still needs them)

- **Regenerate the canonical Prisma migrations from the model.** The `ADD …` migrations (Phase 09+) still have systemic FK type bugs (UUID vs TEXT against the init's TEXT/CUID ids). On this VPS we used `prisma db push` (dev-only) + marked all 10 migrations applied so the entrypoint is happy. A fresh install would hit the same P3009 / 42804 chain. The right fix: `prisma migrate diff` from the current schema back to `schema.prisma`, regenerate clean migration files, replace the canonical set.
- **Phase B cutover: Traefik owns 80/443, host nginx retires.** Routes for the existing live domains (whatsapp.fidscript.com → Evolution API, soostori.co.ke → soostori-api) move into Traefik so the whatsapp/nextmavens stack stays live and soostori stays reachable; fidscript's own domains (deploy.fidscript.com, *.apps.deploy.fidscript.com, storage.*, jmap.*) come up via Cloudflare DNS-01 (ADR-022). Avoid host port 8080 (evoapi already uses it).
- **Phase 04 (Projects) re-platform soostori under fidscript.** Deferred per user direction (2026-06-18). The soostori stack is still running as its own docker-compose; the migration path is documented in task #70.

## Definition of done (per phase)

A phase moves to **Verified** only when, on the VPS: it builds, it runs, its prove-it tests pass, its declared integrations are reachable, and it is committed. See `docs/phases/README.md` §5.

---

*Last updated: 2026-06-18*
