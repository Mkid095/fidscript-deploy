# Architecture Decisions

Architecture Decision Records (ADRs) for FIDScript Deploy.

---

## ADR-001: Use NATS for Events, Queues, and Realtime

**Date:** 2026-06-16

**Status:** Accepted

**Context:**
The platform requires messaging infrastructure for:
- Event streaming (audit logs, notifications)
- Queue processing (background jobs)
- Realtime subscriptions (WebSocket channels)

**Options Considered:**

1. **Apache Kafka**
   - Pros: Enterprise proven, high throughput
   - Cons: Complex setup, resource intensive, JVM-based

2. **RabbitMQ**
   - Pros: Mature, good UI
   - Cons: Complex clustering, erlang-based

3. **Redis Streams**
   - Pros: Simple, fast
   - Cons: No native pub/sub persistence, limited queue features

4. **NATS**
   - Pros: Lightweight, simple, JetStream for persistence, native pub/sub
   - Cons: Smaller ecosystem than Kafka

**Decision:** Use NATS with JetStream

**Rationale:**
- Single system handles all messaging patterns
- JetStream provides persistence when needed
- Lightweight enough for single-VPS deployments
- Excellent performance characteristics
- Active development community
- Natural fit for realtime requirements

**Consequences:**
- Development team must learn NATS patterns
- Some features require JetStream configuration
- No native web UI for message inspection

---

## ADR-002: Use Stalwart Mail Server

**Date:** 2026-06-16

**Status:** Accepted

**Context:**
The platform needs a self-hosted mail server for:
- Transactional emails
- Platform notifications
- Application email sending

**Options Considered:**

1. **Postfix**
   - Pros: Ubiquitous, stable
   - Cons: Complex configuration, no webmail, separate IMAP/POP

2. **Mailu**
   - Pros: Docker-based, includes webmail
   - Cons: Heavy dependencies, complex setup

3. **Mailcow**
   - Pros: Full feature set
   - Cons: Heavy, Ansible-based config

4. **Stalwart Mail Server**
   - Pros: All-in-one (SMTP/IMAP/JMAP), modern design, Rust-based, built-in webmail
   - Cons: Newer project, smaller community

**Decision:** Use Stalwart Mail Server

**Rationale:**
- Self-hosted all-in-one solution
- Modern protocol support (JMAP is emerging standard)
- Efficient resource usage (Rust)
- Easy Docker deployment
- GraphQL API for management
- Built-in spam filtering

**Consequences:**
- Must monitor Stalwart development
- Early adopter risk (newer project)
- May need to contribute fixes

---

## ADR-003: NestJS for Backend API

**Date:** 2026-06-16

**Status:** Accepted

**Context:**
The platform needs a backend framework for:
- REST API
- Service orchestration
- Business logic

**Options Considered:**

1. **Express.js**
   - Pros: Minimal, flexible, widely used
   - Cons: Boilerplate for larger apps, no structure enforcement

2. **Fastify**
   - Pros: Fast, schema validation built-in
   - Cons: Less mature ecosystem

3. **NestJS**
   - Pros: Opinionated structure, TypeScript-first, decorators, DI container
   - Cons: Learning curve, opinionated

4. **tRPC**
   - Pros: End-to-end type safety
   - Cons: Requires TypeScript clients, less REST-friendly

**Decision:** Use NestJS

**Rationale:**
- Enforced structure aids maintainability
- TypeScript-first approach aligns with platform SDK
- Dependency injection aids testing
- Decorator-based syntax is readable
- Active enterprise use
- Built-in OpenAPI/Swagger support

**Consequences:**
- Team must learn NestJS patterns
- More abstraction than Express
- Dependency on NestJS ecosystem

---

## ADR-004: Next.js 15 with App Router for Dashboard

**Date:** 2026-06-16

**Status:** Accepted

**Context:**
The platform needs a frontend framework for:
- Dashboard UI
- Project management screens
- Installer wizard

**Options Considered:**

1. **Vite + React**
   - Pros: Simple, fast HMR
   - Cons: More manual configuration

2. **Next.js (Pages Router)**
   - Pros: SSG/SSR, API routes, large ecosystem
   - Cons: Pages router is legacy

3. **Next.js (App Router)**
   - Pros: React Server Components, layouts, improved DX
   - Cons: Newer patterns, some complexity

4. **Remix**
   - Pros: Nested routes, web standards focus
   - Cons: Smaller ecosystem

**Decision:** Next.js 15 with App Router

**Rationale:**
- Server Components reduce client bundle
- Layouts simplify page structure
- API routes for BFF pattern
- Large ecosystem and community
- Vercel deployment option
- React 19 features available

**Consequences:**
- Must follow App Router conventions
- Server Component boundaries require understanding
- Deployment requires Node.js environment

---

## ADR-005: Dockerfile-First Deployment Strategy

**Date:** 2026-06-17 (revised from 2026-06-16)

**Status:** Accepted

**Context:**
The deployment engine must produce predictable, reproducible builds on a single VPS. We need to minimize variables while still supporting the full range of application types.

**Options Considered:**

1. **Dockerfile Required**
   - Pros: Full control, predictable builds, no magic, reproducible anywhere
   - Cons: Users must write Dockerfiles

2. **Buildpacks Only**
   - Pros: Zero config for standard apps
   - Cons: Unpredictable build behavior, version drift, vendor lock-in to pack version, hard to debug

3. **Buildpack-First, Dockerfile-Fallback**
   - Pros: Best developer experience, escape hatch
   - Cons: Two systems to maintain; buildpack behavior varies by version; harder to debug

**Decision:** Dockerfile-first. Buildpacks are future pluggable providers.

**Rationale:**
- An infrastructure platform needs **reliability before convenience**. Dockerfile produces byte-for-byte identical images regardless of build environment.
- Buildpacks introduce version skew (heroku/16 → heroku/22 behaves differently), hidden dependency resolution, and are hard to debug when they fail.
- The `BuildProvider` interface (Phase 06) makes adding buildpack providers a future mechanical change — no architectural risk.
- All cloud platforms (Vercel, Railway, Render, Fly.io) that started "simple" eventually moved toward Dockerfile or explicit build config because buildpacks couldn't express enough complexity.
- Users who want zero-config can use a base image + multi-stage build in a committed Dockerfile.

**Phase 06–15 (current):** `DockerfileBuildProvider` is the only provider. Git repository required. Dockerfile must exist in source root.

**Future (Phase N, not yet scheduled):** `NodeBuildpackProvider`, `PythonBuildpackProvider`, etc. implement `BuildProvider` interface and slot in without changing `BuildRunnerService`.

**Consequences:**
- Users must provide a Dockerfile (or use a standard template)
- Build logs are deterministic
- Images are reproducible from source at any point in time

---

## ADR-006: PostgreSQL as Primary Database

**Date:** 2026-06-16

**Status:** Accepted

**Context:**
The platform needs a primary database for:
- User and project data
- Application databases
- Audit logs
- Event store

**Options Considered:**

1. **PostgreSQL**
   - Pros: Mature, ACID compliant, rich features, JSON support, pgvector
   - Cons: Requires separate Redis for sessions

2. **MySQL/MariaDB**
   - Pros: Widely used, Galera clustering
   - Cons: Less feature-rich than Postgres

3. **MongoDB**
   - Pros: Flexible schema, JSON-native
   - Cons: Not relational, different query patterns

4. **SQLite**
   - Pros: Simple, file-based
   - Cons: Not designed for concurrent writes, limited features

**Decision:** PostgreSQL 16+

**Rationale:**
- ACID compliance critical for financial/audit data
- JSONB for semi-structured data
- pgvector for AI embeddings (future)
- Rich indexing options
- Excellent TypeORM/Prisma support
- COPY for fast bulk operations

**Consequences:**
- Separate Redis needed for sessions/cache
- Connection pooling required (PgBouncer)
- Must manage backups separately

---

## ADR-007: TypeScript Strict Mode

**Date:** 2026-06-16

**Status:** Accepted

**Context:**
The platform uses TypeScript for:
- Backend API (NestJS)
- Frontend (Next.js)
- SDK packages

**Options Considered:**

1. **TypeScript Standard**
   - Pros: Default configuration
   - Cons: Some unsafe defaults allowed

2. **TypeScript Strict Mode**
   - Pros: Catches more errors, safer code
   - Cons: More initial effort to satisfy types

3. **TypeScript Strictest (tsc --strictest)**
   - Pros: Maximum safety
   - Cons: May be overly restrictive

**Decision:** TypeScript Strict Mode (no implicit any, strict null checks, etc.)

**Rationale:**
- Catches bugs at compile time
- Better IDE support
- Self-documenting code
- Platform SDK must be rock-solid

**Consequences:**
- Must annotate all types
- Cannot use `any` without explicit opt-in
- More upfront development time
- Easier refactoring

---

## ADR-008: Feature-Based Folder Structure

**Date:** 2026-06-16

**Status:** Accepted

**Context:**
The platform has multiple services and features that could be organized:
- By layer (controllers, services, repositories)
- By feature (auth, projects, deployments)
- Hybrid approach

**Options Considered:**

1. **Layer-Based**
   - Pros: Traditional, familiar
   - Cons: Many files to navigate, feature spread across folders

2. **Feature-Based**
   - Pros: Self-contained features, easy to find related code
   - Cons: Requires discipline, may lead to duplication

3. **Hybrid (apps/ and packages/)**
   - Pros: Clear separation, shared packages
   - Cons: More complex structure

**Decision:** Feature-based within a monorepo structure

**Rationale:**
- Features are the primary grouping
- Related code stays together
- Easier to onboard to single feature
- Clear ownership boundaries
- Scales well with many features

**Consequences:**
- Feature folders must be consistent
- Shared utilities need clear home
- Cross-feature dependencies must be managed
- Each feature has its own components, hooks, services, types

---

## ADR-009: No Emojis in UI

**Date:** 2026-06-16

**Status:** Accepted

**Context:**
The dashboard interface could use various visual indicators:
- Emojis for status/icons
- Text labels
- Icon components

**Options Considered:**

1. **Emojis Everywhere**
   - Pros: Colorful, fun
   - Cons: Inconsistent rendering, unprofessional, accessibility issues

2. **Mixed Icons and Text**
   - Pros: Flexible
   - Cons: May look inconsistent

3. **Icon Components Only (Lucide)**
   - Pros: Consistent, themeable, accessible
   - Cons: Requires icon library

**Decision:** Icon components only, no emojis in UI

**Rationale:**
- Consistent rendering across platforms
- Themeable (color, size)
- Screen reader support
- Professional appearance
- Better DX with Lucide React

**Consequences:**
- Must include Lucide React library
- Custom icons require SVG creation
- No emoji-based status indicators

---

## ADR-010: Files Maximum 150 Lines

**Date:** 2026-06-16

**Status:** Accepted

**Context:**
Code files can grow arbitrarily large:
- Monolithic files with many responsibilities
- God classes/modules
- Unmanageable long files

**Options Considered:**

1. **No Limit**
   - Pros: Flexible
   - Cons: Files grow without bounds

2. **Soft Limit (200-300 lines)**
   - Pros: Less restrictive
   - Cons: Can still become unwieldy

3. **Hard Limit (150 lines)**
   - Pros: Enforces modularity, forces good design
   - Cons: Requires more files, may be restrictive

**Decision:** 150 line maximum with exceptions

**Exceptions:**
- Auto-generated files
- Complex algorithms requiring context
- Test files (flexible)

**Rationale:**
- Forces modular design
- Easier to review changes
- Clearer function boundaries
- Files are easily skimmable
- Forces decomposition

**Consequences:**
- More files to navigate
- Must think carefully about organization
- Imports may increase
- Clear feature boundaries required

---

## ADR-011: CommonJS Module System for the API and Workspace Packages

**Date:** 2026-06-17

**Status:** Accepted (Phase 00)

**Context:**
The scaffold was half CommonJS / half ESM: `apps/api` compiled to CommonJS but declared `"type": "module"`, used `.js` import extensions everywhere, and the workspace packages were ESM while the API `require()`d them. This produced a class of resolution failures (emitted `require('./x.js')` interpreted as ESM, `ERR_REQUIRE_ESM` on workspace imports) and was the largest single build blocker.

**Decision:** Standardize the API and all `packages/*` on **CommonJS** (`"type": "commonjs"`, `module: commonjs`, `moduleResolution: node`, `noEmit: false`). The MCP server and `apps/sdk` stay ESM (the `@modelcontextprotocol/sdk` is ESM-only; their `.js` imports are correct under `moduleResolution: bundler`). Next.js keeps its own bundler resolution.

**Rationale:** NestJS 10, Prisma, and the Nest ecosystem are CommonJS-first. Standardizing removes the entire ESM/CJS ambiguity at the cost of ESM purity. ESM can be revisited later as a separate, deliberate migration.

**Consequences:** Workspace packages are consumable from the CJS API via `require()`. The `.js` import extensions were stripped from `apps/api/src` (235 sites). An ESM migration is recorded as a future option, not adopted now.

---

## ADR-012: Canonical Frontend, SDK Consolidation, and Scaffold Cleanup

**Date:** 2026-06-17

**Status:** Accepted (Phase 00)

**Context:**
Three ambiguities blocked a clean build: (1) a broken orphan Vite scaffold at the repo root (`src/`) with no entry point competed with `apps/dashboard`; (2) two packages were both named `@fidscript/sdk` (`apps/sdk` axios-based, `packages/sdk` fetch-based), causing arbitrary resolution and a turbo "duplicate workspace" build failure; (3) literal `{src}` / `{dto}` directories from a generator brace-expansion bug littered the tree.

**Decision:**
- `apps/dashboard` (Next.js 15 App Router) is the **one** frontend. The orphan root `src/` is removed (recoverable from commit `f1dd6f2`).
- To unblock the build without prejudicing Phase 16, the duplicate `apps/sdk` is **renamed to `@fidscript/sdk-node`**; `packages/sdk` keeps the canonical `@fidscript/sdk` name. Phase 16 will merge the stronger of the two into one canonical package and delete the other.
- Literal brace-bug directories deleted.

**Rationale:** One frontend removes "which UI?" confusion; the SDK rename is the minimal change that lets turbo build proceed while preserving both implementations for the Phase 16 consolidation decision; the brace dirs were pure generator noise.

**Consequences:** A future Phase 16 task consolidates `@fidscript/sdk-node` + `@fidscript/sdk` into one. Anyone wanting the removed root scaffold retrieves it from `git show f1dd6f2 -- src/`.

---

## ADR-013: Multi-Service Project Architecture (Future)

**Date:** 2026-06-17

**Status:** Accepted (Architectural Direction — not yet implemented)

**Context:**

Today a FIDScript "project" maps to one deployed container. A real-world SaaS, for example, requires multiple concurrent processes:

```
My SaaS
├── Frontend (Next.js)
├── Backend API (Node.js/Fastify)
├── Worker (queue consumer)
└── Cron (scheduled tasks)
```

Under the current model, this is 4 separate FIDScript projects — each with its own Git repo, deployments, env vars, domains. This works but creates operational fragmentation at scale.

**Decision:**

Phase 06+ projects MUST NOT hard-code assumptions that prevent a future "one project, many services" model. Specifically:

1. **A `Project` can have multiple `Deployment` records** — one per service. Each deployment has its own `DeploymentProfile` (web vs worker vs cron). The `Project.slug` is the namespace; individual services are identified by `deployment.version` or a future `serviceName` field.

2. **No single-service hardcoding in `BuildRunnerService`** — the `DeploymentProfile` system (Phase 06) already branches correctly on type. Adding a `serviceName` field to `Deployment` in the future requires no changes to `BuildRunnerService`.

3. **Env vars are project-scoped** — all services in a project share the same `ProjectEnv`. Each service's container receives all env vars; services ignore what they don't need. This avoids per-service secret management complexity.

4. **Routing is `<service>.<slug>.apps.deploy.fidscript.com`** — a service named `api` gets `api.mysaas.apps.deploy.fidscript.com`. The Traefik router key includes `serviceName` (future).

5. **The `Release` concept (future):** a `Release` is a named snapshot of a project's deployments at a point in time. A rollback rolls back to a `Release`, not a single `Deployment`.

**Not decided yet (future phases):**
- Whether a service has its own git repo or all services share one monorepo
- How service-to-service communication works (internal DNS? shared network?)
- Whether workers/cron share the same container or run as separate containers
- How to express service dependencies and startup ordering

**This ADR does NOT require any code changes today.** It exists to prevent architectural decisions that would make the multi-service model impossible to add later without a breaking change.

**Examples of what NOT to do (would violate this ADR):**
- `Deployment.projectSlug` uniqueness that implies one deployment per project
- Hardcoding `project.type` as a single value per project (use deployment-level profile instead)
- Assuming one Traefik route per project
- Coupling env vars to a single deployment's container

---

## ADR-014: Git Repository Is The Canonical Source Of Truth

**Date:** 2026-06-17

**Status:** Accepted

**Context:**
Deployment source can come from many places: GitHub, GitLab, Bitbucket, manual ZIP uploads, CLI pushes. We need a single authoritative source that all other system parts can reference.

**Decision:** The Git commit SHA is the canonical source identifier. FIDScript does not permanently store source archives, git history, or repository snapshots on the VPS.

**What FIDScript stores:**
- Docker image tags (build artifacts, not source)
- Commit SHA and branch name (references, not history)
- Deployment metadata (who deployed, when, from which branch)

**What FIDScript does NOT store on the VPS:**
- Source archives (ZIP, tar)
- Git history (beyond the shallow clone used for building)
- Repository snapshots
- Backup copies of source code

**Source providers (all map to a git commit):**

| Provider | How it works |
|----------|-------------|
| `GitSourceProvider` | Clone git repo → shallow clone of specified SHA → build |
| `GitHubWebhookProvider` | GitHub webhook → trigger build of specified ref |
| `ZipSourceProvider` (future) | Upload ZIP → create ephemeral git commit → treat as git source |
| `CliSourceProvider` (future) | `fidscript deploy` → push to internal git ref → treat as git source |

**Benefits:**
- Unlimited deployment history (GitHub is the source, not the VPS disk)
- Rollback always refers to a git SHA — no orphaned snapshots
- Disk usage stays bounded: only Docker images, not source code
- Simpler backups: only database + image registry need to be backed up

**Rollback always goes through git:**
- Fast rollback (≤2 versions back): re-run existing Docker image tag directly
- Historical rollback (3+ versions back): checkout git SHA → rebuild → deploy

---

## ADR-015: Release-Based Deployment Model

**Date:** 2026-06-17

**Status:** Accepted (Architectural Direction)

**Context:**
`Deployment` is currently doing two jobs: recording a build artifact AND representing a deployable unit. This creates confusion in rollback, dashboard, and monitoring. We need explicit separation.

**Decision:** Introduce the `Release` concept as the layer between a git commit and a deployment.

```
Project
 └─ Release (source snapshot)
     └─ Deployment (running instance of a Release)
```

**Release record fields:**
```typescript
interface Release {
  id: string;
  projectId: string;
  commitSha: string;       // Canonical git SHA
  branch: string;          // e.g. "main"
  imageTag: string;        // e.g. "fidscript/project:v3"
  buildDurationMs: number;
  buildLogs: string;
  createdBy: string;       // userId or system
  createdAt: Date;
}
```

**Deployment record fields (current):**
```typescript
interface Deployment {
  id: string;
  releaseId?: string;      // FK to Release (future)
  projectId: string;
  version: string;         // e.g. "rollback-abc123" or release imageTag
  status: DeploymentStatus;
  deploymentUrl: string;
  // ...
}
```

**Rollback becomes:**
```
Rollback to Release v3
  → Find Release v3 by id
  → docker run fidscript/project:v3  (existing image, no rebuild)
  → Create new Deployment with releaseId = v3.id
```

**Why this matters for the dashboard:**
- A user sees "Release v3 deployed 3 times (active, then 2 rollbacks)" not "3 deployments with confusing version names"
- Rollback history is a Release tree, not a flat deployment list
- Phase 19 (Dashboard) can render release timelines without custom logic

**Not implemented yet (Phase N):** `Release` model does not exist in the schema today. This ADR establishes the direction so `Deployment` is not designed in a way that makes `Release` impossible to add later.

---

## ADR-016: Two-Image Artifact Retention Policy

**Date:** 2026-06-17

**Status:** Accepted

**Context:**
Docker images consume significant disk space. Storing every build forever will eventually fill the VPS disk. We need a retention policy that balances fast rollback capability against storage cost.

**Decision:** Keep at most two Docker images per project on the VPS.

```
Build N     ← Active (current deployment uses this)
Build N-1   ← Rollback target (previous successful deployment)
Build N-2   ← Deleted (older than rollback window)
Build N-3   ← Deleted
...
```

**Retention rules:**
- When a new build succeeds: delete the image for the second-oldest successful deployment (keep current + previous only)
- When a rollback occurs: the rolled-back-to image becomes the active target, no new image is created
- Failed builds: their images are deleted immediately after the failure is recorded

**VPS storage bound:**
```
Max local images per project = 2
Max image size per project = ~2 GB (typical Node.js app with deps)
Max total storage for 50 projects = ~100 GB
```

**Historical rollback (3+ versions back):**
```
User requests: "rollback to deployment from 2 months ago"
  → Lookup deployment's commitSha
  → git checkout <sha> locally
  → docker build -t fidscript/project:<sha> <workspace>
  → docker run (temporary image, deleted after deployment settles)
  → Image becomes the new "previous" target for future fast rollbacks
```

**Implementation notes:**
- Image deletion must run asynchronously (never block the deployment response)
- The cleanup job should run on a cron (Phase 12) or as part of the worker loop
- Images should be tagged with both `<slug>:<version>` AND `<slug>:latest` to enable simple identification

---

## ADR-017: Project Resource Limits

**Date:** 2026-06-17

**Status:** Accepted (Architectural Direction)

**Context:**
A single bad deployment (e.g. infinite loop, memory leak, fork bomb) can consume all CPU, RAM, or disk on a shared VPS, affecting all other projects. We need per-project resource boundaries before multi-tenant production use.

**Decision:** Every project has configurable resource limits enforced at the container and host level.

**Limit categories:**

| Resource | Per-project default | Per-container default | Future hard cap |
|----------|--------------------|-----------------------|-----------------|
| CPU | 1 core | 1 core | 4 cores |
| Memory | 512 MB | 512 MB | 2 GB |
| Storage (images) | 2 GB | — | 10 GB |
| Containers (running) | 3 | — | 10 |
| Deployments (total) | unlimited | — | — |
| Bandwidth (out) | unmeasured | — | — |

**Implementation approach:**
- Container-level: `docker run --memory`, `--cpus` flags (already in place for 512MB/1CPU)
- Project-level: cgroups or a project-specific Docker resource limit applied at deploy time
- Aggregate host limits: daemon-level resource quotas managed by the API service account

**Future enforcement (Phase N):**
- A `ProjectResourceQuota` model in the database
- `ProjectGuard` checks quota before allowing new deployments
- A cleanup job kills containers that exceed their memory limit (OOMKilled)
- Monitoring (Phase 14) tracks per-project resource usage and alerts before hard cap is hit

**This ADR does NOT require code changes today.** It prevents the platform from being designed in a way that makes per-project quotas impossible to add later.

---

## ADR-018: Service-Based Deployment Profiles

**Date:** 2026-06-17

**Status:** Accepted (Architectural Direction)

**Context:**
Today a `Project` has a single `type` (FRONTEND, BACKEND, WORKER, CRON, DOCKER, FUNCTION) and `DeploymentProfile` resolves from that type. But ADR-013 establishes that a Project can have multiple services (frontend, backend, worker, cron). Each service needs its own deployment profile. A project cannot be simultaneously FRONTEND and WORKER.

**Decision:** `DeploymentProfile` resolves from `Service.type`, not `Project.type`. A `Service` model will be introduced (future phase) between `Project` and `Deployment`.

```
Project
  id: string
  slug: string

Service (future)
  id: string
  projectId: string
  name: string         # e.g. "frontend", "api", "worker"
  type: ProjectType    # FRONTEND | BACKEND | WORKER | CRON | FUNCTION | DOCKER
  config: Json         # service-specific config (health check, port, etc.)

Deployment (future)
  id: string
  serviceId: string    # FK to Service (not projectId directly)
  releaseId: string
  status: DeploymentStatus
```

`DeploymentProfile` is determined by `Service.type` at deploy time.

**Current implementation (Phase 06):** `Project.type` is used as a temporary stand-in. This ADR exists so no code is written that would make the `Service` migration impossible. Specifically:
- `DeploymentWorkerService` must NOT hard-code `deployment.project.type` as the final word — it must be possible to look up `service.type` in the future
- `BuildRunnerService.buildAndDeploy()` accepts `projectType` as a parameter — rename to `serviceType` when Service model is introduced (non-breaking)

**This ADR does NOT require any code changes today.**

---

## ADR-019: Artifact Registry Strategy

**Date:** 2026-06-17

**Status:** Accepted (Architectural Direction)

**Context:**
Today Docker images are built and stored locally on the VPS. If the VPS dies, all image history is lost. Rebuilding from git may fail if npm packages have been removed, Docker base images have changed, or the git history has been rewritten. This breaks historical rollback.

**Decision:** A registry is the canonical artifact store. The local VPS image cache is a performance optimization, not the source of truth.

```
Registry (canonical source of truth)
  registry.fidscript.com/<projectSlug>:<imageTag>
  All successful release images are pushed here.
  Retention: all releases (indefinite).

VPS Local Cache (ephemeral performance cache)
  docker images ls (local)
  Max 2 images per project (active + previous, per ADR-016)
  Eviction: automatic after new deployment succeeds
```

**Push flow:**
```
docker build
  → docker tag fidscript/<slug>:<version>
  → docker push registry.fidscript.com/<slug>:<version>
  → docker run from local cache (no push required for deploy)
```

**Pull flow (VPS restart or image evicted):**
```
docker pull registry.fidscript.com/<slug>:<version>
  → docker tag local
  → docker run
```

**Registry implementation options (not yet chosen):**
1. Self-hosted Docker Registry (on the VPS, backed by MinIO) — simple, no external dependency
2. Cloudflare R2 + Docker Registry plugin — no egress costs
3. GitHub Packages / GHCR — free for public repos, free for private with CI

This ADR does NOT require any code changes today. `BuildRunnerService` should be designed so that pushing to a registry is a configuration option, not a hard requirement.

---

## ADR-020: Deployment Concurrency & Project Locks

**Date:** 2026-06-17

**Status:** Accepted

**Context:**
Without concurrency control, a user clicking "Deploy" 5 times creates 5 concurrent builds — consuming CPU, RAM, disk, and potentially corrupting state (deploy B finishing before deploy A starts, but both writing to the same volume).

**Decision:** One active deployment per project at a time. Implemented via `ProjectSettings.activeDeploymentId` as a pessimistic lock.

```
When a new deployment is created:
  IF ProjectSettings.activeDeploymentId IS NULL
    → acquire lock (set to new deploymentId)
    → proceed to QUEUED → BUILDING → DEPLOYING → SUCCESS/FAILED
    → release lock (set to NULL)
  ELSE
    → check if active deployment is still running (QUEUED|BUILDING|DEPLOYING)
    → IF yes: new deployment goes to BLOCKED immediately, event emitted
    → IF no:  acquire lock, proceed

When a BLOCKED deployment sees the lock released:
  → it automatically transitions from BLOCKED → PENDING
  → next worker poll picks it up normally
```

**Schema (Phase 06, implemented now):**
- `ProjectSettings.activeDeploymentId` — the lock (UNIQUE, FK to Deployment)
- `DeploymentStatus.BLOCKED` — deployment is queued but waiting on the lock

**Events (Phase 06, implemented now):**
- `deployments.deployment.blocked` — emitted when a deployment is blocked, includes `blockedBy: <deploymentId>`

**Rollback and concurrency:** Rollback creates a new deployment that competes for the lock normally. Only one rollback runs at a time.

---

## ADR-021: Observability Foundation — OpenTelemetry Everywhere

**Date:** 2026-06-17

**Status:** Accepted (Architectural Direction)

**Context:**
Phase 14 (Monitoring) and Phase 15 (Logging) will need structured traces, metrics, and logs from every service. Retrofitting this later (after 20+ services are running) is expensive and error-prone. We need a platform-wide decision now.

**Decision:** OpenTelemetry (OTel) is the observability substrate for all FIDScript platform services.

```
OpenTelemetry SDK (instrumented in every service)
         ↓
NATS JetStream (exported events, traces via OTLP)
         ↓
Telemetry pipelines:
  Traces  → Jaeger / Tempo (Phase 14)
  Metrics → Prometheus scrape endpoint / OpenTelemetry Collector (Phase 14)
  Logs    → Loki (Phase 15)
```

**Implementation requirements (Phase 06 established):**
- All `DeploymentWorkerService` build/deploy operations emit structured events (already done — `deployments.deployment.*` events)
- All events include: `deploymentId`, `projectId`, `actorId`, `timestamp`, `duration`
- Build logs are stored as plain text strings (attachable to spans as log records)
- Container metrics (CPU, memory, restart count) scraped by Prometheus via cAdvisor or the Docker stats API

**NestJS integration:**
- `@opentelemetry/instrumentation-nestjs` for HTTP trace propagation
- `@opentelemetry/instrumentation-http` for incoming request spans
- Custom `@Injectable` wrappers for Prisma (query spans), NATS (publish spans)

**This ADR does NOT require code changes in Phase 06.** It prevents the platform from being built in a way that makes OTel instrumentation impossible (e.g. non-instrumented HTTP libraries, binary event formats without metadata).

---

## ADR-022: TLS — Traefik ACME with DNS-01 Challenge via Cloudflare

**Date:** 2026-06-19

**Status:** Accepted

**Context:**
The platform needs TLS for:
1. Its own infrastructure: `deploy.fidscript.com`, `storage.fidscript.com`, `api.*` routes
2. Wildcard for user-deployed apps: `*.apps.deploy.fidscript.com`
3. Custom domains attached by users: `app.example.com`

HTTP-01 challenge (Let's Encrypt makes an HTTP request to port 80) cannot issue wildcards and fails behind firewalls. DNS-01 challenge (Let's Encrypt checks a TXT record via DNS) works for wildcards and doesn't need port 80 — but requires a DNS provider API.

**Decision:**
- **DNS-01 as the primary resolver** via Cloudflare API (`letsencrypt-dns`):
  - Wildcards (`*.apps.deploy.fidscript.com`) issued via DNS-01
  - Platform infra routes all use DNS-01
  - Custom domains on the `deploy.fidscript.com` Cloudflare zone use DNS-01
- **HTTP-01 as fallback** for custom domains where the user controls DNS but we don't have API access (`letsencrypt-http`):
  - User adds CNAME pointing to our IP
  - Let's Encrypt reaches port 80 on our VPS
- **Staging ACME** while iterating; flip to production after initial verification
- **Cloudflare token** passed via `CF_API_TOKEN_FILE` (not env var) — stored in Docker secret
- **Two separate ACME storages** (`/acme-dns/` and `/acme-http/`) to avoid resolver conflicts

**Implementation (Phase 07):**
- `DnsProvider` interface — `CloudflareDnsProvider` is the only impl today; others drop in later
- Token from `CLOUDFLARE_API_TOKEN_FILE` — never in environment variables or code
- `SERVER_IP` env var drives A record values
- `installer/traefik/traefik.yml` has both resolvers; `installer/traefik/dynamic.yml` uses `letsencrypt-dns` for platform routes
- `setup-wizard.sh` prompts for Cloudflare token and server IP, writes them as Docker secrets

**Why not cert-manager?** Kubernetes-native; adds operational complexity inappropriate for a single-VPS self-hosted platform. Traefik ACME is sufficient.

---

## ADR-023: Never Await Infinite Worker Loops in NestJS Init Hooks

**Date:** 2026-06-19

**Status:** Accepted

**Context:**
During Phase 12 bring-up, the API container booted all modules but `app.listen()` never opened port 3001 — the process hung silently with no error. Root cause: `QueuesModule.onModuleInit` did `await this.worker.start(nc)`, and `start()` → `bootAllQueues()` → `Promise.allSettled(queues.map(q => startQueueWorker(...)))`, where each `startQueueWorker` enters an infinite `while (!cancelled)` pull-consume loop. Awaiting an infinite loop means the promise never resolves.

NestJS lifecycle requires **every** `onModuleInit` (and `onApplicationBootstrap`) hook to resolve before `app.listen()` internally calls `httpServer.listen()` and opens the port. One hanging init hook blocks the entire HTTP server from starting — and because the hang is inside `app.listen()`, the failure is invisible (no error, port just never binds).

**Decision:**
- **Long-running loops (queue workers, pollers, consumers) must be fire-and-forget** — started detached from the bootstrap path. Kick them off with `void promise.catch(log)` (or an un-awaited call), never `await`.
- The bootstrap hook may `await` only finite setup (DB reads, connection establishment, `ensureConsumer`). The infinite runtime loop that follows must not be awaited.
- This applies to `onModuleInit`, `onApplicationBootstrap`, and any provider factory awaited during `app.init()`.

**Implementation (Phase 11/12):**
- `QueueWorkerService.bootAllQueues` now fires each `startQueueWorker` detached with a `.catch` error log, instead of `Promise.allSettled` over the infinite loops.
- Verified: API boots in ~2s, port 3001 binds, `/api/v1/health` returns 200, and the worker loops continue running in the background.

**Why not run workers in a separate process?** That is a valid future option (a dedicated worker pod), but on a single-VPS deployment the API process hosting the workers is acceptable **as long as** the loops never block bootstrap. This ADR codifies that boundary.

---

## ADR-024: Attach the Socket.IO Adapter via IoAdapter, Not on the @WebSocketServer Object

**Date:** 2026-06-19  |  **Status:** Accepted  |  **Phase:** 13

**Context.** Phase 13 needs `@socket.io/redis-adapter` so `server.to(room).emit(...)` reaches sockets on any API instance (multi-node correctness + restart-safe presence). The first attempt attached the adapter inside the gateway's `afterInit` by calling `this.server.adapter(createAdapter(...))` on the `@WebSocketServer()`-injected object.

**Decision.** Attach the adapter via a `RedisIoAdapter` subclass of `IoAdapter`, set on the application with `app.useWebSocketAdapter(redisIoAdapter)` in `main.ts` (overriding `createIOServer` to call `server.adapter(...)`).

**Rationale.** For a namespaced gateway (`@WebSocketGateway({ namespace: '/realtime' })`), NestJS injects the socket.io **Namespace**, not the root **Server**, into `@WebSocketServer()`. A Namespace has no `.of()` and its `.adapter()` wiring differs — calling `this.server.of('/realtime')` throws `server.of is not a function`, and `this.server.adapter(...)` silently mis-targets. The `IoAdapter.createIOServer` path constructs the real Server and sets the adapter on it before any namespace is handed out, which is the only reliable point. This is the pattern the NestJS docs document.

**Consequences.** The adapter must be configured in `main.ts` (bootstrap), not in the gateway. The `RedisIoAdapter` connects its pub/sub clients up front (`connectToRedis`, best-effort + try/catch) and degrades to a single-instance gateway if Redis is unavailable — it must never block bootstrap (consistent with ADR-023). The same Namespace-not-Server fact also governs fan-out: `broadcastToProject` calls `this.server.to(room).emit(...)` (the Namespace), never `.of('/realtime')`.

---

## ADR-025: EventEmitterModule Must Be Created with `wildcard: true`

**Date:** 2026-06-19  |  **Status:** Accepted  |  **Phase:** 13 (fixes Phase 02)

**Context.** `@nestjs/event-emitter`'s `EventEmitter2` only interprets wildcard/pattern listeners (`@OnEvent('**')`, `@OnEvent('deployments.*')`) when the emitter is constructed with `wildcard: true`. The events module was calling `EventEmitterModule.forRoot()` with **no options**, leaving wildcards off (the default). As a result every `@OnEvent('**')` consumer silently matched nothing: `AuditEventConsumer` wrote 0 rows to `platform.events`, and the Phase 13 realtime bridge received no events — despite events being published to NATS and re-emitted by the durable consumer. The bug was invisible because emit/publish worked; only the consumer side was dead.

**Decision.** `EventEmitterModule.forRoot({ wildcard: true })`. This mirrors the options `EventService` already used for its own private emitter. The default delimiter (`.`) matches the platform's dotted event names (`projects.project.updated`), so exact-match `@OnEvent('foo.bar')` listeners continue to work alongside `@OnEvent('**')`.

**Consequences.** All wildcard consumers now fire (audit recording, realtime fan-out). Future consumers may use `@OnEvent('**')` or namespace patterns freely. Exact-match listeners are unaffected. This is a one-line fix that retroactively makes the Phase 02 "real consumers" claim true.

---

## ADR-026: Socket Auth Reads the JWT `sub` Claim

**Date:** 2026-06-19  |  **Status:** Accepted  |  **Phase:** 13

**Context.** The platform access JWT (`AuthSessionService.buildAuthResponse`) carries the user id in the standard `sub` claim: `{ sub, email, role, type }`. The realtime `TokenService.validateJwt` was decoding `decoded.userId` — a claim that does not exist — so it returned an object with `userId: undefined`. The connection still succeeded (the signature verified), but every downstream socket action that needed a user id (channel membership, presence, project subscription) operated on `undefined`, causing e.g. Prisma compound-key lookups to throw.

**Decision.** Read `decoded.sub` (falling back to `decoded.userId` only for non-platform tokens), and reject the connection if no user id is present.

**Consequences.** Realtime socket actions now have a correct `userId`. This aligns realtime auth with the rest of the platform (which decodes `sub`). Any future JWT-claim consumer must read `sub`, not a bespoke `userId` field.

---

## ADR-027: pgbouncer.ini Must Resolve `host=postgres` Dynamically at Container Startup

**Date:** 2026-06-19  |  **Status:** Accepted  |  **Phase:** 01

**Context.** The `pgbouncer.ini` mounted into the `fidscript_pgbouncer` container used `host=postgres` (the Docker service name) as the backend connection string. Stalwart's c-ares resolver cannot resolve single-label Docker DNS names — it returns `Misformatted domain name` and drops connections silently, causing the entire API to fail with a database connection error whenever pgbouncer tried to connect to postgres. A hardcoded literal IP would work but breaks on every `docker compose up -d --force-recreate postgres` (postgres IP changes on recreate), silently taking down the platform.

**Decision.** The pgbouncer container entrypoint now runs a shell wrapper that:
1. Resolves `postgres` to its current IP via `getent hosts postgres` (system resolver, not c-ares) at container startup
2. Substitutes `host=<resolved IP>` into a temp copy of `pgbouncer.ini` before launching pgbouncer
3. Uses `exec /opt/pgbouncer/pgbouncer /tmp/pgbouncer.ini` so pgbouncer inherits PID 1

This survives postgres recreates (new IP re-resolved on each pgbouncer restart), avoids hardcoding an IP that would go stale, and works because `pgbouncer.ini` is a plain text file we control.

**Implementation.** `installer/docker/docker-compose.yml` — pgbouncer `entrypoint` changed from `["/opt/pgbouncer/pgbouncer"]` to `["/bin/sh", "-c"]` with a `command` script that does the `sed` substitution and `exec`.

**Why not `depends_on` with a fixed IP?** Docker's `depends_on` only waits for the container to start, not for its IP to be stable. The IP is assigned by the Docker daemon at container start and changes on every recreate.

---

## ADR-028: Platform Bootstrap Values Derived from `$PLATFORM_DOMAIN` at Install Time

**Date:** 2026-06-19  |  **Status:** Accepted  |  **Phase:** 09 (Email)

**Context.** Stalwart's config.toml template had several hardcoded values for the `deploy.fidscript.com` domain: the HELO hostname, the server hostname, the submission hostname, the JMAP advertised URL, and the TLS certificate paths. The installer was setting `PLATFORM_DOMAIN=deploy.fidscript.com` in `api.env` but nowhere else, meaning changing the domain would require editing multiple files. Additionally, several Docker service hostnames (`STALWART_HOST`, `MINIO_HOST`, `REDIS_HOST`, `NATS_HOST`) were scattered across env files inconsistently — some using the short Docker service name, some using the explicit docker-network FQDN.

**Decision.** All platform domain values are now derived from `$PLATFORM_DOMAIN` at install time by `setup-wizard.sh`:
- `server.hostname = mail.${PLATFORM_DOMAIN}`
- `submission.host = mail.${PLATFORM_DOMAIN}`
- `jmap.url = https://jmap.${PLATFORM_DOMAIN}/jmap/`
- `tls.cert = /etc/stalwart/tls/${PLATFORM_DOMAIN}.pem`
- `tls.key = /etc/stalwart/tls/${PLATFORM_DOMAIN}.key`
- `logger.output = /var/log/stalwart/${PLATFORM_DOMAIN}.txt`

And Docker internal hostnames are uniformly `fidscript_<service>` (the Docker service name) across all compose services, removing the ambiguity of short-name vs FQDN for internal container-to-container communication.

**Consequences.** A fresh install of the platform with a different domain produces a fully wired config without manual edits. The HELO/PTR alignment (mail.$DOMAIN) is now enforced consistently.

---

## ADR-029: Self-Hosted First (No SaaS, No Billing)

**Date:** 2026-06-20 · **Status:** Accepted

**Context.** The BaaS market is dominated by hosted SaaS (Supabase, Firebase, Convex). FIDScript
could be offered as a hosted product. The question is whether to build for self-hosting first
or hosted-first.

**Options considered:**
1. **Hosted SaaS first** — multi-tenant cloud, billing, usage metering, support.
2. **Self-hosted first** — the user installs on their own VPS; owns the data, the box, the bill.
3. **Both, simultaneously.**

**Decision:** Self-hosted first. No SaaS hosting, no billing, no usage metering in the platform.

**Rationale.**
- **Sovereignty is the product.** The user's value proposition is "your data, your box, no
  vendor lock-in." A hosted version would undercut the thesis (`docs/product/platform-philosophy.md`).
- **No billing = simpler platform.** Billing, metering, plan limits, and dunning are large
  cross-cutting systems with no place in an operator's control plane. Their absence is a
  feature, not a gap.
- **One install path.** The `curl … | bash` installer is the only onboarding. A hosted version
  would fork that path and double the test surface.
- **The infrastructure is already single-tenant by design** (one VPS, one domain, Docker
  Compose). A hosted multi-tenant rewrite would be a different product.

**Consequences.**
- No billing, metering, or plan-limit code exists or will exist in F02–F11.
- The dashboard has no "upgrade," "plan," or "usage quota" UI.
- A future hosted offering, if ever pursued, is a separate product built on a hardened
  self-hosted core — not a fork of it.

---

## ADR-030: Documentation-First Development (Specs Before Code)

**Date:** 2026-06-20 · **Status:** Accepted

**Context.** The hardening reset (`docs/AUDIT.md`) was caused by a single failure mode: status
said "23 phases complete" while roughly three-quarters was unbuilt scaffolding. The docs
described an intended system, not the real one, and nothing was ever verified.

**Options considered:**
1. **Code-first, doc-after** (the prior model) — build, then document. Drift is inevitable.
2. **Doc-first** — write the complete spec, review it, approve it, *then* implement against it.
3. **No specs** — trust the implementer.

**Decision:** Documentation-first. No frontend feature is built until its spec
(`docs/phases/frontend/fNN-*.md` + screen + component specs) is complete and approved. The
blueprint was validated and frozen 2026-06-20 (Phase D0, `docs/VALIDATION.md`); it is now the
**contract**, not evolving notes (`CLAUDE.md` rule 16).

**Rationale.**
- **Prevents the recurrence.** A doc that lies is worse than no doc. Doc-first + a Definition
  of Done (`docs/DEFINITION_OF_DONE.md`) makes "marked complete but unbuilt" structurally
  impossible — the spec is the acceptance contract.
- **Agents can continue the work.** A complete blueprint lets any engineer or LLM pick up a
  phase without prior conversation context. The spec + inventory + prereq registry + roadmap
  are self-sufficient.
- **Forces decisions early.** Writing the spec surfaces backend gaps (the `PREREQ-*` registry)
  *before* implementation, not during it.

**Consequences.**
- Implementation is gated on spec completeness + approval (rule 14).
- Code conforms to the doc; when reality shifts, the doc is fixed *first* and reviewed, then
  the code follows (rule 16).
- Doc maintenance is a first-class deliverable, tracked in the Definition of Done.

---

## ADR-031: The Dashboard Is an Operating System (Control Plane, Not Visualization)

**Date:** 2026-06-20 · **Status:** Accepted

**Context.** A BaaS dashboard can be built two ways: as a **visualization layer** (pretty
read-only charts and tables over data) or as an **operator's control plane** (the console from
which you actually run the backend — create, deploy, stop, rotate, intervene).

**Options considered:**
1. **Visualization-first** — graphs, summaries, status pages; actions are secondary or absent.
2. **Control-plane** — every screen is the operator's console for one or more real Prisma
   entities; the buttons call real endpoints; the chrome reflects the real role.

**Decision:** Control plane. Every screen renders **real backend entities** with their actual
fields, enables **real inventory endpoints**, respects the **real auth context** (owner /
admin / developer / viewer each see different chrome), and is **honest about backend gaps**
(greyed, never faked). (`CLAUDE.md` rule 15, `docs/product/screens/index.md`.)

**Rationale.**
- **The user is an operator, not an audience.** They install FIDScript to *run* a backend, not
  to watch one. A screen that can't stop a stuck deployment or rotate a leaked credential is
  decorative.
- **Honesty over polish.** Greying `php`/`go`/`rust` runtimes or `slack`/`pagerduty` channels
  with "not yet available" builds trust; faking them (a button that does nothing, or invented
  columns) recreates the audit's core defect.
- **Per-role rendering is the contract.** A viewer doesn't just lose a button — the whole page
  reflects read-only. The server re-validates; the UI is the honest hint.

**Consequences.**
- No mock data anywhere in the dashboard. Every list/detail is backed by a real endpoint.
- Unimplemented capabilities are greyed with tooltips, never hidden-and-pretended.
- Screen specs must name the Prisma entity + the inventory IDs they render (D0.1 enforces this).

---

## ADR-032: Authentication Strategy — Magic-Code + Password, No OAuth in the Console

**Date:** 2026-06-20 · **Status:** Accepted (resolves the prior "Authentication strategy — Pending")

**Context.** Platform authentication (the operator logging into the dashboard) needs a method.
BaaS competitors offer OAuth (Google/GitHub), password, and magic-link. FIDScript also hosts a
*BaaS auth* surface (per-project end-user auth) which is a separate concern.

**Options considered:**
1. **OAuth (Google/GitHub) for platform login.**
2. **Password + magic-link (email URL).**
3. **Password + magic-code (6-digit OTP).**
4. **Passwordless (code only).**

**Decision:** Password + **magic-code** (6-digit OTP delivered via Stalwart) for platform auth.
**No OAuth in the platform console.** BaaS per-project OAuth (Google/GitHub for end-users) is a
separate, scoped feature (`APPAUTH-*`), not platform login.

**Rationale.**
- **Magic-code > magic-link.** A 6-digit OTP typed into the same screen is lower-friction than
  clicking an emailed link, survives more email clients, and is easier to rate-limit and
  attempt-limit. The existing magic-link path is broken (token never emailed, never expires —
  `docs/backend-prerequisites.md` → `PREREQ-AUTH-3`); magic-code replaces it.
- **Password retained.** Operators want a password fallback; magic-code alone is too slow for
  daily use. Password + magic-code tab covers both.
- **No OAuth for the operator.** Platform login is for the person who owns the VPS; tying it to
  a Google/GitHub account adds an external dependency and a recovery failure mode for a
  self-hosted product. (BaaS OAuth for *their end-users* is different and is supported per-project.)
- **Deliverability is solved.** Phase 09 verified Stalwart delivers to real inboxes, so the
  magic-code email actually arrives.

**Consequences.**
- F02 ships password + magic-code tabs; the magic-link path is removed.
- No "Sign in with Google/GitHub" button in the console.
- The broken logout/refresh/JWT machinery is fixed first (`PREREQ-AUTH-5/6/7`) — auth
  correctness is Phase A, before any login UI.

---

## ADR-033: One-Domain Configuration (Fan-Out, Not Multi-Domain Wiring)

**Date:** 2026-06-20 · **Status:** Accepted

**Context.** A self-hosted platform needs DNS + TLS for: the dashboard, user deployments
(`*.apps.<domain>`), email (MX/DKIM/SPF/DMARC), and the API. The user could be asked to
configure each, or the platform could derive all of them from a single input.

**Options considered:**
1. **Per-service domain configuration** — the user sets the dashboard domain, the apps domain,
   the email domain, the API domain, separately.
2. **One domain, derived fan-out** — the user provides one `PLATFORM_DOMAIN` at install; every
   subdomain and DNS record is derived from it.

**Decision:** One-domain fan-out. The installer takes `PLATFORM_DOMAIN`; Traefik, the wildcard
apps cert, Stalwart's mail domain, and the API all derive from it (ADR-028).

**Rationale.**
- **Configure once** (principle 1). One input, everything wired. This is the core product
  thesis: a fresh VPS to a running platform in one `curl | bash`.
- **Fewer footguns.** Mismatched domains (dashboard on A, email on B, apps on C) are a support
  nightmare and an TLS/DNS disaster. Derivation eliminates the class of error.
- **The installer already does it.** `setup-wizard.sh` + ADR-028 derive every internal hostname
  from `$PLATFORM_DOMAIN`; this ADR codifies that as a product decision, not an implementation
  detail.

**Consequences.**
- The installer asks for exactly one domain.
- Custom domains per-deployment are still supported (F11 Domains) — that's *additional* routing
  on top of the derived `*.apps.<domain>`, not a replacement for it.
- Multi-domain platform installs (dashboard on one domain, email on another) are not supported
  and won't be; the complexity isn't worth it for a self-hosted product.

---

## ADR-034: Hide Advanced Configuration (Configure-Once / Beginner-First)

**Date:** 2026-06-20 · **Status:** Accepted

**Context.** A BaaS has many knobs: build strategy, memory/timeout limits, retry policies,
retention, connection pools, cron expressions, DNS modes. Exposing all of them by default
overwhelms a first-time user; hiding all of them frustrates a power user.

**Options considered:**
1. **Expose everything** — every field visible, power-user-friendly, beginner-hostile.
2. **Hide everything behind "smart defaults"** — no advanced access, power-user-hostile.
3. **Sensible defaults + Advanced disclosure** — the 20% a beginner needs is visible; the 80%
   a power user sometimes needs is behind an "Advanced" toggle.

**Decision:** Defaults + Advanced disclosure. Every form ships with safe, beginner-friendly
defaults; rare or expert fields live behind an "Advanced" disclosure. (`docs/product/`
user-experience-spec §"Sensible defaults"; `CLAUDE.md` principle "Beginner first".)

**Rationale.**
- **Beginner first** (principle 2). The common case is one click. "Create project" is name +
  type + create; build strategy defaults to `dockerfile`.
- **Power users aren't punished.** Advanced is *collapsed*, not removed. A backend dev can
  override the Dockerfile path, pin a commit, or tune retry policy — they just open the
  disclosure.
- **Greying > hiding for unimplemented.** Advanced options that aren't built yet are greyed
  with "not yet available," not hidden — the user should know they exist in the spec.

**Consequences.**
- Every create-flow modal has an "Advanced" disclosure for the rare fields.
- Defaults are platform-defined and locked; the user never configures the design (ADR-adjacent
  to F00: tokens are immutable).
- The single-screen test (UX §16) gates this: the beginner's primary task must complete
  without opening Advanced.

---

## ADR-035: Docker Compose Over Kubernetes (Single-VPS Deployment Model)

**Date:** 2026-06-20 · **Status:** Accepted (codifies the model behind ADR-005/015/018)

**Context.** The platform must run on a single VPS. The orchestration choice determines the
install path, the resource floor, and the operations story.

**Options considered:**
1. **Kubernetes (k3s/k8s).**
2. **Docker Compose.**
3. **Bare processes / systemd.**

**Decision:** Docker Compose (single node), with BuildKit-built images + Traefik as the edge
(ADR-005 Dockerfile-First, ADR-022 Traefik ACME). Deployments use Docker-out-of-Docker
(`execFileSync('docker', …)`, no shell) with a two-image retention policy (ADR-016) and
project-level concurrency locks (ADR-020).

**Rationale.**
- **Single VPS is the target.** Kubernetes is operationally heavy (control plane, etcd, CNI)
  and pointless on one node. Compose is the right-sized tool.
- **The installer proves it.** `curl … | bash` brings up Postgres, Redis, NATS, MinIO,
  Stalwart, Traefik, the API, and the dashboard on one VPS — verified end-to-end.
- **Docker-out-of-Docker keeps deployments isolated** without a separate cluster; each user
  deployment is a container the API manages via the Docker CLI.
- **Release-based, not live-edit** (ADR-015). Immutable image tags + rollback (ADR-016) give
  production-grade deploy semantics without k8s rolling-update machinery.

**Consequences.**
- No Kubernetes manifests, no Helm charts, no kubectl. Operations are `docker compose`.
- Multi-node / HA is out of scope (ADR-013 sketches a future multi-service architecture but it
  is explicitly future).
- The deployment engine's correctness depends on the Docker CLI being available inside the API
  container (proven this session — task #26).

---

## Mapping the original "why" questions to ADRs

For future contributors asking "why was this designed this way?":

| Question | Answered by |
|---|---|
| Why Magic Code instead of OAuth? | ADR-032 |
| Why Docker Compose instead of Kubernetes? | ADR-035 |
| Why one-domain configuration? | ADR-033 (+ ADR-028) |
| Why no billing? | ADR-029 |
| Why documentation-first? | ADR-030 |
| Why hide advanced configuration? | ADR-034 |
| Why self-hosted first? | ADR-029 |
| Why an operating-system dashboard? | ADR-031 |
| Why Stalwart for email? | ADR-002 |
| Why NATS for events/queues/realtime? | ADR-001 |
| Why the release/deployment model? | ADR-005, ADR-015, ADR-016, ADR-018, ADR-035 |

---

## Future ADRs Needed

These decisions are pending and will be documented as ADRs:

| Topic | Status |
|-------|--------|
| Queue implementation details | Pending |
| Monitoring/observability stack | Pending (ADR-021 sketches OpenTelemetry) |
| CI/CD approach | Pending |
| SDK language priorities | Pending |
| MCP server implementation | Pending |
| Backup strategy | Pending |

---

## ADR-036: Twenty Design Principles for FIDScript's Frontend (Workspace-First UX)

**Status:** Accepted — 2026-06-24
**Context:** Frontend blueprint is frozen. Before F02–F11 implementation resumes, the
design intent captured in the user's strategic design note is locked here so every spec,
every screen, every component inherits it.

**Decision:** FIDScript's frontend follows these twenty principles as non-negotiable UX
contracts. Every screen spec, component spec, and review must hold itself against them.
Each principle is one rung on the same ladder; together they describe the
"workspace, not CRUD table" feel.

### The principles

1. **Workspace, not CRUD table** — Projects page = a workspace. Each card answers: What is it? Is it healthy? Can I open it? Nothing else.
2. **Project dashboard feels like entering a server** — Breadcrumb: Projects / <project> / <section>. Left = sidebar nav. Right = operational content. Attention never split.
3. **No empty pages** — Every module with zero state shows a "next action" CTA ("Enable Prometheus", "Create Mailbox"), never a "Nothing here." Dead ends are bugs.
4. **Progressive disclosure** — Primary fields visible. Advanced (charset, extensions, replication, collation, etc.) tucked under a `▼ Advanced` disclosure. 90% never open it.
5. **One hero action per page** — Projects → "New Project". Deployments → "Deploy". Email → "Create Mailbox". No hunting.
6. **Never expose IDs** — `my-api`, not `7f9d10e86`. IDs in APIs only; users see slugs/names.
7. **Universal status colors** — Green=healthy, blue=running, yellow=pending, orange=warning, red=failed, gray=stopped. Never invented colors.
8. **Search-first, not filter-first** — Every list page starts with `Search…`. 300 deployments / 90 databases / 150 domains must remain navigable.
9. **Keyboard-first** — Arrow keys, Enter, Delete, Escape, Ctrl+K. The platform must be navigable without a mouse.
10. **Global Command Palette (Ctrl+K)** — Highest ROI feature. Create deployment / Create project / Restart nginx / Open logs / Search domain / Invite member. Once adopted, navigation fades.
11. **Real-time everywhere** — No refresh buttons. Deployment finishes → card updates. Container crashes → sidebar updates. Email arrives → inbox updates. Logs stream live.
12. **Right panel over modal overload** — Slide-in panels preserve context. Modals stack and lose the user's place. Edit/delete = right panel.
13. **Activity timeline per project** — One chronological feed: deployments, DB creates, DNS updates, mailbox creates, bucket deletes, SSL renewals. Cross-service, ordered.
14. **Deep-linkable everywhere** — `/projects/my-api/deployments`, `/projects/my-api/storage`, `/projects/my-api/email`. No hidden UI state.
15. **Skeletons, not spinners** — Loading states that mirror the final layout. The page must never jump.
16. **Onboarding overlay on first login** — 4-step path: Create project → Deploy app → Connect domain → Enable email. Progress bar `■■■■□□□□`.
17. **No dashboard clutter** — Default view = deployments + health + recent activity + resource usage. Advanced metrics live under Monitoring.
18. **Standardized page layout** — Title / Description / Primary action / divider / content / secondary actions. Same skeleton on every module.
19. **One-click everything** — Every action audited against "can this be one click?" Restart, redeploy, rollback, open logs, view metrics.
20. **Scale from day one** — 1 project / 50 / 500 all feel fast. Virtualization, lazy loading, pagination, background fetching where they pay off.

### The Workspace Overview — landing page after picking a project

Distinct enough to call out: opening a project does NOT drop users into Deployments by
default. Instead they land on a **Workspace Overview** that gives situational awareness:

```
<Project name>     🟢 Healthy

Deployments      12
Services          8
Databases         3
Domains           4
Mailboxes        15

Latest Deployment
2 minutes ago

Recent Activity
• Deployment succeeded
• SSL certificate renewed
• Database backup completed

Quick Actions
[Deploy] [View Logs] [Restart Service] [Add Domain]
```

This is the spec for the F05 (Project Dashboard Shell) hero screen. The 14 sidebar items
remain; the overview is the default `/projects/[id]` route and Deployments becomes
`/projects/[id]/deployments`.

### Consequences

- **Spec updates required:** `docs/product/user-experience-spec.md` must adopt these
  principles. `docs/product/screens/index.md` must add a `WORKSPACE_OVERVIEW` screen
  entry per project. `docs/phases/frontend/f05-*.md` (when written) must spec the
  Workspace Overview as the landing route.
- **Component additions:** SearchInput (input + keybinding-aware), CommandPalette
  (Ctrl+K), ActivityTimeline, Skeleton primitives, RightPanel slide-in.
- **Existing partial coverage:** principle 6 (no IDs) and principle 7 (status colors)
  are partially honored by the current ProjectCard; principle 12 (panels over modals)
  will require refactoring the create/edit/delete modals on the projects page into a
  right panel — record as a follow-up.
- **Anti-patterns banned:** filter-first lists, modal stacks, "Nothing here." dead ends,
  status colors outside the universal palette, ID exposure in the chrome.

**Why:** The design note from 2026-06-24 crystallized the *feel* of the platform.
Capturing it as an ADR means any future contributor — agent or human — has a single
reference when deciding whether a screen is right.
