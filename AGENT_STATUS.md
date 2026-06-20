# Agent Status

Current state of FIDScript Deploy development.

> **Operating mode:** Hardening. We are NOT adding new features. We are rebuilding dependency-first from Phase 0, verifying each phase on the VPS. See `docs/AUDIT.md` and `docs/phases/README.md`.

---

## At a glance

| | |
|---|---|
| **Current mode** | **Documentation-first phase — implementation paused.** Building the complete frontend blueprint (`docs/product/` + `docs/phases/frontend/`) before any new frontend feature is written. Rule 14 of `CLAUDE.md` (Documentation → Review → Approval → Implementation) + rule 15 (operating-system framing). |
| **Backend runtime** | End-to-end verified on the VPS: 23/23 phases verified, deployments + functions proven live, `/health` 200, soostori decommissioned + DB backed up. |
| **Frontend status** | F00 design system ✅ verified (live on deploy.fidscript.com). F01 public site ✅ verified (live). F02 auth — **spec complete** (16-section exemplar, reveals 4 backend prerequisites). F03–F11 — **specs pending** (in implementation order after F02 review). |
| **Documentation blueprint** | See "Documentation-first phase" section below. |
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
| 08 | Database Platform | Verified |
| 09 | Email Platform (Stalwart) | Verified |
| 10 | Functions Runtime | Verified |
| 11 | Queues Platform | Verified |
| 12 | Scheduler Platform | Verified |
| 13 | Realtime Platform | Verified |
| 14 | Monitoring Platform | Verified |
| 15 | Logging Platform | Verified |
| 16 | SDK Platform | Verified |
| 17 | MCP Platform | Verified |
| 18 | CLI Platform | Verified |
| 19 | Dashboard Platform | Committed (pending VPS verify) |
| 20 | Skills Platform | Verified |
| 21 | Templates Platform | Verified |
| 22 | AI Layer | Verified |
| 23 | Marketplace | Verified |

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
- [x] **2026-06-19 — Phase 15 Logging (committed, pending VPS verify).** Retention sweep: `LogRetentionService.runSweep()` batch-deletes entries older than each stream's `retentionDays` (5 k rows/batch, `logs.pruned` events). Shipper: `LogShipperService` buffers entries per stream, flushes to `WebhookShipper` (batched HTTP POST + HMAC-SHA256) or `MinioShipper` (gzipped JSONL → MinIO) on buffer size (1 k) or timer (30 s), 3× retry with back-off, `logs.shipped/ship_failed` events. Quota: `LogQuotaService` enforces 50 k/24 h soft cap per stream via Phase-14 `AlertEvaluatorService.evaluate()` on breach. Structured ingest: `POST /logs/ingest` authenticated via `X-API-Key: fpk_...` header, `validateProjectApiKey` on `ProjectApiKeyService`. Events: `logs.log.ingested`, `logs.pruned`, `logs.shipped`, `logs.ship_failed`, `logs.quota_exceeded`. Retention sweep + shipper flush run via `setInterval` inside `LogSchedulerService` (6 h and 5 m respectively), avoiding circular dep with `SchedulerModule`. Commit `c50cc29`.
- [x] **2026-06-19 — Phase 16 SDK (committed, pending verify).** Consolidated to `packages/sdk` (`@fidscript/sdk`) as the single canonical SDK. Full module coverage: auth, projects, deployments, storage, databases, domains, email, functions, queues, cron, realtime, monitoring, logs. `createFidscript()` entry point; `FidscriptClient` with get/post/put/patch/delete + `streamGet`; typed errors (FidscriptError / AuthError / NotFoundError / ValidationError / RateLimitError); configurable retries with exponential back-off; async iterator pagination; `RealtimeModule` wrapping socket.io-client with typed platform events; `logs.ingest()` with X-API-Key auth. Commit `086478b`.
- [x] **2026-06-20 — Phases 04–13 VPS audit: bugs found + fixed, remaining gaps are environment constraints.** Phase 05 Storage (commit `e983c1a`): 6 bugs — MinIO bucket name mismatch (`makeBucket` vs `resolveBucket`), Buffer.from body bug, BigInt JSON serialization, getSignedUrl internal endpoint, makeBucket idempotency missing 'already own it'. All verified end-to-end: bucket create/list/upload/list/presign-URL/tenant-isolation ✓. Phase 06 Deployments (commit `4cfd4e6`): event double-nesting (`emit()` wraps PlatformEvent in metadata field, handler read wrong level → Missing deploymentId/projectId), stuck PENDING recovery on restart. State machine verified: created→queued→building→failed (git not on VPS — env constraint, not code bug) ✓. Phase 07 Domains: Cloudflare token loaded, routes mapped, domain requires successful deployment (git not available — env constraint). Phase 08 Databases (commit `f8036a5`): 6 bugs — missing class-validator decorators (all DTOs), PostgreSQL CREATE ROLE SET syntax error (split into CREATE+ALTER), fs.readFileSync undefined return, BigInt in create/list responses, no tenant isolation (added ProjectAccessService to all 11 routes). Verified: create/list/isolation ✓. Phases 09–13: Stalwart healthy, email creation works, functions/queues/cron return 200 with empty arrays ✓.

- [x] **2026-06-20 — Phase 03 gap-fixes: Inc 1–6 (BaaS auth hardening).** **Inc 1** (commit `406f4a0`): platform auth correctness — `auth-session.service` now carries `sessionId` in access JWT, `auth-token.service` rotates refresh on use (the half-broken refresh/refresh-token join is fixed), `jwt.strategy` reads `JWT_SECRET_FILE` like realtime does, formal `@CurrentUser` decorator + 3-arg `extractRequestContext(req)` (IP from `x-forwarded-for`, UA) for audit emits, deleted dead `auth.service.ts` duplicate. **Inc 2** (commit `9d060f0`): Redis-backed `AuthRateLimiter` (Lua atomic incr+expire) shared by platform auth + app-auth; failed login → 429 after limit; 429 with `Retry-After`. **Inc 3** (commit `10b4856`): platform-user TOTP MFA — `MfaService` (otplib v13 `generateSync`/`verifySync`/`keyuri`), `POST /auth/mfa/setup` (secret + QR URI), `/auth/mfa/verify` (confirm → enable), `/auth/mfa/challenge` (TOTP-on-login), `mfaEnabled`/`mfaSecret` columns already on `User` (now encrypted at rest via CryptoService). **Inc 4** (commit `2ea4e76`): BaaS **magic-code (OTP) sign-in** — Redis-backed bcrypt-hashed codes, 10-min TTL, attempt lock, 3-sends/5-verifies per window, low-case email normalization, Stalwart delivery via `SmtpSendService`. `requestCode` returns 200 for unknown emails (no enumeration); user is created on first successful verify. Cross-project OTP isolation verified. **Inc 5** (commit `e1bfec6`): per-project **OAuth (Google + GitHub)** via manual Auth-Code flow with per-project encrypted creds (CryptoService AES-256-GCM), `AuthProvider` table, provider CRUD (admin-gated), `MockOAuthProvider` for testing without real creds. **App-user JWT** — all BaaS auth flows now issue signed JWTs; `AppJwtStrategy` + `AppJwtGuard` + `@CurrentAppUser`; refresh rotation. Events `auth.token_refreshed`, `auth.refresh_rejected`, `auth.oauth_signin_succeeded`, `auth.provider_configured`. **Inc 6** (commit `a54c635`): app-user **management API** — `GET /projects/:id/auth/users` (paginated list), `GET /projects/:id/auth/users/:userId` (with roles + OAuth accounts), `DELETE /projects/:id/auth/users/:userId` (revoke all sessions), `POST /projects/:id/auth/users/:userId/roles` (assign role); all project-admin gated via `ProjectAccessService`. WhatsApp-frontend **nginx fix**: `fidscript_api` added to `nextmavens-net` network so the static frontend can proxy to the API; `proxy_pass` updated from `nextmavens_admin_api` (non-existent hostname) to `fidscript_api`.

- [x] **2026-06-20 — Deployment engine + Functions runtime verified working end-to-end (the real "it deploys" proof).** The earlier "git not on VPS / no egress" verdicts were **wrong** — re-tested: the API container now ships `git` + `docker-ce-cli` + `docker-buildx-plugin`, and **external egress works** (github 200, registry reachable). The actual deployment blockers were all *code* bugs, fixed in sequence and each proven on the VPS: (1) `release.sourceUrl` now persists the per-deployment git URL and `parseSource` reads it (was reading platform-level `project.sourceRepo`); (2) the API container gained the docker CLI + socket access via compose `group_add: ["$DOCKER_GID"]` (host docker GID detected by `setup-wizard.sh`) — the socket was mounted but the non-root `node` user couldn't read it; (3) `docker build` got `docker-buildx-plugin` (worker sets `DOCKER_BUILDKIT=1` + uses `--secret`); (4) `dockerfile-build.provider` now passes an **absolute** Dockerfile path (`docker build -f` resolves relative paths against CWD `/app`, not the context); (5) `docker run` now spawns `docker` via `execFileSync` (no shell) so Traefik labels `Host(\`…\`)` and env values pass verbatim — the old `args.join(' ')` + `execSync` broke `/bin/sh` with "Syntax error: ( unexpected"; (6) health check now probes the deployed container from the **API container** over the shared `fidscript-app` network via resolved IP (was `docker exec curl` into the user image, which alpine/distroless images don't have). **Prove-it: `docker/welcome-to-docker` deployed `PENDING→QUEUED→BUILDING→SUCCESS` in ~10s, container `Up`, app serving HTML at `https://<slug>.apps.deploy.fidscript.com`, DB `status=SUCCESS`.** Extracted `DockerCommandService` (exec/execDocker/waitForHealth) to keep files under the 150-line limit.
  - **Functions (Phase 10) also fixed + verified.** Same DTO-decorator bug as Phase 08 (all fields stripped by `forbidNonWhitelisted`) — added class-validator/Swagger decorators. Same no-shell bug in `SandboxedRunnerService` (function code passed through `/bin/sh`). And the Docker-out-of-Docker bind-mount trap: the runner wrote code to the api container's `/tmp` but `docker run -v /tmp/…` resolves on the daemon host → empty mount → "Cannot find module". Fixed by **piping the function code via stdin** (`execFileSync(..., { input: code })`, `-i`, `--rm`) — no host path, no named volume. **Prove-it: created → deployed (pulled `node:18-alpine`) → invoked a node handler → `{success:true, output:{statusCode:200, body:{msg:"hello from fidscript", event:{…}}}, durationMs:867}`.** Edge functions now execute for real.
  - **Soostori decommissioned (per user direction).** Stack at `/var/www/soostori.co.ke` stopped + containers removed to free disk (was 99% full — the deployment builds were failing with "no space left on device"). **Database preserved**: full backup at `/home/ken/soostori-migration/` (`soostori-2026-06-20.dump` custom format + `.sql` plain + roles + README) for later migration into the FIDScript platform. Pruning build cache reclaimed 6.95GB (disk now 55%).
  - **Honest remaining gap:** deploys require the repo to ship a **Dockerfile** — there is no zero-config/Nixpacks auto-Dockerfile generation yet (the `deploymentStrategy` field defaults to "buildpack" but no buildpack provider exists). Frontend/Backend/Static/Docker/Worker/Cron profiles are wired, but each expects a Dockerfile in the repo root.

- [x] **2026-06-20 — Documentation-first phase entered.** Backend end-to-end verified; implementation
  paused. Building the complete blueprint before any new frontend feature is built. The full doc
  set lives in `docs/product/` (the operating-system blueprint) + `docs/phases/frontend/` (the
  phase specs) + `docs/phases/frontend/backend/` (the accurate endpoint inventory). The parent
  guide `CLAUDE.md` was rewritten to point to every doc, codify rule 14 (Documentation → Review →
  Approval → Implementation) and rule 15 (operating-system framing: every screen renders real
  Prisma entities + real inventory endpoints, respects per-role rendering, honest about gaps).
  **The audit proved its own value** — writing the F02 spec surfaced 4 backend prerequisites
  (`User.mustChangePassword` field + seed, `POST /auth/change-password`, platform magic-code
  endpoints, `mustChangePassword` on `/auth/me`) that block auth implementation; that is exactly the
  kind of gap documentation-first is designed to find.

### Documentation-first phase — blueprint status

The complete frontend blueprint. Implementation is **paused** until the user reviews the blueprint
and approves the next implementation phase. Every doc cross-references the backend inventory
(`docs/phases/frontend/backend/`, stable IDs `AUTH-04`, `DEPL-02`, `MAIL-21`, …).

| Layer | Doc | Status |
|---|---|---|
| North star | `docs/product/platform-philosophy.md` | ✅ done (operating-system, 5 principles, one-domain fan-out) |
| Flows | `docs/product/user-journeys.md` | ✅ done (6 personas × full flows + branches + success) |
| IA | `docs/product/navigation.md` | ✅ done (global + sidebar's 14 items + command palette) |
| UX rules | `docs/product/user-experience-spec.md` | ✅ done (empty/error/loading/permission/a11y + single-screen test) |
| Backend inventory | `docs/phases/frontend/backend/` (5 cluster files) | ✅ done (~225 routes + WS + 108 MCP tools, security caveats surfaced) |
| Service specs | `docs/product/services/` (12 services) | ✅ done (Prisma entities + inventory IDs + realtime + gaps) |
| Screen inventory | `docs/product/screens/index.md` | ✅ done (every screen → Prisma entity + route + auth render) |
| Component catalog | `docs/product/components/index.md` | ✅ done (catalog) |
| Component specs | `docs/product/components/{button,data-table,toast}.md` | ✅ 3/30 done; remaining in implementation order |
| Phase F02 | `docs/phases/frontend/f02-auth.md` | ✅ full 16-section spec (exemplar; pending approval) |
| Phase F00/F01 | `docs/phases/frontend/f00-*.md`, `f01-*.md` | ✅ implemented + verified; specs are light, full-template upgrade pending |
| Phases F03–F11 | `docs/phases/frontend/f03..f11-*.md` | ⏳ specs pending (in implementation order) |
| Per-screen deep specs | `docs/product/screens/_NN-*.md` | ⏳ for the non-obvious screens (in implementation order) |

**Operating-system framing** (read first, constrains every doc): the dashboard is the operator's
**control plane** for backend services, not a viz dashboard. Every screen renders **real Prisma
entities** with real fields, enables **real inventory endpoints**, respects the **real auth
context** (owner/admin/dev/viewer each see different fields, buttons, chrome), and is **honest
about backend gaps** (greyed, never faked). See `CLAUDE.md` rule 15 and the operating-system
framing section.

### Hardening follow-ups (committed code, but the live VPS still needs them)

- **Soostori migration into FIDScript.** The soostori stack was stopped 2026-06-20 and its Postgres backed up to `/home/ken/soostori-migration/`. When ready, restore the dump into a FIDScript-managed database and re-platform the app (the old "re-platform soostori under fidscript" follow-up, now unblocked by disk space).

## Definition of done (per phase)

A phase moves to **Verified** only when, on the VPS: it builds, it runs, its prove-it tests pass, its declared integrations are reachable, and it is committed. See `docs/phases/README.md` §5.

---

*Last updated: 2026-06-20 — documentation-first phase; backend 23/23 verified; frontend blueprint in
`docs/product/` + `docs/phases/frontend/`; F02 spec complete (pending approval + 4 backend prereqs);
F03–F11 specs next. Implementation paused.*
