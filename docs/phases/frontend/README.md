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
| F02 | Authentication | `f02-auth.md` | Phase 03 (auth/app-auth) | ✅ **Spec complete** (exemplar) — pending approval |
| F03 | First-Run Onboarding | _todo_ | Phase 01 + `/health` | Spec pending |
| F04 | Projects | _todo_ | Phase 04 (PROJ-*) | Spec pending |
| F05 | Project Dashboard Shell | _todo_ | navigation | Spec pending |
| F06 | Deployments UI | _todo_ | Phase 06 (DEPL-*) | Spec pending |
| F07 | Functions UI | _todo_ | Phase 10 (FN-*) | Spec pending |
| F08 | Databases UI | _todo_ | Phase 08 (DB-*) | Spec pending |
| F09 | Storage UI | _todo_ | Phase 05 (STOR-*) | Spec pending |
| F10 | Realtime / Queues / Scheduler | _todo_ | Phase 11/12/13 | Spec pending |
| F11 | Email / Domains / Monitoring / Logs / Settings / MCP | _todo_ | 07/09/14/15/17 | Spec pending |

**Implementation order respects dependencies** (see each spec's §15). F02 (auth) gates everything under
`/dashboard/*`; F04 (projects) gates all project-scoped service screens.

## Status legend
`Spec pending` · `Spec done — pending approval` · `In Progress` (approved, being built) · `✅ Verified`

## Change log
- 2026-06-20 — Established documentation-first regime; added `_template.md` + `backend/` inventory
  (audited from code, ~225 routes + WS + 108 MCP tools). Upgraded F02 to the full 16-section spec.
