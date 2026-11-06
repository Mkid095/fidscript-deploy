# Current Phase

> The single source of truth for "what is in flight right now." If this file says one thing,
> only that one thing is being worked on — **one vertical slice at a time** (Execution
> Protocol). Updated at the start and end of every working session.

---

## In flight

**Phase 3 — the navigation and the platform overview: ✅ COMPLETE (2026-11-06)**

- One navigation, two levels: the **platform's** (overview, projects,
  applications, API & MCP, settings) and the **project's** (its own
  resources). A service that belongs to the platform is not offered as if it
  were a project's.
- The signed-in operator lands on an **overview** with real numbers —
  counted over the caller's own projects only, and never over the platform.
- The flat tree of duplicate paths now redirects to the project console; the
  sidebar's active state works with the project's **slug**; the project's
  overview, members and activity are pages instead of query parameters; the
  mail console and the integrations have a way in.
- The **route inventory** — every route, its owner, where it is reachable
  from — is checked against the route tree on disk by a test.
- The evidence is in `docs/implementation/PHASE3_NAVIGATION.md`.

**Phase 4 — the design system: ✅ COMPLETE (2026-11-06)**

- The **tokens** (radii, elevation, depth, motion, and a focus ring that clears 3:1 where the
  old one sat at 1.1:1) and **sixteen shared components** in `packages/ui`.
- The shared **Modal** is a real dialog now — named, modal, focus-trapped, focus restored — and
  the **Button** no longer submits the form it sits in.
- Seven screens stand on the new foundations, and they were **looked at** at 1440×900 and at
  390×844: three things typechecking could not have caught were found and fixed.
- The evidence is in `docs/implementation/PHASE4_DESIGN_SYSTEM.md`; the contract is
  `docs/product/DESIGN_SYSTEM.md`.

**The npm registry and the GitHub connection (2026-11-06)** — the CLI is the registry's client
(`fidscript registry …`), every package is published from this repository to
registry.fidscript.com, and the GitHub account can be connected with a personal access token
when the deployment has no OAuth app. The contract is `docs/REGISTRY.md`.

**Phase 2 — the contract between the layers: ✅ COMPLETE (2026-11-06)**

- The objective: the API, the SDK and the dashboard must agree, the known
  integration failures must be gone, and there must be a testing foundation
  that proves it. **No visual redesign in this phase.**
- The scope is the Phase 0 audit's Phase 2 (B4, B5, the SDK's wrong paths,
  the missing test suites), plus the contract drift the audit did not name —
  found by comparing every SDK path against the API's real routes.
- The work is tracked in `docs/implementation/PHASE2_CONTRACTS.md` (the
  verification matrix) and in the task list; every fix carries a test.
- The Phase 1 security fixes stay protected by their regression tests, and
  **KI-10** (the environment variables' scope policy) is resolved here
  because it is an authorization question.
- **The evidence is in `docs/implementation/PHASE2_CONTRACTS.md`** — the
  verification matrix, the twelve defects closed, the testing foundation
  and the deferred list.
- **Phase 3 has not been started.**

**Phase 1 — isolation and authorization: ✅ COMPLETE (2026-11-06)**

- The audit's security findings are closed: the tenant boundary holds for project API keys, the
  project **role** is enforced (not just membership), the API is **default-deny**, the tokens and
  the secrets are handled in one place, and the installation, webhook, OAuth and metrics routes
  carry their own rules.
- **97 tests in 12 suites** (`pnpm test`), and the dashboard has its own runner. Every security
  fix has a test that proves it.
- Five further defects were found on the way and closed: a function's variables in plain text,
  the functions console without roles, an account-enumeration oracle, the magic code skipping MFA,
  and an open redirect in the login.
- The evidence is in `docs/product/UX_AUDIT.md` §3.1 and `docs/implementation/IMPLEMENTATION_LOG.md`.

*Phase 2 (the product and interface work) has not been started. The operator's instruction is to
stop at the phase boundary.*

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

*Phase 1 was authorized and is now complete.*

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
