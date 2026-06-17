# Agent Status

Current state of FIDScript Deploy development.

> **Operating mode:** Hardening. We are NOT adding new features. We are rebuilding dependency-first from Phase 0, verifying each phase on the VPS. See `docs/AUDIT.md` and `docs/phases/README.md`.

---

## At a glance

| | |
|---|---|
| **Current phase** | Phase 09 — Email Platform (Stalwart) (next) |
| **Last verified phase** | Phase 08 — Database Platform (real provisioning, PgBouncer, encrypted creds, DATABASE_URL auto-injection, SSL, connection limits, size tracking) |
| **Phase docs** | All 24 rewritten to v2 |
| **Snapshot baseline** | Commit `f1dd6f2` (Phase 00-23 scaffold, pre-hardening) |
| **Reset date** | 2026-06-16 |

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
| 08 | Database Platform | In Progress |
| 09 | Email Platform (Stalwart) | Planned |
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

## Definition of done (per phase)

A phase moves to **Verified** only when, on the VPS: it builds, it runs, its prove-it tests pass, its declared integrations are reachable, and it is committed. See `docs/phases/README.md` §5.

---

*Last updated: 2026-06-17*
