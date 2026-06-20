# F03 — First-Run Onboarding (full spec)

> **Status:** ⏳ Spec complete — pending approval.
> **Connects to:** backend `GET /api/v1/health` (`SVC-03`) + DNS / TLS / SMTP probes (derived from
> `backend/index.md` → Realtime event catalog and the Stalwart services). Cross-references F02 (the
> Continue → `/login` target) and F00 (the design system).

## 1. Purpose
The post-install welcome screen. Tells the installer "everything is up" with a live, readable
health board. Gates the first login so the user doesn't try to sign in against a half-up platform.
The implementation of the **"Production-Ready By Default"** principle (philosophy §3): the user
should *see* that the platform is production-ready before they touch it.

## 2. Business Goal
Replace the "is it working? what do I do next?" anxiety that follows a fresh install. Match the
out-of-box polish of Supabase / Vercel: open the URL, see a clean dashboard, log in.

## 3. Personas
- **Installer** (primary) — just ran `install.sh`; first thing they do is open the URL.
- **Returning admin** (secondary) — may revisit to confirm health after a maintenance window.

## 4. Complete User Journey
```
install.sh completes → terminal prints the Access URL + admin creds.
User opens the URL.
  → first-run cookie absent OR any health check not green → /onboarding.
  → screen renders with 5 health rows + a "Continue to login" CTA (disabled).
  → rows poll every 5s.
    Row: idle (gray) → running (spinner) → ✓ green / ✗ red.
    ✗ red row: inline reason + a "Fix" link (docs page for that check).
  → all rows green → banner: "100% ready — Continue to login" → CTA enables.
  → user clicks Continue → /login (F02).
Alternate / error paths:
  → a check stuck running for >30s → ✗ red with "Service did not respond — see logs"
    + a "View logs" link → `/dashboard/projects/<first>/logs` (post-auth).
  → check fails (✗ red) → user clicks "Continue anyway" (advanced users may want to
    fix later) → /login.
  → user refreshes → onboarding screen no longer enforced (first-run cookie set).
  → returning visit later → onboarding skipped.
```

## 5. Information Architecture
- `/onboarding` is a **standalone route**, outside `app/(marketing)` (the public site) and
  outside `app/(app)` (the authenticated dashboard).
- No project sidebar, no header, no footer — just the welcome card centered on the page.
- The card is the screen. There is no per-section nav.
- The only outbound links: Continue → `/login`; Fix → a docs page (within the public site).

## 6. Screen Specifications
- **`/onboarding`** — centered card on `bg-ink-950`, max-w-2xl.
  - **Header**: FIDScript logo + "FIDScript is installed" + "Let's confirm everything is healthy."
  - **Body**: 5 rows, each ~64px tall:
    1. **Docker services up** — `/health` reports all containers healthy.
    2. **Database reachable** — `/health.services.database` (or the DB-06 `/status` for the
       first project — but onboarding is pre-auth, so it uses `/health`).
    3. **Domain verified** — DoH probe of `deploy.<DOMAIN>` → resolves to `SERVER_IP`.
    4. **SSL certificate active** — HTTPS GET `https://deploy.<DOMAIN>/.well-known/fidscript` → 200.
    5. **Email working** — SMTP AUTH PLAIN to `fidscript_stalwart:465` succeeds.
  - **Per-row anatomy**: `[icon]` `[label]` `[one-line "why this matters"]` `[status badge]` `[Fix?]`.
  - **Footer**: "Continue to login" primary button (disabled while any row is red) +
    "Continue anyway" secondary (visible only if at least one row is red).
  - States: idle (rows gray), running (some rows spinning, others already green/red), all-green
    (banner + Continue enabled), some-red (Fix links + Continue anyway), all-red (still allow
    Continue anyway).

## 7. Component Specifications
- `<HealthBadge>` ✅ (`docs/product/components/health-badge.md`) — the per-row status icon
  (`healthy | unhealthy | unknown`) + color + label.
- `<Button>` ✅ — Continue (primary), Continue anyway (secondary/ghost).
- A new component `<CheckRow>` (one-line description + HealthBadge + optional Fix action). Spec'd
  here; a per-component spec in `docs/product/components/` can follow.
- `<Toast>` ✅ for errors during the checks (e.g. network failure).

## 8. API Mapping
- `GET /api/v1/health` (`SVC-03`) — aggregate health + per-service. Polled every 5s.
- `GET /api/v1/services` (`SVC-01`) — the service registry (alternative source for the Docker row).
- Domain probe — client-side DoH to `https://1.1.1.1/dns-query?name=deploy.<DOMAIN>&type=A` (Cloudflare
  DoH, returns `Answer[].data`). Compared to `SERVER_IP` from `.env`.
- SSL probe — client-side `fetch('https://deploy.<DOMAIN>/.well-known/fidscript')` (Traefik
  responds 200 with a fingerprint body).
- Email probe — NOT client-side (browser can't speak SMTP). Backend exposes a probe endpoint
  (or `/health.services.email`); the F03 implementation PR adds a thin `GET /api/v1/health/email`
  (documented in §14 of this spec as a backend prerequisite).

## 9. Backend Integration Map
```
/onboarding (poll loop)
  → GET /health                       (SVC-03)
      → row 1 (Docker): aggregate.status === 'ok'
      → row 2 (DB):      services.database.status === 'up'
  → GET /health/email (new)           → row 5
  → DoH probe                          → row 3 (domain)
  → HTTPS fetch                        → row 4 (SSL)
```

The screen is **polling-based** (5s interval). No realtime (it's pre-auth — no project to subscribe
to). The Continue → `/login` flow hands off to F02.

## 10. User Experience Specification
- **Live polling**, not a one-shot check. The user can watch rows turn green as services warm up.
- **Per-row copy is plain language** ("Database reachable", not "Postgres connection pool
  established"). Each row has a one-line "why this matters" tooltip / inline help.
- **Failure surfaces a reason** + a Fix link. Never a bare ✗.
- **"Continue anyway"** is a deliberate escape hatch (the principle: don't block a determined
  user). Visible only when ≥ 1 row is red.
- **Skippable on subsequent visits.** A `fidscript.onboarded=1` cookie (set on first
  green-Continue) prevents the screen from re-appearing.
- **No data entry.** There are no fields on this screen.

## 11. Design Philosophy
- **Configure once.** The installer handled everything. This screen verifies it.
- **Beginner first.** Plain language. Each check has a one-line "why."
- **Production-ready by default.** A failed check is a real problem, not a warning. The platform
  should not pretend everything is fine when it isn't.
- **Observable.** Live polling, not a one-shot "trust me, it works" spinner.
- **One dashboard.** This is part of that one dashboard; same design tokens, same a11y rules.

## 12. Configuration Philosophy
Zero user input on this screen. The user reads the results. The Fix links go to the **docs**
(not to a settings page — there is nothing to set; the installer's inputs are what need
correcting, or the platform's own state needs operator attention via logs).

## 13. Automation Rules
- **First-run cookie** (`fidscript.onboarded=1`) — set client-side on first green-Continue.
- **Polling** every 5s (client-side `setInterval`), stops when all rows green OR user navigates.
- **Skip on reload** if the cookie is present.

## 14. Endpoint Documentation
- `GET /api/v1/health` (`SVC-03`) — `{status, services: {docker, database, ...}, timestamp}`. Public.
- `GET /api/v1/health/email` (new endpoint, F03 backend prerequisite) —
  `{status: 'ok' | 'degraded', provider, lastChecked}`. Returns 200 + ok if SMTP AUTH PLAIN to
  `fidscript_stalwart:465` succeeds with the platform's submission creds. Public (pre-auth
  probing).
- DoH + HTTPS probes are client-side (no backend involvement).

## 15. Feature Dependency Graph
- **Hard backend prerequisites** (must close before F03 frontend implementation):
  1. `GET /api/v1/health/email` (new endpoint, smoke-test SMTP).
  2. `/health` must include per-service granularity (already does per the audit: `services.database`,
     etc.). Confirm `services.email` exists or add it.
- **Hard frontend dependencies:** F00 (design system), F02 (login target).
- **Hard cross-link:** the installer creates the first-run cookie via the platform domain
  (the cookie's domain is set to the platform domain).
- **Soft:** realtime (not used here — pre-auth, no project).
- **Backend gaps** that block this screen: the email probe endpoint (`/health/email`) does not
  currently exist; the spec flags it.

## 16. Acceptance Criteria
1. `/onboarding` renders after install on a fresh install. The 5 rows appear with idle gray.
2. Polling begins; rows transition to running → green as services respond.
3. When all 5 rows are green, a "100% ready" banner appears + the "Continue to login" button
   enables.
4. Continuing navigates to `/login` (F02).
5. If a check fails (e.g. DB unreachable), the row turns red with a one-line reason + a "Fix" link
   to the docs page that covers the installer's setup for that check.
6. The "Continue anyway" secondary action is visible only when ≥ 1 row is red.
7. After a successful Continue, a `fidscript.onboarded=1` cookie is set; the screen no longer
   appears on subsequent visits.
8. The screen is accessible (landmarks, focus order, reduced-motion).
9. No data entry is possible on this screen.
10. The screen never blocks a determined user for >2 minutes (poll timeout: each row goes red
    after 30s of running with no response, surfacing the failure).
11. `pnpm --filter @fidscript/dashboard build` clean; this spec updated to match shipped behavior.

## Change log
- 2026-06-20 — Initial full 16-section spec. Surfaces **2 backend prerequisites**: a new
  `GET /api/v1/health/email` endpoint, and confirmation that `/health.services.email` is exposed.
  Implementation must close these before the screen can be built.