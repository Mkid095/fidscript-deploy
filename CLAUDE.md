# CLAUDE.md

FIDScript Deploy — AI Development Constitution

> **Operating mode (from 2026-06-16):** Hardening, not feature-chasing. The platform is being rebuilt
> dependency-first from Phase 0, with every phase verified on the VPS before advancing. See
> `docs/AUDIT.md` for why.
>
> **Current focus: documentation-first phase (paused implementation).** As of 2026-06-20, the backend
> is end-to-end working (deployments + functions proven on the VPS). The frontend is at a **complete
> documentation blueprint** but only a thin implementation. The rule now is
> **Documentation → Review → Approval → Implementation** (rule 14). No new frontend feature is built
> until its spec is complete and approved. The blueprint lives in `docs/product/` and
> `docs/phases/frontend/`. Status: `AGENT_STATUS.md`.
>
> **⚠️ The blueprint is FROZEN (2026-06-20, Phase D0).** The documentation validation pass is complete
> (`docs/VALIDATION.md`): 0 broken cross-references; 13/16 features buildable now; ~89% backend
> ready. From this point the documentation is the **project's contract**, not evolving notes — see
> **rule 16 (Documentation Freeze)** below. The canonical implementation order is
> `docs/IMPLEMENTATION_ROADMAP.md`; every blocker is registered in `docs/backend-prerequisites.md`
> (9 🟥 Open items — close AUTH first, then F02 as the first vertical slice).

---

## Navigation

### Start here

| Need | Go To |
|------|-------|
| **Start here — orient any agent/human (read first)** | `docs/START_HERE.md` |
| **Current phase and status** (what's done / what's next) | `AGENT_STATUS.md` |
| **⚠️ Before implementing: read the validation + roadmap** | `docs/VALIDATION.md`, `docs/IMPLEMENTATION_ROADMAP.md`, `docs/backend-prerequisites.md` |
| **Project documentation map** (every doc in one place) | [below](#project-documentation-map) |
| Why we reset + current honest state | `docs/AUDIT.md` |
| Backend phase roadmap + verification rubric | `docs/phases/README.md` |

### Frontend (dashboard + public site) — the **current focus**

| Need | Go To |
|------|-------|
| **Frontend phase roadmap** (F00–F11) | `docs/phases/frontend/README.md` |
| **Spec template** (every phase fills this) | `docs/phases/frontend/_template.md` |
| **Backend inventory** (every endpoint; specs cross-reference these IDs) | `docs/phases/frontend/backend/index.md` (cluster files alongside) |
| **Product philosophy** (north star + 5 principles) | `docs/product/platform-philosophy.md` |
| **User journeys** (6 personas, full flows) | `docs/product/user-journeys.md` |
| **Navigation architecture** (sidebar + global IA) | `docs/product/navigation.md` |
| **Global UX spec** (tactical UX rules) | `docs/product/user-experience-spec.md` |
| **Service specs** (12 services — the source of truth for each backend subsystem) | `docs/product/services/` |
| **Screen inventory** (master list; every screen = operator interface to a Prisma entity) | `docs/product/screens/index.md` |
| **Component catalog** (reusable registry) | `docs/product/components/index.md` |

### Backend (phases 00–23, all verified)

| Need | Go To |
|------|-------|
| Phase docs (00–23) | `docs/phases/phase-NN.md` |
| Architecture decisions | `DECISIONS.md` |
| System architecture (⚠ aspirational — pre-hardening target) | `ARCHITECTURE.md` |
| All services overview (⚠ aspirational — pre-hardening) | `docs/SERVICE_CATALOG.md` |
| Complete file inventory | `PROJECT_INDEX.md` |

> **⚠ The old design/spec docs (`ARCHITECTURE.md`, `docs/PRODUCT_REQUIREMENTS.md`, `docs/*_SPEC.md`,
> the old `docs/services/*.md`) were written *before* the hardening reset. They describe the intended
> system, not the present. The **authoritative** product docs are now in `docs/product/`. Always
> cross-check against `docs/AUDIT.md` and the current phase doc before assuming a feature works.

---

## The operating-system framing (read first, applies to every frontend doc)

FIDScript is an **operator's control plane for backend services**, not a visualization dashboard.
Every screen is the operator's console for one or more **real Prisma entities** (`Project`,
`Deployment`, `Release`, `Function`, `Database`, `Queue`, `CronJob`, `EmailDomain`, `StorageBucket`,
etc.) and must:

1. **Render the real backend entity with its actual fields** — never invented columns, never
   faked state. The screen inventory (`docs/product/screens/index.md`) names the entities and the
   fields each screen shows.
2. **Enable real operations** — the buttons call the **real inventory endpoints** (with stable IDs
   like `DEPL-02`, `DB-01`, `MAIL-21`), no mock data. The backend inventory
   (`docs/phases/frontend/backend/`) is the source of truth.
3. **Respect the real auth context** — every screen renders differently for `owner / admin /
   developer / viewer`. A viewer does not just lose a button; the chrome around the page reflects
   the role. The server is the source of truth (re-validates), but the UI is the honest hint.
4. **Be honest about gaps** — unimplemented runtimes, providers, channels, and endpoints (e.g.
   `php|go|rust` runtimes, `slack|pagerduty` channels, Stalwart suspend limitation) are greyed in the
   UI with "not yet available," never faked. The audit's honest findings are documented in
   `docs/phases/frontend/backend/index.md` and propagated to the service specs.

If a doc (philosophy, journey, service spec, screen, component, phase spec) does not reflect this
framing, it is wrong. Fix the doc, don't work around it.

---

## How an agent should work (read this)

**Research before you implement.** These docs — and your own training — are a
snapshot in time. Library APIs, versions, and best-practice patterns change
(NestJS, Prisma, NATS, Stalwart, Traefik, Next.js, the MCP SDK, Docker, etc.).
Before implementing anything non-trivial, **use the tools available to you to
confirm the current, correct approach** rather than trusting memory or a doc
written months ago:

- **Library / framework docs & exact APIs** → the **Context7** MCP
  (`resolve-library-id`, then `query-docs`) for current docs.
- **"How do I…" / current best practices** → **web search** (Brave / Firecrawl);
  read authoritative/official sources, not stale blog posts.
- **A specific page** → fetch it and read it.
- **This repo's own state** → Read/Grep the actual files (a doc's "Current State"
  can lag the code).

Confirm against the source, *then* implement. If the correct approach differs
from what a phase doc says, follow the source and **update the doc** (below).

**The docs are living, not fixed.** The phase docs, `docs/AUDIT.md`, the
"Files you'll touch" precision maps, and `AGENT_STATUS.md` describe reality *as
of the last commit*. As you implement, reality shifts — keep them honest **in
the same commit** as the code change:

- Refactored/removed/added a module → update that phase doc's *Current State* and
  *Files you'll touch* if they're now stale.
- A phase passed VPS verification → flip it to `Verified` in `AGENT_STATUS.md`.
- Discovered a "stub" is realer — or worse — than AUDIT says → correct `docs/AUDIT.md`.
- Made an architecture decision → record an ADR in `DECISIONS.md`.

Code and docs drift together in one commit. **A doc that lies is worse than no
doc** — the whole point of the reset was that status said "complete" while
nothing was built. Don't recreate that.

---

## Service Specifications (the **authoritative** per-service docs)

These are the per-service specs the frontend must follow. Each names the Prisma entities the
service manages, the real inventory endpoints the screens call, the realtime events it emits, the
per-role rendering, and the honest backend gaps. They live in `docs/product/services/` (not the old
pre-hardening `docs/services/`).

| Service | Spec | Connects to inventory |
|---|---|---|
| Projects | `docs/product/services/projects.md` | `PROJ-*` |
| Deployments | `docs/product/services/deployments.md` | `DEPL-*` |
| Functions (edge) | `docs/product/services/functions.md` | `FN-*` |
| Databases | `docs/product/services/databases.md` | `DB-*` |
| Storage | `docs/product/services/storage.md` | `STOR-*` |
| Realtime | `docs/product/services/realtime.md` | `RT-*` |
| Queues | `docs/product/services/queues.md` | `QUEUE-*` |
| Scheduler (cron) | `docs/product/services/scheduler.md` | `CRON-*` |
| Email | `docs/product/services/email.md` | `MAIL-*` |
| Domains | `docs/product/services/domains.md` | `DOM-*` |
| Monitoring | `docs/product/services/monitoring.md` | `MON-*` |
| Logs | `docs/product/services/logging.md` | `LOG-*` |
| MCP | `docs/product/services/mcp.md` | (proxy to SDK) |

> **The old `docs/services/*.md` (linked in the original CLAUDE.md) are pre-hardening aspirational
> specs and should not be used.** The new authoritative specs are in `docs/product/services/`.

---

## Phase Documents (restructured, dependency-correct)

| Phase | Title | Document |
|------:|-------|----------|
| 00 | Architecture & Build Foundation | `docs/phases/phase-00.md` |
| 01 | Installer & Infrastructure Stack | `docs/phases/phase-01.md` |
| 02 | Event Bus & Service Registry | `docs/phases/phase-02.md` |
| 03 | Identity & Access (platform auth) | `docs/phases/phase-03.md` |
| 04 | Projects Engine | `docs/phases/phase-04.md` |
| 05 | Storage Platform | `docs/phases/phase-05.md` |
| 06 | Deployment Engine | `docs/phases/phase-06.md` |
| 07 | Domains & TLS | `docs/phases/phase-07.md` |
| 08 | Database Platform | `docs/phases/phase-08.md` |
| 09 | Email Platform (Stalwart) | `docs/phases/phase-09.md` |
| 10 | Functions Runtime | `docs/phases/phase-10.md` |
| 11 | Queues Platform | `docs/phases/phase-11.md` |
| 12 | Scheduler Platform | `docs/phases/phase-12.md` |
| 13 | Realtime Platform | `docs/phases/phase-13.md` |
| 14 | Monitoring Platform | `docs/phases/phase-14.md` |
| 15 | Logging Platform | `docs/phases/phase-15.md` |
| 16 | SDK Platform | `docs/phases/phase-16.md` |
| 17 | MCP Platform | `docs/phases/phase-17.md` |
| 18 | CLI Platform | `docs/phases/phase-18.md` |
| 19 | Dashboard Platform | `docs/phases/phase-19.md` |
| 20 | Skills Platform | `docs/phases/phase-20.md` |
| 21 | Templates Platform | `docs/phases/phase-21.md` |
| 22 | AI Layer | `docs/phases/phase-22.md` |
| 23 | Marketplace | `docs/phases/phase-23.md` |

## Frontend Phase Documents (`docs/phases/frontend/`)

The backend phases above are the **destination**; these are the **dashboard + public-site** phases that
connect to them. Roadmap + verification rubric: `docs/phases/frontend/README.md`. Rules: every component
wired to a real endpoint (no mocks), 150-line limit, Hugeicons-only, auth-gated `/dashboard/*`.

| Phase | Title | Document | Status |
|------:|-------|----------|--------|
| F00 | Design System & App Foundation | `docs/phases/frontend/f00-design-system.md` | Verified |
| F01 | Public Site (Landing + Docs) | `docs/phases/frontend/f01-public-site.md` | Verified |
| F02 | Authentication | `docs/phases/frontend/f02-auth.md` | Next |
| F03 | First-Run Onboarding | _(in README roadmap)_ | Planned |
| F04 | Projects | _(in README roadmap)_ | Planned |
| F05 | Project Dashboard Shell | _(in README roadmap)_ | Planned |
| F06–F11 | Deployments / Functions / Databases / Storage / Realtime·Queues·Scheduler / Email·Domains·Monitoring·Logs·Settings·MCP | _(in README roadmap)_ | Planned |

## Product Documentation (`docs/product/`)

The **blueprint** the frontend must follow. Implementation is paused until the full blueprint
(philosophy → journeys → navigation → UX spec → service specs → screens → components → F00–F11 specs)
is complete and approved. See `docs/phases/frontend/backend/` for the accurate endpoint inventory
every spec cross-references.

| Document | Purpose |
|---------|---------|
| `platform-philosophy.md` | North star: what FIDScript is, 5 principles (Configure Once, Beginner First, Production-Ready, Observable, One Dashboard), and the one-domain → everything fan-out map. |
| `user-journeys.md` | The complete flows for every persona (fresh VPS, team member, solo dev, enterprise admin, backend dev, frontend dev) with steps + branches + success criteria. |
| `navigation.md` | Global IA + the project sidebar's 14 items (purpose, entry, children, permissions, empty state) + command palette + account menu. |
| `user-experience-spec.md` | Tactical UX rules: empty/error/loading/permission/multi-project, accessibility, keyboard shortcuts, realtime + optimistic UI, the single-screen test. |
| `services/*.md` | Per-service specs (projects, deployments, functions, …) — each: UX, data model, API mapping (→ backend inventory IDs), realtime events, settings, automation, dependencies. |
| `screens/index.md` | Master screen inventory: every screen = one operator interface to a Prisma entity, with route, auth context (owner/admin/dev/viewer render rules), key fields, operations, backend gaps. |
| `components/index.md` | Master component catalog: every reusable component (Button, DataTable, Sidebar, Toast, …) with state-matrix spec. |

---

## Technical References

| Reference | Location |
|-----------|----------|
| API Specification | `docs/API_SPEC.md` |
| SDK Specification | `docs/SDK_SPEC.md` |
| MCP Tools | `docs/MCP_SPEC.md` |
| Data Model | `docs/DATA_MODEL.md` |
| Event Catalog | `docs/EVENT_CATALOG.md` |
| Design System | `docs/DESIGN_SYSTEM.md` |
| Integration Hub | `docs/INTEGRATION_HUB.md` |
| Platform Boundaries | `docs/PLATFORM_BOUNDARIES.md` |

---

## Development Rules

1. **Verify Before "Done"** - Nothing is complete until it compiles, runs, and passes its prove-it tests on the VPS. No exceptions.
2. **API First** - Every feature accessible via API before dashboard
3. **Event Driven** - All platform actions emit events; events must have real consumers (see Phase 02)
4. **Integration is a Deliverable** - Every phase declares its events, service-registry entry, and SDK/MCP/CLI/dashboard touchpoints
5. **Provider Abstraction** - Never hardcode external services
6. **MCP + SDK Compatible** - All features have MCP tools and SDK methods
7. **150 Line Limit** - Split files exceeding 150 lines
8. **Feature-Based Structure** - Files organized by feature
9. **No Emojis in UI** - Use text or icon components only
10. **No Secrets in Code/History** - Secrets via `_FILE` env or a secrets manager; never committed
11. **Tenant Isolation** - Every query scoped by project/owner; isolation is tested
12. **Research Before Implementing** - Use available tools (Context7 for current library docs, web search for current best practices, file Read for repo state) to verify the correct approach before coding. Docs and model training may be stale.
13. **Docs Are Living** - Phase docs, AUDIT, AGENT_STATUS, and the precision maps are a snapshot. Update them in the same commit as the code so they never drift; a doc that lies is worse than no doc.
14. **Documentation-First (frontend)** - No frontend feature/page/component/API-integration may be implemented until its spec (`docs/phases/frontend/fNN-*.md`, following `_template.md`'s 16 sections) is complete and approved. Specs cross-reference the **backend inventory** (`docs/phases/frontend/backend/`) by stable endpoint ID — never invent endpoints. Flow: Documentation → Review → Approval → Implementation.
15. **Operating-System Framing (frontend)** - The dashboard is the operator's **control plane** for backend services, not a viz dashboard. Every screen renders **real Prisma entities** with real fields, enables **real inventory endpoints**, respects the **real auth context** (owner / admin / developer / viewer each see different fields, buttons, chrome), and is **honest about backend gaps** (greyed, never faked). See the "operating-system framing" section above. This rule constrains every product doc (philosophy, journeys, services, screens, components, phase specs).
16. **Documentation Freeze (the contract)** - As of 2026-06-20 (Phase D0) the blueprint is **frozen**: `docs/VALIDATION.md` confirms 0 broken cross-references and the implementation matrix is mapped. From this point the rules of engagement are:
    - **Documentation is the contract.** Code must conform to the docs; docs do not chase code.
    - **Code conforms to the documentation.** When building, follow the spec (`docs/phases/frontend/fNN-*.md` + the screen + component specs). If the code can't match the spec, that's a finding to surface — not a reason to silently diverge.
    - **Documentation changes require review before implementation.** If reality has shifted and a spec is now wrong, fix the spec **first** (rule 13), in its own change, and get it reviewed — *then* implement against the corrected spec. Never edit code and doc in a way that leaves the contract describing a system that doesn't exist.
    - **A feature is not "done" until its docs are updated.** Flip the phase to `Verified` in `AGENT_STATUS.md`, refresh the spec's *Current State*, and close any `PREREQ-*` it depended on in `docs/backend-prerequisites.md` — all in the same commit as the code (rule 1 + rule 13).
    - **No new frontend feature without its spec complete + approved** (rule 14 still holds).
    - The implementation order is fixed: `docs/IMPLEMENTATION_ROADMAP.md`. Blockers live in one place: `docs/backend-prerequisites.md`.

---

## Startup Sequence

### A. Orient yourself (read first)

1. Read `docs/START_HERE.md` — orient any agent/human.
2. Read `AGENT_STATUS.md` — know which phase is `In Progress` / `Verified`, and the current focus
   (today: **documentation-first phase**, implementation paused).
3. Read the **operating-system framing** above — this constrains every frontend doc and screen.

### B. If you're working on the frontend (dashboard / public site)

The blueprint is in `docs/product/` + `docs/phases/frontend/`. Read in this order:

1. `docs/product/platform-philosophy.md` — the north star + 5 principles.
2. `docs/product/user-journeys.md` — the flows every persona follows.
3. `docs/product/navigation.md` — the global IA + sidebar's 14 items.
4. `docs/product/user-experience-spec.md` — tactical UX rules.
5. `docs/product/services/[service].md` — the service you're implementing (its Prisma entities,
   real operations, per-role rendering, backend gaps).
6. `docs/phases/frontend/backend/index.md` (cluster files) — the accurate endpoint inventory; every
   spec cross-references IDs like `DEPL-02` from here.
7. `docs/phases/frontend/_template.md` — the 16-section scaffold every phase fills.
8. `docs/product/screens/index.md` — the master screen inventory; every screen = operator interface
   to a Prisma entity.
9. `docs/product/components/index.md` — the reusable components.
10. The phase spec you're implementing (`docs/phases/frontend/fNN-*.md`).

### C. If you're working on the backend (or hardening)

1. Read `docs/AUDIT.md` — know the honest current state.
2. Read `docs/phases/README.md` — the roadmap and verification rubric.
3. Read `docs/phases/phase-XX.md` — this phase's deliverables + exit criterion.
4. Read related ADRs in `DECISIONS.md` — decisions made.
5. **Research the current correct approach** (Context7 for library docs, web search for best
   practices) before implementing — see "How an agent should work" above.
6. Implement against the phase spec.
7. **Verify on the VPS** against the phase's `## Verification` section.
8. Commit the verified phase.
9. **Keep docs honest in the same commit**: update `AGENT_STATUS.md` (phase → `Verified`); refresh the
   phase doc's *Current State* / *Files you'll touch* if they drifted; correct `docs/AUDIT.md` if a
   verdict changed; add an ADR to `DECISIONS.md` if you made a decision.

---

## Project Documentation Map (the single index of every doc)

The complete blueprint + reference docs. Every file the frontend must be built against.

```
FIDScript Deploy repo
├── CLAUDE.md                        ← this file (parent guide)
├── AGENT_STATUS.md                  ← current progress + status (see also)
├── DECISIONS.md                     ← ADRs
├── AGENT_STATUS.md                  ← progress log
│
├── docs/
│   ├── AUDIT.md                     ← why we reset (backend audit)
│   ├── START_HERE.md                ← orient any agent
│   ├── VALIDATION.md                ← ⚠️ Phase D0 validation report (cross-refs + matrix + readiness + UX)
│   ├── IMPLEMENTATION_ROADMAP.md    ← ⚠️ the canonical build order (every future agent follows this)
│   ├── backend-prerequisites.md     ← ⚠️ every Open/UI-mitigated backend gap (the blocker registry)
│   │
│   ├── phases/                      ← BACKEND phases 00–23 (all verified)
│   │   ├── README.md                ← roadmap + verification rubric
│   │   └── phase-00.md … phase-23.md
│   │
│   ├── phases/frontend/             ← FRONTEND phases F00–F11 (blueprint in progress)
│   │   ├── README.md                ← roadmap + documentation-first rule
│   │   ├── _template.md             ← 16-section spec scaffold (every phase fills this)
│   │   ├── f00-design-system.md    ✅ verified
│   │   ├── f01-public-site.md      ✅ verified
│   │   ├── f02-auth.md             ✅ spec done (exemplar); pending approval
│   │   ├── f03…f11                 ⏳ spec pending
│   │   └── backend/                ← the accurate backend endpoint inventory
│   │       ├── index.md             ← conventions + public routes + security caveats
│   │       ├── auth.md              ← AUTH-*, APPAUTH-* (~33 routes)
│   │       ├── projects-deployments-domains.md  ← PROJ-*, DEPL-*, DOM-* (~38 routes)
│   │       ├── data.md              ← STOR-*, DB-*, MAIL-* (~53 routes)
│   │       ├── compute.md           ← FN-*, QUEUE-*, CRON-*, RT-* (~38 routes)
│   │       └── surfaces.md          ← MON-*, LOG-*, TMPL-*, AI-*, MKT-*, SVC-*, MCP-* (~80+)
│   │
│   ├── product/                     ← THE BLUEPRINT (authoritative)
│   │   ├── platform-philosophy.md   ← north star + 5 principles + competitor comparison
│   │   ├── user-journeys.md         ← 6 personas × full flows + success criteria
│   │   ├── navigation.md            ← sidebar's 14 items + global IA + command palette
│   │   ├── user-experience-spec.md  ← tactical UX: error/empty/loading/permission/a11y
│   │   ├── services/                ← 13 service specs (each: entity, operations, gaps)
│   │   │   ├── _template.md
│   │   │   ├── projects.md
│   │   │   ├── deployments.md
│   │   │   ├── functions.md
│   │   │   ├── databases.md
│   │   │   ├── storage.md
│   │   │   ├── realtime.md
│   │   │   ├── queues.md
│   │   │   ├── scheduler.md
│   │   │   ├── email.md
│   │   │   ├── domains.md
│   │   │   ├── monitoring.md
│   │   │   ├── logs.md
│   │   │   └── mcp.md
│   │   ├── screens/                 ← screen inventory (master list)
│   │   │   ├── _template.md
│   │   │   └── index.md             ← every screen → Prisma entity + route + auth context
│   │   └── components/              ← component catalog (reusable registry)
│   │       ├── _template.md
│   │       ├── index.md             ← catalog
│   │       ├── button.md ✅
│   │       ├── data-table.md ✅
│   │       └── toast.md ✅
│   │
│   └── services/                    ← ⚠ OLD pre-hardening aspirational specs — DO NOT USE
│                                   (superseded by docs/product/services/)
│
├── apps/
│   ├── api/                         ← NestJS API (23 modules) — the core, verified end-to-end
│   ├── dashboard/                   ← Next.js dashboard (F00–F11 — implementation paused)
│   ├── mcp-server/                  ← MCP server for AI agents (Phase 17)
│   └── sdk/                         ← TypeScript SDK (consolidates with packages/sdk)
│
├── packages/                        ← shared workspace packages
│   ├── types/ shared/ events/ config/ ui/ eslint-config/
│
├── installer/                       ← VPS install (Phase 01, hardened)
│   └── docker/ traefik/ config/ scripts/
│
├── memory/                          ← (Claude's own memory; outside the repo)
```

**Status legend:** ✅ verified · ✅ spec done (pending approval) · ⏳ spec pending · ⚠ obsolete (do not use).

---

## Infrastructure

**Cloudflare Domain:** deploy.fidscript.com. DNS + ACME wired via the installer (`setup-wizard.sh`).

---

*Last updated: 2026-06-20 — documentation-first phase; the blueprint (`docs/product/` + backend inventory + per-service specs + screen/component inventories + F02 exemplar) is in place. F02 implementation is the first vertical slice gated on this blueprint's review and approval; F03–F11 specs follow the same template.*
