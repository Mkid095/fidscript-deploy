# FIDScript Deploy — Start Here (read this first)

> For any agent or human, on any model. **If you read only one document, read this one.**
> Last updated: 2026-06-17.

## What this project is

FIDScript Deploy turns a single VPS into a self-hosted **Developer Operating System**:
application hosting + backend-as-a-service (auth, databases, storage, queues,
functions, email, realtime) + three access surfaces — a **dashboard website**,
an **MCP server with Claude skills**, and a **CLI**. Installers get all three.

## The honest current state

- The original "23 phases complete" was an **illusion** — nothing was ever compiled or run.
- We **reset to hardening mode** (2026-06-16). The plan is to rebuild dependency-first
  from Phase 0, verifying each phase on the VPS before advancing.
- **Phase 00 is VERIFIED** (2026-06-17): the monorepo type-checks (0 errors), builds
  (all `dist/`), and produces Docker images for the API and dashboard.
- **Phases 01–23 are scaffolding/stubs** — controllers + services that read/write DB
  rows without the real infrastructure work. See `docs/AUDIT.md` for the per-module truth.
- **Nothing is "done" until it builds, runs, and passes its prove-it tests on the VPS.**

## Read order (follow this)

1. `CLAUDE.md` (auto-loaded as project instructions) — navigation, rules, startup sequence.
2. **This document.**
3. `docs/AUDIT.md` — where we actually are (honest current state).
4. `AGENT_STATUS.md` — which phase is `In Progress` / `Verified`.
5. `docs/phases/README.md` — the roadmap + the 6-point verification rubric.
6. `docs/phases/phase-XX.md` — the phase you are working. **Each has a
   `## Files you'll touch` map** (exact paths + where the stub lives) and a
   `## Verification` section with VPS prove-it commands.

## The trap: aspirational docs

These describe the **intended/target** system, written *before* the reset. They are the
**destination, not the present**:

- `ARCHITECTURE.md`
- `docs/PRODUCT_REQUIREMENTS.md`
- `docs/API_SPEC.md`, `docs/SDK_SPEC.md`, `docs/MCP_SPEC.md`
- `docs/DATA_MODEL.md`, `docs/EVENT_CATALOG.md`
- `docs/SERVICE_CATALOG.md` and every `docs/services/*.md`
- `docs/DESIGN_SYSTEM.md`, `docs/INTEGRATION_HUB.md`, `docs/PLATFORM_BOUNDARIES.md`

Always cross-check a feature against `docs/AUDIT.md` and the phase doc's **Current State**
before assuming it works. If a doc says a feature exists, assume it is a stub until the
phase that implements it is `Verified` in `AGENT_STATUS.md`.

## Rules that matter most

1. **Verify before "done"** — compile, run, pass prove-it tests on the VPS. No exceptions.
2. **Dependency order** — never start a phase whose dependencies are not `Verified`.
3. **No secrets in code/history** — use `_FILE` env vars or a secrets manager; never commit them.
4. **Tenant isolation** — every query scoped by project/owner; isolation is a prove-it test.
5. **Integration is a deliverable** — every phase wires its events, service-registry entry,
   and SDK/MCP/CLI/dashboard touchpoints.
6. 150-line file limit; feature-based structure; no emojis in UI.
7. **Research before implementing** — these docs *and your training* can be stale. Before
   non-trivial work, confirm the current correct approach with your tools: **Context7** MCP
   for library/framework docs, **web search** for best practices, and **file reads** for the
   repo's real state.
8. **Docs are living** — the phase docs, `docs/AUDIT.md`, the precision maps, and
   `AGENT_STATUS.md` are a snapshot. Keep them honest: update them **in the same commit**
   as the code. A doc that lies is worse than no doc (the whole reset happened because status
   said "complete" while nothing was built).

## The exact next action

**Phase 01 — Installer & Infrastructure Stack.** Make `install.sh` actually bring up the
full stack on a fresh VPS. Key files:

- `installer/scripts/install.sh` (today it copies files and prints "complete" without deploying)
- `installer/docker/docker-compose.yml` (broken `_FILE` secret substitution; missing build contexts)
- `installer/traefik/traefik.yml` + `dynamic.yml` (Go-template syntax the file provider ignores)
- `installer/scripts/configure-firewall.sh` (dangerous `iptables -F/-X`)
- `apps/api/prisma/migrations/` (create — first baseline) and `apps/api/prisma/seed.ts` (create — admin user)

Full deliverable list + VPS exit criterion: `docs/phases/phase-01.md`.

## Quick map of the repo

| Area | Location | Notes |
|------|----------|-------|
| API (NestJS, 23 modules) | `apps/api/src/modules/<module>/` | CommonJS; Prisma at `apps/api/prisma/` |
| Dashboard (Next.js) | `apps/dashboard/src/app/` | canonical frontend; currently one page |
| MCP server | `apps/mcp-server/src/` | `server.ts` + `handlers.ts` + `tools/` |
| SDKs (two, to be merged in Phase 16) | `packages/sdk`, `apps/sdk` (`@fidscript/sdk-node`) | |
| Shared packages | `packages/{types,shared,events,config,ui,eslint-config}` | built before apps via turbo |
| Installer / infra | `installer/{scripts,docker,traefik,config}` | Phase 01 focus |
| Phases | `docs/phases/phase-XX.md` | the work units |
