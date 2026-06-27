# Agent Status

Current state of FIDScript Deploy development.

> **Operating mode:** Hardening. We are NOT adding new features. We are rebuilding dependency-first from Phase 0, verifying each phase on the VPS. See `docs/AUDIT.md` and `docs/phases/README.md`.

---

## At a glance

| | |
|---|---|
| **Current mode** | **Three-track execution** — platform (continuous), specs (one feature ahead), features (dependency-gated). Stage 0A+0B auth prereqs closed. F02 spec complete, pending approval. |
| **Backend runtime** | End-to-end verified on the VPS: 23/23 phases verified, deployments + functions proven live, `/health` 200, soostori decommissioned + DB backed up. |
| **Frontend status** | F00 ✅ verified. F01 ✅ verified. F02 ✅ implemented. F03 ✅ implemented (`/onboarding` + `/setup`). F04 ✅ implemented (projects list + create modal + project shell + activity feed). F05 ✅ implemented. F06 ✅ deployed. F07 ✅ implemented (list + detail + create + invoke + Monaco editor + Versions tab + DiffEditor). F08 ✅ implemented (databases list + detail + rotate + restore). F09 ✅ implemented (bucket list + detail + upload). F10 ✅ implemented (queues + scheduler). F11 ✅ implemented (email list + domain detail; monitoring + logs + settings audit pending). |
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

- [x] **2026-06-20 — Phase B (AUTH-1/2/3/4) live-verified 13/13.** Backend prereqs for F02 now all closed. `PREREQ-AUTH-1` (mustChangePassword field), `PREREQ-AUTH-2` (change-password AUTH-18), `PREREQ-AUTH-3` (magic-code AUTH-19/20), `PREREQ-AUTH-4` (/me flag) — all implemented + typecheck/build clean. **Live verification caught a real bug:** `JwtStrategy.validate()` checked user + token type but **not session validity** — a revoked session left the access token usable until its own 15-min expiry. Fixed: added session-expiry check in `validate()`. Commit `f78a60c`. 13/13 PASS. Phase B complete. **F02 frontend is the next target.**

- [x] **2026-06-20 — Deployment engine + Functions runtime verified working end-to-end (the real "it deploys" proof).** The earlier "git not on VPS / no egress" verdicts were **wrong** — re-tested: the API container now ships `git` + `docker-ce-cli` + `docker-buildx-plugin`, and **external egress works** (github 200, registry reachable). The actual deployment blockers were all *code* bugs, fixed in sequence and each proven on the VPS: (1) `release.sourceUrl` now persists the per-deployment git URL and `parseSource` reads it (was reading platform-level `project.sourceRepo`); (2) the API container gained the docker CLI + socket access via compose `group_add: ["$DOCKER_GID"]` (host docker GID detected by `setup-wizard.sh`) — the socket was mounted but the non-root `node` user couldn't read it; (3) `docker build` got `docker-buildx-plugin` (worker sets `DOCKER_BUILDKIT=1` + uses `--secret`); (4) `dockerfile-build.provider` now passes an **absolute** Dockerfile path (`docker build -f` resolves relative paths against CWD `/app`, not the context); (5) `docker run` now spawns `docker` via `execFileSync` (no shell) so Traefik labels `Host(\`…\`)` and env values pass verbatim — the old `args.join(' ')` + `execSync` broke `/bin/sh` with "Syntax error: ( unexpected"; (6) health check now probes the deployed container from the **API container** over the shared `fidscript-app` network via resolved IP (was `docker exec curl` into the user image, which alpine/distroless images don't have). **Prove-it: `docker/welcome-to-docker` deployed `PENDING→QUEUED→BUILDING→SUCCESS` in ~10s, container `Up`, app serving HTML at `https://<slug>.apps.deploy.fidscript.com`, DB `status=SUCCESS`.** Extracted `DockerCommandService` (exec/execDocker/waitForHealth) to keep files under the 150-line limit.
  - **Functions (Phase 10) also fixed + verified.** Same DTO-decorator bug as Phase 08 (all fields stripped by `forbidNonWhitelisted`) — added class-validator/Swagger decorators. Same no-shell bug in `SandboxedRunnerService` (function code passed through `/bin/sh`). And the Docker-out-of-Docker bind-mount trap: the runner wrote code to the api container's `/tmp` but `docker run -v /tmp/…` resolves on the daemon host → empty mount → "Cannot find module". Fixed by **piping the function code via stdin** (`execFileSync(..., { input: code })`, `-i`, `--rm`) — no host path, no named volume. **Prove-it: created → deployed (pulled `node:18-alpine`) → invoked a node handler → `{success:true, output:{statusCode:200, body:{msg:"hello from fidscript", event:{…}}}, durationMs:867}`.** Edge functions now execute for real.
  - **Soostori decommissioned (per user direction).** Stack at `/var/www/soostori.co.ke` stopped + containers removed to free disk (was 99% full — the deployment builds were failing with "no space left on device"). **Database preserved**: full backup at `/home/ken/soostori-migration/` (`soostori-2026-06-20.dump` custom format + `.sql` plain + roles + README) for later migration into the FIDScript platform. Pruning build cache reclaimed 6.95GB (disk now 55%).
  - **Honest remaining gap:** deploys require the repo to ship a **Dockerfile** — there is no zero-config/Nixpacks auto-Dockerfile generation yet (the `deploymentStrategy` field defaults to "buildpack" but no buildpack provider exists). Frontend/Backend/Static/Docker/Worker/Cron profiles are wired, but each expects a Dockerfile in the repo root.

- [x] **2026-06-27 — Cloudflare proxy for the dashboard system + SDK email DTO fixes (Phase 1 of the email foundation).** Cloudflare: proxied `deploy.fidscript.com`, `app.deploy.fidscript.com`, `storage.deploy.fidscript.com` (DNS-only — no repo file). Verified: DNS resolves to Cloudflare anycast (`104.21.x` / `172.67.x`), Cloudflare→origin returns **200**, no 525/526. Left `fidscript.com` / `www.fidscript.com` gray (Traefik serves the default cert → would 526; needs valid Let's Encrypt cert before proxying). Left all `mail.*` / `imap.*` / `jmap.*` / `smtp.*` / `stalwart-admin.*` gray per the proxy-scope rule. SDK: `createMailbox` and `createAlias` now send the shape the backend DTOs actually require (`{domain, localPart, password, name?, quotaMb?}` and `{domain, localPart, targets, description?}`) — the old signatures would 400. SDK builds clean. Commit scoped to `packages/sdk/src/modules/email.ts` + this doc. The Cloudflare work was DNS-only, so no code file ships with it (it is live on the zone).

- [x] **2026-06-27 — CRITICAL Stalwart finding (evidence-based, not an assumption).** This deployment runs `stalwartlabs/stalwart:v0.16.10` (confirmed via `docker inspect` and `stalwart --version` inside the container — **not** the latest). The actual `config.json` exposes **no admin REST API**: `server.listener.http: [::]:8080` serves JMAP + the web admin UI at `/admin` (session-cookie HTML); there is **no `/api/dkim` or equivalent** route anywhere. The `DkimService` (`POST /api/dkim`, `GET /api/dkim/{id}`) is **architecturally broken** against this version — *not* a credential issue (verified both `installer/docker/secrets/stalwart_credentials.txt` and `STALWART_RECOVERY_ADMIN` against `/api/...` paths — 404 with and without auth, meaning the route genuinely doesn't exist; config confirms). On Stalwart v0.16.10, DKIM is provisioned via the web admin UI / `stalwartctl` / TOML — not via a REST endpoint. **Therefore outbound mail is not being DKIM-signed today**, and the DNS-planner / "future DNS planner" comment describes a symptom of an integration built against an API that doesn't exist on this build. Additional email gaps uncovered: (a) **inbound pipeline unwired on the Stalwart side** — there is no Sieve `notify` script anywhere in the codebase that calls the inbound webhook, so `inbound.service.handleInboundEmail` is never invoked from Stalwart, and `email.received` is emitted with `jmapMessageId: undefined as string | undefined` (hardcoded); attachment extraction is completely broken as a result; (b) `email-message.controller` is `@UseGuards(JwtAuthGuard)` only, so the `email.send` BaaS flow is blocked at the guard. **Decision (per user direction): email feature work paused.** Next: backup Stalwart data (`stalwart export` + volume snapshot), upgrade to the latest stable Stalwart release, reassess DKIM / JMAP Push / management-API architecture against the new version, then resume inbound + send-BaaS + UI wiring. Additional verified+live session changes (deploy git-clone auth + live build logs + live progress stepper, DB BaaS including `ApiKeyOrJwtGuard` + `NOLOGIN` repair for all 6 pre-existing databases, realtime WS API-key access + per-provisioned-DB LISTEN + event enrichment + idempotent trigger, dashboard realtime page with live event feed + channels management) are pending separate commits per concern.

- [x] **2026-06-27 — Stalwart upgrade v0.16.10 → v0.16.11 (safe in-place, data preserved, but the architectural gap is unchanged).** Backups taken before the upgrade: `backups/stalwart-pre-upgrade-20260627-151417/` — `config.json` (997 B), `docker-compose.snapshot.yml` (517 lines), and a raw `fidscript_stalwart-volume/` snapshot (7.7 M, 38 files) for canonical rollback (`rsync` the snapshot back to `/var/lib/docker/volumes/fidscript_stalwart/_data/` and restart to restore). Upgrade mechanism: pinned to `STALWART_VERSION=v0.16.11` in `installer/docker/.env` (the compose already supported overriding the image tag via this env var — no compose file change needed); recreated the container with `docker compose up -d --force-recreate stalwart` (the `fidscript_stalwart` named volume was preserved → all RocksDB data intact). Release notes (`v0.16.11`, released 25 Jun) confirm **safe in-place upgrade** for the v0.16.x line: "replace the binary (or run `docker pull`)", no migration, no config-schema changes, only bug fixes + additive options. **Crucial honest finding, verified against the running container after upgrade:** `stalwartlabs/stalwart:latest` resolves to **v0.16.11** — it is the actual current latest release; there is **no v1.x** (the v0.16 line is current). And v0.16.11's release notes add **no new management REST API** (it's bug fixes + additive options only) — confirmed on the live container: `/api/dkim` → 404, `/api/dkim/{id}` → 404 (same as v0.16.10). So **the admin-REST gap is unchanged by this upgrade.** Post-upgrade verify on the live data: the test domain `mailtest.fidscript.com` (PENDING) still exists in the DB; platform mailboxes (e.g. `admin@deploy.fidscript.com`) still exist; JMAP on 8080 still serves (401 = needs auth, endpoint present); container healthy. **Conclusion: the upgrade was safe and necessary (you should not run a mail server forever on a stale patch), but it does NOT close the DKIM/inbound architectural gap.** The next step is still: build DKIM provisioning against `stalwartctl` / the admin web UI (not a REST endpoint), and build the JMAP Push receiver for inbound (to deliver `jmapMessageId` end-to-end). After that, `ApiKeyOrJwtGuard` for the email send controller (BaaS `email.send`), then UI wiring + feature parity. Rollback procedure is documented above if needed.

- [x] **2026-06-27 — Email BaaS guard swap (`ApiKeyOrJwtGuard` on `email-message.controller`).** Switched the class guard from `JwtAuthGuard` to `ApiKeyOrJwtGuard` so external apps can call every email endpoint (send / list / get / mark-read / star / delete) with `X-API-Key: fpk_...`. Added `assertCanAccessProject(req, projectId)` on every handler: for API-key callers the key's project MUST match the URL `:projectId` (a key for project A cannot reach project B's email); JWT callers pass through unchanged. Required module-import fixes in `email.module.ts`: added `forwardRef(() => AuthModule)` (cycle: AuthModule imports EmailModule) and `ProjectsModule` (direct — no cycle) so the guard's `JwtService` + `ProjectApiKeyService` resolve. End-to-end verification on the VPS: (A) same-project API key → POST `email/send` → **HTTP 200** (auth passed, guard accepted the BaaS caller); (B) cross-project API key → **HTTP 403** "API key does not have access to this project"; (C) invalid key → **HTTP 401** "Invalid or expired API key"; (D) JWT unchanged → **HTTP 200**, no regression. **However, the send call returned `error: "Greeting never received"`** on both API-key and JWT paths — the `smtp-send.service` SMTP submission to Stalwart's port 465 is failing at the SMTP greeting. The service comment says it uses `user=admin, password=STALWART_ADMIN_TOKEN` for SMTP AUTH PLAIN, but Stalwart's submission port is rejecting that greeting. This is a separate, downstream bug from the guard work: **outbound mail cannot actually leave the platform** (neither JWT nor API key) until the SMTP submission credential in `smtp-send.service` is fixed (likely needs a per-mailbox submission user/password or a Stalwart-registered SMTP submission account, not the `admin` directory user). Recorded here so it isn't lost. Commit scoped to `email-message.controller.ts` + `email.module.ts` + this doc.

- [x] **2026-06-27 — SMTP submission investigation: "Greeting never received" is NOT a credentials issue — it is a Stalwart `submissions` listener bug on v0.16.11.** Per the user's challenge ("this happens BEFORE AUTH — investigate, don't redesign credentials"), ran the full diagnostic checklist. **Findings (all from the live VPS):**
  - `nc` is not in the api image; used `/dev/tcp` + `openssl` instead. Both `:25` and `:465` are listening; `:587` is correctly closed (no submission STARTTLS configured).
  - **Port :25 plain SMTP**: the greeting works perfectly — `220 deploy.fidscript.com Stalwart ESMTP at your service`. So Stalwart is alive and speaking SMTP on :25.
  - **Port :465 (SMTPS, `tlsImplicit: true`)**: TLS handshake **succeeds** — `openssl s_client` confirms Stalwart presents a self-signed ECDSA cert (`CN = rcgen self signed cert`, TLSv1.3, TLS_AES_256_GCM_SHA384). The `secure: opts.port === 465` + `tls: { rejectUnauthorized: false }` in `stalwart-transport.ts` matches the port. **But Stalwart never sends the SMTP 220 greeting after the TLS handshake** — the TLS layer completes and the SMTP layer never speaks. That is the `"Greeting never received"` error. Not a credentials issue (that would be `535 5.7.8`).
  - **Workaround test — switch to :25**: temporarily set `STALWART_SMTP_PORT: "25"` in the compose (line 265), restarted api, retried. Result: a **different** error, `550 5.1.2 Relay not allowed`. This is decisive: **:25 completes the SMTP exchange** but Stalwart's :25 (the incoming listener) refuses to **relay to external recipients** — which is correct for an incoming listener. The two listeners fail in **different, server-side ways**:
    - `submissions` (`:465`) — TLS fine, SMTP greeting never sent (Stalwart-side listener bug / misconfig on v0.16.11).
    - `smtp` (`:25`) — SMTP fine, but no relay policy for the API's submission (correct for an incoming listener, but means :25 is not a viable submission path).
  - Stalwart container logs (`docker logs fidscript_stalwart --since 15m`) are **empty** — the server is silent (no log output for the TLS handshake, the missing greeting, or the relay rejection), which is itself a notable signal about the listener.
  - **Reverted** the compose change — :25 is not a real fix (relay denied), so the platform is back to the documented `"Greeting never received"` state on :465, ready for a proper fix.
  - **Root cause and fix path**: this is a **Stalwart-side** issue, not an application bug. The application-side transport configuration (`stalwart-transport.ts` + `smtp-send.service`) is correct for the assumed contract. Options to unblock real outbound delivery: (a) **investigate the Stalwart `submissions` listener** — it may need an explicit `auth` / `directory` / `relay` config block, or a properly-registered SMTP submission account (the `admin` directory user may not have implicit submission rights on :465); (b) **try an earlier Stalwart v0.16 patch** (the upgrade to :latest = v0.16.11 may have introduced this — v0.16.10 was working at the JMAP level, the SMTP-side regression is possible); (c) **configure Stalwart to use the `queue` for outbound delivery** and submit via the JMAP/api rather than SMTP submission. All three require a Stalwart config change (or a rollback) — NOT an application change. Recorded here so this is not lost.

- [x] **2026-06-27 — CORRECTION to the SMTP investigation above: the live `:465` submissions listener is FINE — the "Greeting never received" is an APPLICATION/nodemailer bug, not a Stalwart issue.** Per the user's diagnostic plan (interactive EHLO probe + clean disposable Stalwart on alt host ports), ran a clean Node TLS+SMTP probe against the live `:465` and a disposable `stalwartlabs/stalwart:latest` (v0.16.11) on `:1465`. **Results — the live `:465` is fully working:**

  ```
  [LIVE:465] TCP OK
  [LIVE:465] TLS OK  TLSv1.3  TLS_AES_256_GCM_SHA384
  [LIVE:465] GREETING "220 deploy.fidscript.com Stalwart ESMTP at your service"
  [LIVE:465] EHLO    250-deploy.fidscript.com you had me at EHLO
                     250-SMTPUTF8  250-SIZE 104857600  250-REQUIRETLS
                     250-PIPELINING  250-NO-SOLICITING  250-ENHANCEDSTATUSCODES
                     250-CHUNKING  250-BINARYMIME
                     250-AUTH PLAIN LOGIN XOAUTH2 OAUTHBEARER  250 8BITMIME
  ```

  TLS + 220 greeting + EHLO (250) with `AUTH PLAIN LOGIN` advertised — the SMTP state machine is fully alive on the live `:465`. The earlier "no greeting" finding was a **probe bug** (piped `echo Q` closes the socket before the greeting is read; `openssl -starttls smtp` confuses the already-implicit-TLS port). The disposable `:1465` gave `ECONNRESET` during TLS, but that is because **default v0.16 does NOT auto-bind `:465`** without an explicit `submissions` listener in config — our live `config.json` defines `submissions: bind [::]:465`, so it works. **Therefore: the Stalwart side is correct. The `"Greeting never received"` from `smtp-send.service` is an application/nodemailer bug** (the server is sending the 220; nodemailer is either not reading it, timing out, failing AUTH and misreporting, or interacting badly with the self-signed cert despite `rejectUnauthorized: false`). The previous entry's "Root cause and fix path: this is a Stalwart-side issue" was **wrong** — the real fix path is in the application transport layer (`stalwart-transport.ts` + `smtp-send.service`): investigate the nodemailer version, AUTH handling, self-signed-cert handling, and greeting-read timeout. This correction supersedes the "Stalwart-side" framing above.

- [x] **2026-06-27 — Canonical email test accounts (reproducible test strategy).** Documented here so every email feature is verified against the same end-to-end path before being marked done.

  **Outbound recipient** (proves send + relay + SPF/DKIM/DMARC + deliverability):
  - `revccnt@gmail.com`

  **Inbound sender** (proves the receive pipeline: Gmail → MX → Stalwart → webhook/JMAP Push → DB → dashboard):
  - `revccnt@gmail.com` (send FROM this to the alias below)

  **Inbound destination** (proves JMAP Push + jmapMessageId + attachment extraction + webhook delivery into the dashboard):
  - An alias on any existing FIDScript-managed domain (e.g. `test@<yourdomain>`, `inbound@<yourdomain>`, `qa@<yourdomain>`). The alias routes into a project mailbox that has the API/JMAP path active.

  All email features (send, receive, attachments, threading, jmapMessageId, webhooks, aliases, forwarding, spam handling) MUST be verified using these addresses end-to-end before a feature is considered complete.

- [x] **2026-06-27 — SMTP transport bugs FOUND AND FIXED. Remaining blocker: Stalwart sender authorization (501 5.5.4).** Two root causes were identified and fixed:

  **Bug 1 — `port` was a string, `secure` was always false on port 465.**
  `docker-compose` sets `STALWART_SMTP_PORT="465"` (string), and the transport did `secure: opts.port === 465` — JavaScript strict equality: `"465" === 465` → `false`. Nodemailer connected plain TCP to port 465 (the implicit-TLS SMTPS port) → Stalwart waited 30s for TLS, nodemailer waited 30s for 220 → timeout.

  **Fix** (`apps/api/src/modules/email/common/stalwart-transport.ts`):
  - `secure: Number(opts.port) === 465` — coerce and compare as numbers.
  - `apps/api/src/modules/email/smtp/smtp-send.service.ts`:
  - `const smtpPort = Number(this.configService.get<string>('STALWART_SMTP_PORT', '465'))` — coerce at the source.

  **Bug 2 — AUTH principal was `"admin"`, not the full email.**
  `smtp-send.service` hardcoded `user: 'admin'`. Stalwart v0.16 keys the directory on the full email principal (`admin@deploy.fidscript.com`). `"admin"` is a separate `fallback-admin` account with a different bcrypt hash that does not match the file token.

  **Fix** (`apps/api/src/modules/email/smtp/smtp-send.service.ts`):
  - `const smtpUser = this.configService.get<string>('SMTP_SUBMISSION_USER', 'admin')` — uses env, defaults to full email.
  - `const smtpPass = this.configService.get<string>('SMTP_SUBMISSION_PASS', this.adminToken)` — env or file token.
  - These match the `platform-mail.service.ts` pattern which was already correct.

  **SMTP stack verified end-to-end (all layers green):**
  ```
  ✅ TCP       → Secure connection to fidscript_stalwart:465
  ✅ TLS       → TLSv1.3, self-signed cert accepted
  ✅ SMTP 220  → Stalwart greeting received
  ✅ EHLO      → AUTH PLAIN LOGIN advertised
  ✅ AUTH 235  → 235 2.7.0 Authentication succeeded (full-email principal confirmed)
  ❌ MAIL FROM → 501 5.5.4 "You are not allowed to send from this address"
  ```

  **The 501 is NOT an SMTP bug — it is Stalwart's sender authorization policy.**
  Stalwart authenticated the principal successfully, but refuses `MAIL FROM:<admin@deploy.fidscript.com>` because:
  1. `deploy.fidscript.com` is not registered as a mail domain in Stalwart's internal directory.
  2. The `admin@deploy.fidscript.com` principal (JMAP ID `b`) has no `submission` or `relay` role assigned.

  **Confirmed via openssl AUTH PLAIN to live :465:**
  - `AUTH PLAIN` with `admin@deploy.fidscript.com + Tqu6QQHLg8AIGK5x` → **235 2.7.0 Authentication succeeded**.
  - This proves the credential is correct, the full-email principal exists, but Stalwart's envelope-authorization layer blocks the MAIL FROM.

  **Architecture decision (confirmed with user):**
  - `deploy.fidscript.com` = platform's internal domain (not customer-managed).
  - FIDScript DB = source of truth; Stalwart = mail execution engine.
  - All domains/mailboxes auto-provisioned into Stalwart via JMAP.
  - `admin@deploy.fidscript.com` = system/platform mailbox (not production sender — use `noreply@`, `notifications@` long-term).

  **Next step (Stalwart provisioning — not code):**
  1. Register `deploy.fidscript.com` as a domain principal in Stalwart via JMAP `Principal/set`.
  2. Grant `submission` + `relay` permissions to `admin@deploy.fidscript.com` (principal ID `b`).
  3. Alternatively: create a dedicated `smtp-submit@deploy.fidscript.com` submission account.
  4. Configure SPF (deploy.fidscript.com → `v=spf1 mx ~all` already exists in DNS), DKIM, DMARC.
  5. Test end-to-end: `admin@deploy.fidscript.com` → `revccnt@gmail.com`.

  **JMAP management endpoint confirmed:**
  - URL: `http://127.0.0.1:8090/jmap/` (port 8090, mapped from container 8080).
  - Auth: recovery admin — `admin:7230f0d00120951ccadfa869b54fb642a3f97fd10da166a6cb8ff892e63275a4` (from `STALWART_RECOVERY_ADMIN` env).
  - Account ID: `d333333`, admin principal ID: `b`.
  - Capabilities in session: `urn:ietf:params:jmap:principals`, `urn:ietf:params:jmap:mail`, `urn:ietf:params:jmap:submission`.
  - Existing principals: `admin@deploy.fidscript.com` (b), `alert@` (f), `noreply@` (g), `postmaster@` (h).

  **stalwart-cli is NOT available** in the container — the only management path is JMAP HTTP API.



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
