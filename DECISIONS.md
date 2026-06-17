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

## ADR-005: Buildpack-First Deployment Strategy

**Date:** 2026-06-16

**Status:** Accepted

**Context:**
The platform needs deployment automation for:
- Node.js applications
- Python applications
- PHP applications
- Static sites

**Options Considered:**

1. **Dockerfile Required**
   - Pros: Full control, predictable builds
   - Cons: Users must write Dockerfiles

2. **Buildpacks Only**
   - Pros: Zero config for standard apps
   - Cons: Limited customization

3. **Buildpack-First, Dockerfile-Fallback**
   - Pros: Best developer experience, escape hatch
   - Cons: Two systems to maintain

**Decision:** Buildpack-first with Dockerfile fallback

**Rationale:**
- Most projects need zero configuration
- 80/20 rule: standard stacks cover most use cases
- Dockerfile fallback for edge cases
- Auto-detection of runtime and dependencies
- No buildpack knowledge required for standard apps

**Consequences:**
- Must support multiple buildpack families
- Dockerfile detection logic needed
- Build cache strategy important

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

## Future ADRs Needed

These decisions are pending and will be documented as ADRs:

| Topic | Status |
|-------|--------|
| Authentication strategy (JWT vs Session) | Pending |
| Queue implementation details | Pending |
| Monitoring/observability stack | Pending |
| CI/CD approach | Pending |
| SDK language priorities | Pending |
| MCP server implementation | Pending |
| Backup strategy | Pending |
| Multi-tenancy approach | Pending |
