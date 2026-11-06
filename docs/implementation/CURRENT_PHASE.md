# Current Phase

> The single source of truth for "what is in flight right now." If this file says one thing,
> only that one thing is being worked on — **one vertical slice at a time** (Execution
> Protocol). Updated at the start and end of every working session.

---

## In flight

**Phase 0 — the product, architecture and journey audit: ✅ COMPLETE (2026-11-06)**

- `docs/product/UX_AUDIT.md` is the deliverable: 68 routes and 62 controllers read, every SDK
  module cross-referenced against the live API, the six journeys traced, the live platform driven
  in a browser.
- **Eleven blockers**, three of them reproduced live: an `fpk_` key reads *and renames* another
  project; a project `viewer` can mint an admin invitation and a write-scoped API key; the email
  console is empty everywhere and adding a domain crashes the page.
- Three findings in `docs/technical-debt.md` are **stale and materially wrong** — the functions
  runtime *is* sandboxed, and the domains/email/storage endpoints *do* check project membership.
  The real gap is that the project **role** is enforced nowhere.
- Nothing was implemented. The roadmap in the audit is reordered to put isolation and
  authorization first, and the first test suite lands in Phase 2.

*Awaiting the operator's direction on Phase 1 (isolation and authorization).*

## Not yet started

- **F04 → F11** — per `docs/IMPLEMENTATION_ROADMAP.md`.

## Recently completed

**Runtime Platform Configuration + Onboarding Rewrite ✅** (2026-06-20)

- `InstallationLifecycle` enum + `InstallationStatus` / `InstallationOperation` / `InstallationSettings` / `InstallationSettingsVersion` / `UserCredential` models added to schema; migration `20260620150000_installation_and_credentials` created.
- `InstallationModule`: `InstallationOrchestratorService` with `configure()` + SSE progress stream; provider interfaces + `TraefikProxyProvider` / `TraefikCertProvider`; step classes (`DnsStep`, `ProxyStep`, `CertificateStep`, `EmailStep`, `HealthStep`) with `validate()` / `execute()`.
- 26 new `installation.*` event types added to `packages/events`.
- `/onboarding` page rewritten: 5-step wizard (Welcome → Discovery → Configure → Progress → Complete).
- Onboarding welcome simplified: single "Create a new platform" button, no Restore/Join.
- `UserCredential` model: installer seeds PASSWORD credential; `AuthProfileService` returns `credentials[]`; force-change-password page detects PASSWORD credential → "Change password" vs "Create password".
- `AuthPasswordService`: magic-code-only users can create their first password without `currentPassword`.

**F04 — Projects ✅** (2026-06-20).

- `/dashboard/projects` list + create modal wired to real API via `useAuth().getSdk()`.
- CreateProjectModal: name + live slug preview + 6-type grid selector (frontend/backend/worker/cron/docker/static) + optional description.
- Optimistic create: modal closes immediately, card appears; failure re-opens modal with inline error.
- Project cards: name, slug, status badge, type pill, updatedAt. Link to `/projects/:id`.
- Per-role: Create button shown for owner/admin/developer; viewer sees cards read-only.
- Responsive grid (1 → md:2 → xl:3). AuthContext gains `getSdk()` for shared SDK access.

**F02 — Authentication (frontend) ✅** (2026-06-20).

- Login page: segmented [Email] [Magic code] tabs; real API integration.
- Register page: name + email + password (12+ chars, strength meter, confirm).
- Magic-code flow: send → masked email shown → 6-digit OTP auto-advance → verify → session.
- force-change-password: current + new (strength meter) + confirm → API call → redirect.
- SDK auth module updated: correct endpoint paths, AuthResponse {accessToken, refreshToken, user}.
- AuthContext: dual-token storage, /auth/me hydration, refresh on 401, mustChangePassword redirect.
- AuthGuard: unauthenticated → /login?next; mustChangePassword → /force-change-password.
- PasswordStrength + MagicCodeInput components.
- Typecheck clean; build clean (route list verified: login, register, force-change-password all present).

**Phase B — ✅ LIVE-VERIFIED 13/13** (2026-06-20).

- ✅ `PREREQ-AUTH-1` — `mustChangePassword` field + migration + seed
- ✅ `PREREQ-AUTH-2` — `POST /auth/change-password` (endpoint **AUTH-18**)
- ✅ `PREREQ-AUTH-3` — platform magic-code (endpoints **AUTH-19** + **AUTH-20**)
- ✅ `PREREQ-AUTH-4` — flag surfaced on `GET /auth/me`
- (Phase A `PREREQ-AUTH-5/6/7` was already implemented — verified, not re-built.)

**Live verification catch:** `JwtStrategy.validate()` was checking user existence + token type
but **not** session validity. A revoked session (logout, change-password rotation) left the
access token usable until its own 15-min expiry. Fix: added session-expiry check in `validate()`.
Verification script: 13/13 PASS.

## Blocked / waiting

- **Real email delivery** (KI-2 sub-gate) — magic-code email confirmed sent via Stalwart SMTP
  (logged); actual inbox delivery unconfirmed (needs a real inbox to check).
