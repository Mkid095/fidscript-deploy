# Implementation Roadmap (Phase D0.6)

> **Purpose.** The single canonical task list every future agent follows to build the
> dashboard. Implementation proceeds in the order below; **do not skip ahead**. Each phase
> has: estimated effort, backend prerequisites, services touched, screens, components,
> acceptance criteria, and a verification checklist.
>
> **Authority.** This roadmap is derived from `docs/VALIDATION.md` (the implementation
> matrix + API readiness) and `docs/backend-prerequisites.md` (the Open prereqs). The
> per-phase *spec* is `docs/phases/frontend/fNN-*.md`. This doc is the *order and gates*;
> the spec is the *what*.
>
> **Rule.** No phase is "done" until (a) its acceptance criteria pass on the VPS, (b) the
> `PREREQ-*` items it lists are Closed, and (c) `docs/AGENT_STATUS.md` is flipped in the
> same commit. Documentation is the contract (see CLAUDE.md rule 16).

---

## Effort scale

- **S** (small): ≤1 day — a single screen or a pure-backend endpoint.
- **M** (medium): 2–4 days — a phase with a few screens + realtime wiring.
- **L** (large): 5–10 days — a multi-screen phase or a backend hardening track.

---

## Stage 0 — Close the blocking backend prerequisites (L)

**Do this first.** It unblocks F02, F03, and F05 — the foundation every authenticated screen
depends on. Per `docs/backend-prerequisites.md`, in dependency order:

| Step | Prereq | Work | Effort | Verifies |
|---|---|---|---|---|
| 0.1 | `PREREQ-AUTH-5` | Carry `sessionId` in the access JWT; `POST /auth/logout` deletes the `Session` row. | S | logout revokes; re-call /me → 401 |
| 0.2 | `PREREQ-AUTH-6` | Refresh consumes a signed refresh JWT; rotate on use (expire old `Session`, mint new). | S | refresh → new access; old refresh → 401 |
| 0.3 | `PREREQ-AUTH-7` | `auth.module` + `jwt.strategy` materialize `JWT_SECRET` from `JWT_SECRET_FILE` (mirror `realtime/services/token.service.ts:23`). | S | app boots with only `JWT_SECRET_FILE` set |
| 0.4 | `PREREQ-AUTH-1` | `User.mustChangePassword Boolean @default(false)`; seed install admin `true`. | S | migration applies; admin row has the flag |
| 0.5 | `PREREQ-AUTH-2` | `POST /auth/change-password`: validates current (bcrypt), enforces strength, clears flag, rotates session. | S | change → /me shows `mustChangePassword:false` |
| 0.6 | `PREREQ-AUTH-3` | `POST /auth/magic-code` + `POST /auth/verify-magic-code`: 6-digit OTP, bcrypt+10m+attempt-limited, delivered via `SmtpSendService` (omit `from`). | M | code arrives at a real inbox; verify → JWT |
| 0.7 | `PREREQ-AUTH-4` | Include `mustChangePassword` in `GET /auth/me`. | S | /me returns the flag |
| 0.8 | `PREREQ-PROJ-2` | `GET /projects` returns per-row `{role, lastActivityAt}`. | S | switcher renders badges + timestamps |
| 0.9 | `PREREQ-PROJ-3` | `GET /projects/:id/events?limit=20` (or realtime replay buffer). | M | bell + activity feed populate |

**Exit criterion:** all 9 items ✅ in `docs/backend-prerequisites.md`; `pnpm typecheck && pnpm build` clean; API healthy on VPS.

> **Optional parallel track (lower priority):** `PREREQ-HEALTH-1/2` (F03's email probe).
> F03 is sequenced after F02, so this can land during F02 implementation.

---

## Stage 1 — F02 Authentication (L) — the first vertical slice

**Why first:** every authenticated screen needs a valid session. F02 is the smallest phase
that exercises the full stack (DB → API → realtime → UI → SDK). Proving it end-to-end
de-risks everything after.

| | |
|---|---|
| **Spec** | `docs/phases/frontend/f02-auth.md` |
| **Backend prereqs** | `PREREQ-AUTH-1..7` (Stage 0) |
| **Services touched** | Auth (`AUTH-*`) |
| **Screens** | `/login` (password + magic-code tabs), `/register`, `/force-change-password`, `/login/mfa`, Account → Profile/Sessions/MFA/API-Keys |
| **Components** | `TextField`, `PasswordStrength`, `MagicCodeInput`, `MFASetupPanel`, `Button`, `Toast`, `ErrorState` |
| **Effort** | L (the auth flows + MFA + account screens) |

**Acceptance criteria** (from F02 §16): register → login → /me 200; logout actually
revokes; refresh rotates; magic-code arrives + verifies; MFA setup → challenge enforces;
force-change-password gates the first admin login; `mustChangePassword` flows end-to-end.

**Verification checklist:**
- [ ] `pnpm --filter @fidscript/dashboard build` clean
- [ ] Fresh install: admin first-login → force-change → dashboard
- [ ] Magic-code tab: code arrives via Stalwart; verify → session
- [ ] MFA: setup → next login requires TOTP; wrong TOTP rejected
- [ ] Sessions page: revoke one → that session's next call 401s
- [ ] No console errors; reduced-motion respected; keyboard-navigable

---

## Stage 2 — F03 First-Run Onboarding (M)

**Why second:** defines the first-run experience; small; depends only on F02 + the email
probe. A clean win to build momentum.

| | |
|---|---|
| **Spec** | `docs/phases/frontend/f03-onboarding.md` |
| **Backend prereqs** | `PREREQ-HEALTH-1`, `PREREQ-HEALTH-2` |
| **Services touched** | Health (`SVC-*`) |
| **Screens** | `/onboarding` (5-row health board) |
| **Components** | `HealthBadge`, `Button`, `Skeleton`, `ErrorState` |
| **Effort** | M |

**Acceptance criteria:** 5 rows poll → all green → Continue enabled; cookie prevents
re-appearance; failure rows show reason + Fix link; "Continue anyway" escape hatch.

**Verification:** fresh-install URL shows onboarding; rows turn green as services warm;
Continue → /login.

---

## Stage 3 — F04 Projects (M)

**Why third:** the tenant boundary. Every per-service screen lives inside a project.

| | |
|---|---|
| **Spec** | `docs/phases/frontend/f04-projects.md` |
| **Backend prereqs** | none blocking (`PREREQ-PROJ-1` slug-check is UI-mitigated; `PROJ-4/5` DTO gaps UI-mitigated) |
| **Services touched** | Projects (`PROJ-*`) |
| **Screens** | `/dashboard` (workspace root), Create-project modal, `/invitations/accept` |
| **Components** | `EntityCard`, `DataTable`, `Modal`, `TextField`, `Select`, `Toast`, `EmptyState` |
| **Effort** | M |

**Acceptance criteria:** empty state → create modal → card animates in → click → (F05);
invitation accept → register-or-accept → land on project.

**Verification:** create project; slug preview live; duplicate-name inline error; viewer
sees no Create button.

---

## Stage 4 — F05 Project Dashboard Shell (L)

**Why fourth:** the chrome every F06–F11 screen renders inside. Build it once, inherit it
13 times.

| | |
|---|---|
| **Spec** | `docs/phases/frontend/f05-project-dashboard-shell.md` |
| **Backend prereqs** | `PREREQ-PROJ-2`, `PREREQ-PROJ-3` (Stage 0) |
| **Services touched** | Projects, Health, Realtime (the project room) |
| **Screens** | `/dashboard/projects/:id` shell + every section route |
| **Components** | `AppHeader`, `Sidebar`, `ProjectSwitcher`, `CommandPalette`, `Breadcrumbs`, `ContextBar`, `NotificationBell`, `AccountMenu`, `MobileTabBar` |
| **Effort** | L (the chrome is the most-reused surface; get it right) |

**Acceptance criteria:** header + sidebar (14 items) + breadcrumbs + context bar + ⌘K +
bell; project switch is client-side (no reload); role greys Settings/MCP; footer health dot;
mobile drawer.

**Verification:** navigate every section; switch projects; ⌘K opens palette; bell shows
last 20 events; viewer greys; last-section persistence.

---

## Stages 5–11 — F06 through F11 (the service screens)

These are sequenced by **dependency, not sidebar order**. Each is independent once F05
exists; the order below minimizes rework (shared components land first).

| Stage | Phase | Effort | Backend prereqs (blocking) | Shared components first built here |
|---|---|---|---|---|
| 5 | **F06 Deployments** | M | none (`PREREQ-FN-1` build-log stream is UI-poll-mitigated) | `StateMachineTimeline`, `LogViewer` (shared w/ F07/F10/F11) |
| 6 | **F07 Functions** | M | none (sandboxing is backend security debt, not an F07 blocker) | `CodeEditor`, `RuntimeBadge` |
| 7 | **F08 Databases** | M | none (`PREREQ-DB-1` SQL console is UI-greyed) | `ProgressBar`, `Sparkline`, `TimeSeriesChart` (shared w/ F11) |
| 8 | **F09 Storage** | M | none (`PREREQ-SEC-3` STOR-08 is UI-mitigated) | `Dropzone`, `UploadProgress` |
| 9 | **F10 Realtime+Queues+Scheduler** | L | none (`PREREQ-SCHED-1` skip-next is UI-greyed; `PREREQ-LOG-2` stats poll) | `LiveTail`, `CronExpressionInput` |
| 10 | **F11 Email+Domains+Monitoring+Logs+Settings+MCP** | L | none (all gaps UI-mitigated/honest) | `AddDomainWizard`, `ChannelConfigForm`, `McpToolManifest` |

**Per-phase acceptance + verification:** see each `fNN-*.md` §16. The common checklist
applies to all:
- [ ] `pnpm --filter @fidscript/dashboard build` clean (types + lint, 150-line rule)
- [ ] Every screen renders the real Prisma entity with real fields (no mock data)
- [ ] Every action calls the real inventory endpoint (no mock handlers)
- [ ] Per-role rendering correct (owner/admin/developer/viewer each see different chrome)
- [ ] Audit gaps greyed honestly (never faked)
- [ ] Realtime subscription wired where the spec says
- [ ] Reduced-motion + keyboard + a11y pass

---

## Stage 12 — Hardening pass (the 🟨 + remaining 🟧)

After F11, close the non-blocking prereqs before any production claim:

- `PREREQ-SEC-1/2/3/4` — access-control hardening (DOM-05/06, email, STOR-08, webhook HMAC)
- `PREREQ-AUDIT-1` — actor/IP/UA context propagation
- `PREREQ-EMAIL-1` — Stalwart upgrade or credential-rotation-on-suspend
- `PREREQ-LOG-1` — retention sweep
- `PREREQ-PROJ-4/5` — DTO validation (remove the UI-mitigation training wheels)
- Functions sandboxing (security debt from `docs/AUDIT.md` §C) — **mandatory before any
  multi-tenant production use**

---

## Out of scope for this roadmap (resume after F11 + hardening)

- **BaaS app-auth UI** — `APPAUTH-01..19` exist in the backend; no dashboard screen is
  specced. Per-project end-user auth (Supabase-Auth-style) is a future product surface.
- **Templates / AI / Marketplace** — backend stubs/broken; no F-phase. Resumes as backend
  hardening tracks (AUDIT §E Track 4).
- **CLI** — missing entirely (AUDIT §D). A separate surface track.

---

## Change log
- 2026-06-20 — Initial roadmap. 11 implementation stages + 1 hardening stage, derived from
  `docs/VALIDATION.md` and `docs/backend-prerequisites.md`.
