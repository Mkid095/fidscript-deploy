# Phase 19: Dashboard Platform

> **Status:** Planned  |  **Track:** Surfaces  |  **Depends on:** Phase 03, Phase 13, Phase 16

## Objective

A real web dashboard — the primary surface — where **every platform feature is manageable in the UI**: auth, projects, deployments (with live status and streaming logs), domains, storage, databases, email, functions, queues, scheduler, monitoring, logs, members/invites. Today the dashboard is a single `<h1>FIDScript Deploy</h1>` page with no routes, no auth, and no API calls, and a broken orphan Vite scaffold clutters the repo.

## Current State

**STUB.** See `docs/AUDIT.md` §D (Dashboard). Specific defects:

- `apps/dashboard` is Next.js 15 but has **one page** — `<h1>FIDScript Deploy</h1>`. No routes, screens, API calls, or auth.
- `packages/ui` has **8 real components used by nothing**.
- The root `src/pages/*` is a **broken orphan Vite scaffold** (missing `main.tsx`, missing deps) — delete it (Phase 00 archives it; ensure here it's gone).

## Dependencies

- **Phase 03** (auth — login/register screens, session).
- **Phase 13** (realtime — live deployment status, streaming logs, toasts).
- **Phase 16** (the SDK, or a typed fetch layer, for all API calls).
- All feature phases (04–15) whose screens it exposes.

## Deliverables

- [ ] **Orphan scaffold removed.** The root `src/` Vite scaffold is deleted; `apps/dashboard` is the one frontend (Phase 00 decision confirmed here).
- [ ] **Auth flows.** Login, register, logout; token/session handling; protected routes; redirect-after-login.
- [ ] **App shell.** Responsive layout, top nav, project switcher, sidebar — built from `packages/ui` components (so those 8 components finally get used, and the rest).
- [ ] **Screens for every feature:**
  - Projects (list/detail, create, settings, members, invitations, encrypted env-var editor).
  - Deployments (list, live status, streaming build logs, promote/rollback/destroy).
  - Domains (add, DNS instructions + status, TLS state).
  - Storage (bucket list, file browser, upload).
  - Databases (list, connection-string reveal, backups, restore).
  - Email (mailboxes, inbox, compose, domain/DNS status).
  - Functions (editor, invocations, logs, triggers).
  - Queues (depth, messages, DLQ browser, requeue).
  - Scheduler (cron editor with next-run preview, history).
  - Monitoring (metric graphs, alert rules, notification channels, incident timeline).
  - Logs (filtered viewer + live tail).
- [ ] **Realtime wired.** Deployment status, log tail, alert toasts, mailbox updates via Phase 13.
- [ ] **API client + UX basics.** Typed client (SDK or fetch), loading/empty/error states, optimistic where safe, accessible, no emojis (Rule 9), text/icon components only.
- [ ] **Settings.** Profile, API keys, sessions, platform-admin area (guarded by Phase 03 `PlatformAdminGuard`).

## Technical Design

- **Next.js App Router:** server components for initial data + auth gating; client components for realtime/forms. Auth token in an httpOnly cookie; refresh handled server-side.
- **Shared UI:** `packages/ui` (Button, Card, Table, Modal, Toast, Tabs, Form) is the component source — single design system, used everywhere (Rule 8, Rule 9).
- **Data layer:** either the SDK (16) or a thin typed fetch over `/api/v1`; prefer the SDK for consistency with CLI/MCP.
- **Realtime:** the SDK's realtime client (Phase 13/16) for live updates.

## Integration Points

- **Surface 1 of 3** (Dashboard, MCP+Skills, CLI). Consumes the API + SDK + realtime.
- **Admin gating:** Marketplace admin actions (23) and platform settings use `PlatformAdminGuard`-equivalent UI gates.

## Verification (VPS)

```bash
# Full journey in a browser at https://deploy.fidscript.com:
# 1) Register → log in → land on projects.
# 2) Create a project → add an encrypted env var (masked in UI).
# 3) Deploy → watch status flip PENDING→...→LIVE live, build logs stream.
# 4) Open the live URL; manage DBs, functions, storage, domains, queues, cron, logs, alerts in the UI.
# 5) Invite a second user → they accept → see the project.
# 6) Confirm the orphan src/ scaffold is gone (no Vite ghost routes).

# Smoke (scripted):
curl -fsS https://deploy.fidscript.com/           # 200 HTML, real shell
curl -fsS https://deploy.fidscript.com/ -o /dev/null -w "%{http_code}\n"
```

**Exit criterion:** a user can register, log in, and perform the full platform journey in the UI — every feature screen works, deployment status and logs stream live, env vars are masked, admin areas are gated, and the orphan scaffold is gone. The dashboard is a real website, not a title page.

## Out of Scope / Future

- Public marketing/landing site + docs site (could live in the same Next app, separate phase).
- Mobile-native apps — future (the web app is responsive).
- Theme/editor — future (use the design system).

## Risks

- Screens built against endpoints that don't exist yet → track which backend phase each screen depends on; land screens as their phases verify.
- Token handling in the browser → httpOnly cookie + short-lived access + server-side refresh; never store secrets in localStorage.

## Files you'll touch (precision map)

- `apps/dashboard/src/app/` — Next.js App Router; currently just `layout.tsx` + `page.tsx` (a single `<h1>`). Add `login/`, project routes, feature screens.
- `packages/ui/src/components/*` — 8 real components used by nothing yet (build the app shell + screens from these).
- `apps/dashboard/package.json` (Next 15; depends on `@fidscript/{sdk,ui,types}`), `apps/dashboard/next.config.ts`.
- Wire: auth (Phase 03), the SDK/typed-fetch data layer, and the realtime client (Phase 13/16) for live status + log tail.

## Next Phase

[Phase 20: Skills Platform](./phase-20.md)
