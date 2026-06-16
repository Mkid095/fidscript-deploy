# FIDScript Deploy — Phase Roadmap (v2, post-audit)

> **Status:** Operating mode reset on 2026-06-16 from "build new features" to **"harden, integrate, and verify on the VPS."**
>
> This document is the authoritative roadmap. It supersedes the original phase ordering. Every phase document in this folder has been (or is being) rewritten against the template in §3.

---

## 1. Why this roadmap exists

An architecture audit (`docs/AUDIT.md`) found that the original 23 phases were marked "COMPLETE" without ever being compiled or run. The result was ~75% scaffolding — controllers and services that read and write database rows while doing little of the real infrastructure work each feature promises. The application **does not build, cannot be installed on a VPS, and returns a Traefik 404 today.**

The fix is not "Phase 24." The fix is to **restart from Phase 0 with a dependency-correct sequence, implement each phase for real, and verify it end-to-end on the VPS before advancing.** This roadmap encodes that decision.

## 2. The operating mode (read before any work)

1. **Nothing is "done" until it compiles, runs, and is verified on the VPS.** A controller + service + Prisma model is a draft, not a deliverable.
2. **Dependency-correct order.** Phases build on each other. Do not start a phase whose dependencies are not verified.
3. **Integration is a first-class deliverable**, not an afterthought. Every phase must declare the events it emits/consumes, the service-registry entry it adds, and (where relevant) the SDK methods, MCP tools, CLI commands, and dashboard screens it exposes.
4. **Honest status.** A phase is `Planned`, `In Progress`, or `Verified`. There is no `Complete` without verification. `Verified` means the §5 rubric passed on the VPS.
5. **Commit per phase.** Each verified phase is its own commit.

## 3. Restructured phase sequence

The original ordering is replaced. The topic assigned to each phase number changes (the old mapping never produced working software). Track groups are for orientation; the phase number is authoritative.

| Phase | Title | Track | Current state (AUDIT) | Key exit criterion |
|------:|-------|-------|-----------------------|--------------------|
| 00 | Architecture & Build Foundation | Foundation | Does not compile/build | `pnpm build` + `docker build` succeed for api & dashboard |
| 01 | Installer & Infrastructure Stack | Foundation | Installer doesn't deploy app | `install.sh` on a fresh VPS brings up the full stack |
| 02 | Event Bus & Service Registry | Foundation | STUB (wrong pkg, no consumers) | An event emitted in the API reaches a real consumer + audit row |
| 03 | Identity & Access (platform auth) | Identity | BROKEN (401 everywhere) | Register → login → call a guarded endpoint returns 200 |
| 04 | Projects Engine | Identity | PARTIAL | Create project, encrypt env vars, enforce tenant isolation |
| 05 | Storage Platform | Core | PARTIAL | Create a real bucket, upload bytes, get a working URL |
| 06 | Deployment Engine | Core | STUB (status flips) | A project deploys and serves live HTTP traffic |
| 07 | Domains & TLS | Core | STUB (`return true`) | A custom domain resolves, issues a cert, routes to an app |
| 08 | Database Platform | Data/Compute | STUB (fake conn string) | Provision a real Postgres, connect, backup, restore |
| 09 | Email Platform (Stalwart) | Data/Compute | STUB (no Stalwart wiring) | Send + receive real mail via the internal mail server |
| 10 | Functions Runtime | Data/Compute | PARTIAL (unsandboxed) | Invoke a sandboxed function with enforced limits |
| 11 | Queues Platform | Data/Compute | PARTIAL (table, no worker) | Publish → autonomous consume → ack, with DLQ + visibility timeout |
| 12 | Scheduler Platform | Data/Compute | PARTIAL (forgets on restart) | Cron jobs survive restart and fire on schedule |
| 13 | Realtime Platform | Observability/Sync | STUB (gateway can't load) | A platform event pushes to a connected socket client |
| 14 | Monitoring Platform | Observability | PARTIAL (no dispatch) | `/metrics` scrapable; an alert fires and notifies a channel |
| 15 | Logging Platform | Observability | PARTIAL (no retention) | Logs ingest, query, and age out per retention |
| 16 | SDK Platform | Surfaces | PARTIAL (duplicated) | One SDK covers all modules incl. databases; types complete |
| 17 | MCP Platform | Surfaces | PARTIAL (dead 1526-line file) | MCP server runs; `tools/list` + a tool call succeed |
| 18 | CLI Platform | Surfaces | MISSING | `fidscript login … project deploy` works end-to-end |
| 19 | Dashboard Platform | Surfaces | STUB (one page) | Every platform feature is manageable in the UI |
| 20 | Skills Platform | Surfaces | STUB (no frontmatter) | An installable `SKILL.md` drives the platform via an agent |
| 21 | Templates Platform | Ecosystem | STUB (row only) | Generate produces real files/repo and triggers deploy |
| 22 | AI Layer | Ecosystem | STUB/broken (won't compile) | AI chat/diagnose works against a real model, safely |
| 23 | Marketplace | Ecosystem | PARTIAL/broken (no admin guard) | Browse/submit/review with real admin gating + visible reviews |

### Dependency note

The **Event Bus (Phase 02)** is intentionally early. Realtime, Queues, Monitoring, Audit, and AI all consume the same event stream; building them first would force a rewrite. The **Surfaces (16–20)** come after the backend is real, because an SDK/CLI/dashboard over stub endpoints is theatre.

## 4. How the documents relate

| Document | Role |
|----------|------|
| `docs/AUDIT.md` | "Where are we" — the honest current state (read once, reference often) |
| `docs/phases/README.md` (this file) | "What's the plan" — roadmap, template, verification rubric |
| `docs/phases/phase-XX.md` | "What must this phase deliver" — forward spec per phase |
| `docs/services/*.md` | "What does this service do" — stable service contracts |
| `docs/EVENT_CATALOG.md` | "What events exist" — must be reconciled with code in Phase 02 |
| `CLAUDE.md` | Navigation + operating rules |
| `AGENT_STATUS.md` | Live progress: which phase is `In Progress` / `Verified` |

## 5. The verification rubric (what "Verified" means)

A phase is **Verified** only when, on the VPS (or a faithful local Docker stack):

1. **It builds.** `pnpm build` (and `docker build`) succeed with no type errors.
2. **It runs.** The relevant service starts without runtime/DI errors.
3. **It works.** The phase's explicit "prove-it" tests pass (each phase doc lists its own).
4. **It integrates.** Events it emits reach consumers; SDK/MCP/CLI/dashboard touchpoints declared in the phase are reachable.
5. **It is isolated/safe.** Tenant boundaries hold; no privilege escalation; no un-sandboxed execution where sandboxing is required.
6. **It is committed.** The verified work is a git commit on `main`.

Each phase document ends with a `## Verification` section enumerating the concrete prove-it commands for that phase.

## 6. Phase document template

Every `phase-XX.md` follows this structure:

```
# Phase XX: <Title>
> Status: Planned | In Progress | Verified   |   Track: <track>   |   Depends on: <phases>

## Objective
One-to-two sentences: the outcome this phase produces.

## Current State
Pointer to docs/AUDIT.md section + the one-line verdict (STUB/PARTIAL/BROKEN/MISSING) and the specific defects being fixed.

## Dependencies
What must be Verified first, and what this phase consumes from them.

## Deliverables
Checkable list: code, config, infra, endpoints, UI, tests.

## Technical Design
The real approach: packages, patterns, data-model changes, key flows, security.

## Integration Points
- Events emitted / consumed
- Service-registry entry
- SDK methods (Phase 16+)
- MCP tools (Phase 17+)
- CLI commands (Phase 18+)
- Dashboard screens (Phase 19+)

## Verification (VPS)
Concrete prove-it commands and the exit criterion.

## Out of Scope / Future
What is deliberately deferred.

## Risks
```

---

*Last updated: 2026-06-16. This roadmap will evolve; changes to the phase sequence require updating `CLAUDE.md` and `AGENT_STATUS.md` in the same commit.*
