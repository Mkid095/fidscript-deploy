# FIDScript Deploy — Frontend Phase Roadmap

> **Scope:** The Next.js dashboard (`apps/dashboard`) + the public site (landing/docs). The backend
> (Phases 00–23 in the parent folder) is the destination these phases connect to. A frontend phase is
> only **Verified** when its screens render, are wired to the **real** API, and the prove-it flow passes
> against the running stack.

These phases mirror the backend discipline: **nothing is "done" until it compiles, runs, connects to a
real endpoint, and is verified.** Commit per phase.

---

## 1. Operating rules (frontend-specific)

1. **Every component connects to a real endpoint.** No mock data in shipped screens. If a service's
   API isn't ready, the screen shows an honest empty/loading/error state — never fake data.
2. **150-line limit per file.** Split screens into focused components (list, form, detail, sidebar).
3. **Design system is the single source of truth.** Use the `@fidscript/ui` kit + the tokens in
   `globals.css` (`bg-ink-*`, `text-fire-*`, `glass-panel`, `bg-grid`). Hugeicons only — every icon
   chosen for meaning, not decoration.
4. **Tenant-aware.** Project-scoped screens read `projectId` from the route; every API call is scoped
   to it. Auth gates every `/dashboard/*` route via `AuthGuard`.
5. **Realtime where it matters.** Deployments, functions, queues, logs stream via the SDK's realtime
   module — not polling, where a live event exists.
6. **Verify on the VPS.** A screen built against `localhost` must also work against
   `https://deploy.fidscript.com`.

---

## 2. Phase sequence

| Phase | Title | Connects to (backend) | Key endpoints | Status |
|------:|-------|------------------------|---------------|--------|
| F00 | Design System & App Foundation | — (foundation) | — | ✅ Verified |
| F01 | Public Site (Landing + Docs) | — (marketing) | — | ✅ Verified |
| F02 | Authentication | Phase 03 (Identity) | `/auth/register`, `/auth/login`, `/auth/refresh`, `/auth/mfa/*`, magic-code | ⏳ Next |
| F03 | First-Run Onboarding | Phase 01 + `/health` | `GET /api/v1/health`, service probes | Planned |
| F04 | Projects | Phase 04 (Projects) | `/projects` (CRUD), members, env, keys | Planned |
| F05 | Project Dashboard Shell | — (navigation) | project context + sidebar | Planned |
| F06 | Deployments UI | Phase 06 (Deployments) | `/projects/:id/deployments`, logs, build-config | Planned |
| F07 | Functions UI | Phase 10 (Functions) | `/projects/:id/functions`, deploy, invoke, logs | Planned |
| F08 | Databases UI | Phase 08 (Databases) | `/projects/:id/databases`, connection, backups | Planned |
| F09 | Storage UI | Phase 05 (Storage) | `/projects/:id/storage` buckets/upload/presign | Planned |
| F10 | Realtime / Queues / Scheduler | Phase 11/12/13 | channels, `/queues`, `/scheduler` cron | Planned |
| F11 | Email / Domains / Monitoring / Logs / Settings / MCP | 07/09/14/15/17 | mailboxes, domains, metrics, logs, keys | Planned |

---

## 3. The user's intended flow (north star)

A person rents a VPS → runs the one-command installer → opens the printed URL → **first-run
onboarding** (health checks to 100%) → **logs in with the temp admin creds** → **forced to change
password** → lands on **Projects** → creates a project → enters the **project dashboard** with the
full services sidebar. Every screen below exists to serve this flow.

## 4. Verification rubric (per phase)

A frontend phase is **Verified** when, on the VPS:
1. `pnpm --filter @fidscript/dashboard build` succeeds (types + lint clean).
2. The screen renders at `https://deploy.fidscript.com/...` over HTTPS.
3. It reads/writes the **real** API (not mocks) and the action succeeds against the live stack.
4. Tenant/auth boundaries hold (wrong project → blocked; no session → redirected to login).
5. Committed in its own commit.

## 5. Status legend

`Planned` · `In Progress` · `✅ Verified`

Detailed docs live alongside this README (`f00-*.md`, `f01-*.md`, …). A detailed doc is written as
each phase begins; until then this roadmap table is the spec.
