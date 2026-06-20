# Backend Prerequisite Registry

> **Purpose.** The single source of truth for every backend capability the frontend needs
> that does **not yet exist** (or exists but is broken). Every frontend phase spec points
> here instead of rediscovering the same blockers. Before a phase is marked
> "implementation-ready", every `PREREQ-*` it lists must be **Closed**.
>
> **Status legend.** 🟥 Open (blocks implementation) · 🟧 Partial (workable with UI mitigation)
> · 🟨 Hardening (functional, needs security/robustness pass) · ✅ Closed.
>
> **Authority.** Backend reality is `docs/AUDIT.md` §C (the module table, updated through
> 2026-06-19) + this session's VPS verification (Deployments + Functions proven end-to-end).
> The inventory of *existing* endpoints is `docs/phases/frontend/backend/`.

---

## How to use this registry

1. A frontend phase's `## Feature Dependency Graph` lists the `PREREQ-*` IDs it needs.
2. Before implementing that phase, check each ID's status here.
3. If any listed ID is 🟥 Open, **close it first** (backend change) — do not work around it
   in the UI unless the entry explicitly says "UI-mitigated."
4. When you close a prereq, flip its status to ✅ **in the same commit** as the backend
   change, and update every phase spec that referenced it.

**ID scheme:** `PREREQ-<MODULE>-<n>`. These are distinct from inventory IDs (`AUTH-01`,
`PROJ-02`, …) — a `PREREQ-*` is always a *new or broken* capability, never an existing
endpoint. Older specs used tokens like `PROJ-NEW-1` / `SCHED-1` / `AUTH-1..4`; those are
aliases noted inline and redirect here.

---

## AUTH — platform authentication (blocks F02, cascades to everything)

F02 cannot be implemented until AUTH is correct. AUTH is the foundation every authenticated
screen depends on. Per `docs/AUDIT.md` §C: *"Auth: BROKEN — Login returns a raw hex token,
but JwtStrategy verifies it as a JWT → every guarded route returns 401."* The Phase 03
hardening plan (`docs/phases/phase-03.md`) covers these.

| ID | Title | Category | Blocks | Suggested fix | Status |
|---|---|---|---|---|---|
| `PREREQ-AUTH-1` | `User.mustChangePassword` field + seed-true for install admin | missing-behavior | F02 | Add `mustChangePassword Boolean @default(false)` to `User`; seed the install admin with `true` so first login forces a password change. _(alias: AUTH-1)_ | 🟥 Open |
| `PREREQ-AUTH-2` | `POST /auth/change-password` endpoint | missing-endpoint | F02 | New route: validates current pw (bcrypt), enforces strength, sets `mustChangePassword=false`, rotates session. _(alias: AUTH-2)_ | 🟥 Open |
| `PREREQ-AUTH-3` | Platform magic-code endpoints (`POST /auth/magic-code` + `POST /auth/verify-magic-code`) | missing-endpoint | F02 | 6-digit OTP, bcrypt-hashed + 10m expiry + attempt-limited, delivered via `SmtpSendService` (omit `dto.from` to use `SMTP_FROM`). Replaces the broken magic-link path (`AUTH-05/06` query `where email === token`, never emailed, never expires). _(alias: AUTH-3)_ | 🟥 Open |
| `PREREQ-AUTH-4` | `mustChangePassword` flag on `GET /auth/me` | missing-behavior | F02 | Include the flag in the `/auth/me` response so the client can gate the force-change screen. _(alias: AUTH-4)_ | 🟥 Open |
| `PREREQ-AUTH-5` | Logout is a no-op | broken | F02 | `POST /auth/logout` reads `user.sessionId` which the strategy never sets. Carry `sessionId` in the access JWT; logout deletes the `Session` row. | 🟥 Open |
| `PREREQ-AUTH-6` | Refresh-token rotation join is broken | broken | F02 | `POST /auth/refresh` expects a refresh *JWT* but `createSession` issues an *opaque* token. Align both halves to signed JWTs; rotate on use (expire old, mint new). | 🟥 Open |
| `PREREQ-AUTH-7` | `JWT_SECRET_FILE` not honored by `auth.module`/`jwt.strategy` | broken | F02 | Only `realtime/services/token.service.ts:23` reads the `_FILE` variant. Materialize `JWT_SECRET` from `JWT_SECRET_FILE` everywhere (secrets-manager rule 10). | 🟥 Open |

> **Note on MFA.** `User.mfaEnabled`/`mfaSecret` columns already exist; `mfa.service.ts`
> exists. Platform TOTP is partially scaffolded — verify it end-to-end during F02; if it
> works, no prereq; if not, add `PREREQ-AUTH-8`.

---

## HEALTH — first-run onboarding (blocks F03)

| ID | Title | Category | Blocks | Suggested fix | Status |
|---|---|---|---|---|---|
| `PREREQ-HEALTH-1` | `GET /api/v1/health/email` SMTP probe | missing-endpoint | F03 | New public endpoint: SMTP AUTH PLAIN to `fidscript_stalwart:465`; returns `{status, provider, lastChecked}`. Browsers can't speak SMTP, so the probe must be server-side. _(alias: HEALTH-1)_ | 🟥 Open |
| `PREREQ-HEALTH-2` | `services.email` exposed in `/health` | missing-behavior | F03 | Confirm `/health.services` includes an `email` entry; add if absent. _(alias: HEALTH-2)_ | 🟧 Verify |

---

## PROJ — projects workspace (blocks F04, F05)

| ID | Title | Category | Blocks | Suggested fix | Status |
|---|---|---|---|---|---|
| `PREREQ-PROJ-1` | Slug-availability check | missing-endpoint | F04 | `GET /projects/slug-available?slug=…` → `{available:bool,suggestion?}`. Until it lands the UI derives the check from `PROJ-01?slug=…`. _(alias: PROJ-NEW-1)_ | 🟧 UI-mitigated |
| `PREREQ-PROJ-2` | `PROJ-01` returns per-row `role` + `lastActivityAt` | missing-behavior | F05 | The project-switcher needs each row's role (for the badge) + last activity (for the timestamp). Extend the list projection. | 🟥 Open |
| `PREREQ-PROJ-3` | "Last 20 events for the bell" endpoint | missing-endpoint | F05 | Either `GET /projects/:id/events?limit=20` or a realtime-gateway replay buffer. The notification bell + activity feed both need it. | 🟥 Open |
| `PREREQ-PROJ-4` | `PROJ-20` API-key DTO is `@Body() dto: any` | audit-gap | F04, F11 | No validation on the create-API-key body. Add a class-validator DTO. UI validates locally meanwhile. | 🟨 UI-mitigated |
| `PREREQ-PROJ-5` | `PROJ-14` invitation `role` is free-text `@IsString` | audit-gap | F04, F11 | Not an enum — any string accepted. Constrain to `admin|developer|viewer`. UI constrains meanwhile. | 🟨 UI-mitigated |

---

## SCHED — scheduler (blocks a slice of F10)

| ID | Title | Category | Blocks | Suggested fix | Status |
|---|---|---|---|---|---|
| `PREREQ-SCHED-1` | Skip-next-run endpoint | missing-endpoint | F10 (Next-run tab) | `POST /cron/:jobId/skip-next` → advances `nextRunAt` past the next occurrence without firing. UI button is greyed "coming soon" until this lands. _(alias: SCHED-1, was CRON-09)_ | 🟧 UI-greyed |

---

## AUDIT — observability context (cross-cutting)

| ID | Title | Category | Blocks | Suggested fix | Status |
|---|---|---|---|---|---|
| `PREREQ-AUDIT-1` | Event emits lack actor/IP/UA context | missing-behavior | F05 (activity feed richness) | `platform.events` has the columns (`actorType`, `ipAddress`, `userAgent`) but most emit sites don't populate them. Migrate emits to the 3-arg form `{event, payload, {actorId, ipAddress, userAgent}}`. Controller-driven emits read IP/UA via a `RequestContext` helper; system emits set `actorType:'system'`. | 🟧 Workable |

---

## SEC — access-control hardening (functional today, but insecure)

These don't block implementation — the endpoints work — but the UI must grey them for
non-authorized roles and the gaps must be closed before any production claim. Per
`docs/AUDIT.md` + `docs/phases/frontend/backend/index.md`.

| ID | Title | Category | Blocks | Suggested fix | Status |
|---|---|---|---|---|---|
| `PREREQ-SEC-1` | `DOM-05` / `DOM-06` skip project-access checks | audit-gap | F11 (Domains) | Any member can connect-cloudflare or delete a domain. Add `ProjectAccessService.checkPermission(userId, projectId, ['admin','owner'])`. UI greys for non-A/D meanwhile. | 🟨 UI-mitigated |
| `PREREQ-SEC-2` | Email services lack project-access checks | audit-gap | F11 (Email) | Path-scoping only (`projects/:projectId/...`); no membership re-validation. Add explicit checks. UI greys for non-members meanwhile. | 🟨 UI-mitigated |
| `PREREQ-SEC-3` | `STOR-08` public-URL skips access check | audit-gap | F09 | Anyone can mint a public URL for any bucket. Add the check. UI greys for non-members meanwhile. | 🟨 UI-mitigated |
| `PREREQ-SEC-4` | Email webhooks (`MAIL-32..34`) open if `STALWART_WEBHOOK_SECRET` unset | audit-gap | F11 (Email settings) | Enforce HMAC when the env var is set; warn in the UI when it isn't (banner). | 🟨 UI-warned |

---

## EMAIL — Stalwart integration honesty (blocks a slice of F11)

| ID | Title | Category | Blocks | Suggested fix | Status |
|---|---|---|---|---|---|
| `PREREQ-EMAIL-1` | Stalwart v0.15.5 suspend is a DB flag only | audit-gap | F11 (Mailbox detail) | `setAccountStatus`/`deleteAccount`/`setAccountPassword` are no-ops in Stalwart 0.15.5 — a "suspended" mailbox can still log in via IMAP/SMTP. UI surfaces this honestly (`<MailboxStatusPill>` note). Fix = upgrade Stalwart OR rotate credentials on suspend. | 🟧 UI-honest |

---

## RUNTIME — unimplemented engine support (permanent greys)

These are **not bugs** — they're documented scope boundaries. The UI greys each with
"not yet available" + tooltip. They never block implementation; they constrain it.

| ID | Title | Status |
|---|---|---|
| `PREREQ-RUNTIME-1` | `php` / `go` / `rust` function runtimes not implemented | 🟧 UI-greyed (permanent until built) |
| `PREREQ-RUNTIME-2` | `mysql` / `redis` database types not implemented | 🟧 UI-greyed |
| `PREREQ-RUNTIME-3` | `cloudinary` / `telegram` storage providers not implemented | 🟧 UI-greyed |
| `PREREQ-RUNTIME-4` | `slack` / `pagerduty` notification channels not wired | 🟧 UI-greyed |

---

## LOG / FN / DB — feature follow-ups (not blocking)

| ID | Title | Category | Blocks | Suggested fix | Status |
|---|---|---|---|---|---|
| `PREREQ-LOG-1` | Log `retentionDays` never enforced | missing-behavior | F11 (Logs) | No retention sweep exists. Add a scheduler job. Functional degradation only. | 🟧 Workable |
| `PREREQ-LOG-2` | `QUEUE-06` stats don't emit realtime | missing-behavior | F10 (Queue Stats) | UI polls every 10s. Add `queue.<id>.stats_updated` event; UI consumes it when it lands. | 🟧 UI-polls |
| `PREREQ-FN-1` | Build-logs endpoint returns one string, not a stream | missing-behavior | F06 (Deployment logs) | `DEPL-04` returns `{logs: release.buildLogs}` (full string). The live-tail UX polls every 2s during BUILDING. A push-based `logs.appended` event is the follow-up. | 🟧 UI-polls |
| `PREREQ-DB-1` | SQL console endpoint | missing-endpoint | F08 (Database detail) | No in-dashboard SQL runner. UI shows a greyed "Open in SQL console — coming soon" button. | 🟧 UI-greyed |

---

## Summary by status

| Status | Count | Meaning |
|---|---|---|
| 🟥 Open | 9 | Must close before the phase that lists them can be implemented |
| 🟧 Workable / UI-mitigated | 14 | UI works around it; close in a hardening pass before production |
| 🟨 Hardening | 4 | Functional but insecure; close before any production claim |
| ✅ Closed | 0 | — |

## Implementation-critical subset (the "close these first" list)

The 9 🟥 Open prereqs, in dependency order:

1. `PREREQ-AUTH-5` logout no-op
2. `PREREQ-AUTH-6` refresh-token join
3. `PREREQ-AUTH-7` JWT_SECRET_FILE
4. `PREREQ-AUTH-1` mustChangePassword field + seed
5. `PREREQ-AUTH-2` change-password endpoint
6. `PREREQ-AUTH-3` platform magic-code
7. `PREREQ-AUTH-4` mustChangePassword on /auth/me
8. `PREREQ-PROJ-2` PROJ-01 role + lastActivityAt
9. `PREREQ-PROJ-3` last-20-events endpoint

Items 1–7 unblock **F02** (and therefore every authenticated screen). Items 8–9 unblock
**F05** (the project shell). `PREREQ-HEALTH-1/2` unblock **F03** but F03 is lower priority
than F02/F05 in the implementation order.

---

## Change log
- 2026-06-20 — Initial registry. Consolidated every backend gap surfaced across F02–F11 +
  the 19 per-screen specs + the component specs + `docs/AUDIT.md`. Unified the ad-hoc ID
  tokens (`AUTH-1..4`, `HEALTH-1..2`, `PROJ-NEW-1`, `SCHED-1`) under the `PREREQ-<MODULE>-<n>`
  scheme; old tokens kept as aliases.
