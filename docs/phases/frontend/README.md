# FIDScript Deploy — Frontend Phase Roadmap

> **The rule (read first):** **Documentation → Review → Approval → Implementation.**
> No feature, component, page, API integration, or UI flow is implemented until its specification is
> complete. The documentation is the source of truth; implementation follows it — not the reverse.

This folder is the complete blueprint for the dashboard + public site. It is written so that **any
engineer or LLM can clone the repo, read these docs, and continue development without conversation
history**. Nothing is left to interpretation.

## How this folder is organized

| Path | Role |
|------|------|
| `_template.md` | The 16-section spec every phase must fill. Copy it → `fNN-*.md`. |
| `backend/index.md` (+ cluster files) | The **accurate** backend inventory. Every endpoint has a stable ID (`AUTH-04`, `DEPL-02`…). Specs cross-reference these IDs — **never invent endpoints.** |
| `f00-*.md` … `fNN-*.md` | One full spec per phase (follows `_template.md`). |
| `README.md` (this file) | The roadmap + status + operating rules. |

## Operating rules (frontend)

1. **Spec before code.** A phase's `fNN-*.md` must be complete (all 16 sections) and approved before
   any implementation. If a section is genuinely N/A, say why — blanks are not allowed.
2. **Every component connects to a real endpoint.** Cross-reference the inventory ID. No mock data in
   shipped screens — honest empty/loading/error states only.
3. **150-line file limit.** Split screens into focused components.
4. **Design system is the source of truth.** `@fidscript/ui` kit + `globals.css` tokens; Hugeicons only,
   each chosen for meaning.
5. **Tenant-aware.** Project-scoped screens read `projectId` from the route; `AuthGuard` gates
   `/dashboard/*`.
6. **Realtime where a live event exists** (see `backend/index.md` → Realtime event catalog) — not polling.
7. **Honest about gaps.** The backend inventory lists security caveats, dead code, and stubs
   (e.g. Skills unbuilt, php/go/rust functions unimplemented, email magic-link broken). Specs must
   reflect reality, not aspiration. If a screen needs something the backend lacks, the spec must say
   "backend gap — requires …" and stop.

## Phase sequence

| Phase | Title | Spec | Connects to | Status |
|------:|-------|------|-------------|--------|
| F00 | Design System & App Foundation | `f00-design-system.md` | foundation | ✅ Spec done (light) — upgrade to full template |
| F01 | Public Site (Landing + Docs) | `f01-public-site.md` | marketing | ✅ Implemented — spec to be upgraded |
| F02 | Authentication | `f02-auth.md` | Phase 03 (auth/app-auth) | ✅ Spec complete + implemented |
| F03 | First-Run Onboarding | `f03-first-run-onboarding.md` | Phase 01 + `/health` | ✅ Spec done + `/setup` wizard implemented |
| F04 | Projects | `f04-projects.md` | Phase 04 (PROJ-*) | ✅ Spec done + implemented (list + create + project shell + activity feed) |
| F05 | Project Dashboard Shell | `f05-project-dashboard-shell.md` | navigation | ✅ Spec done + shell implemented |
| F06 | Deployments UI | `f06-deployments.md` | Phase 06 (DEPL-*) | ✅ Spec done + deployed |
| F07 | Functions UI | `f07-functions.md` | Phase 10 (FN-*) | ✅ Spec done + implemented |
| F08 | Databases UI | `f08-databases.md` | Phase 08 (DB-*) | ✅ Spec done + implemented |
| F09 | Storage UI | `f09-storage.md` | Phase 05 (STOR-*) | ✅ Spec done + implemented |
| F10 | Realtime / Queues / Scheduler | `f10-realtime-queues-scheduler.md` | Phase 11/12/13 | ✅ Spec done + implemented |
| F11 | Email / Domains / Monitoring / Logs / Settings / MCP | `f11-email-domains-monitoring.md` | 07/09/14/15/17 | ✅ Spec done + implemented |

**Implementation order respects dependencies** (see each spec's §15). F02 (auth) gates everything under
`/dashboard/*`; F04 (projects) gates all project-scoped service screens.

## Status legend
`Spec pending` · `Spec done — pending approval` · `In Progress` (approved, being built) · `✅ Verified`

## Change log
- 2026-06-20 — Established documentation-first regime; added `_template.md` + `backend/` inventory
  (audited from code, ~225 routes + WS + 108 MCP tools). Upgraded F02 to the full 16-section spec.
