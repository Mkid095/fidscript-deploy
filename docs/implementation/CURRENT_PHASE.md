# Current Phase

> The single source of truth for "what is in flight right now." If this file says one thing,
> only that one thing is being worked on — **one vertical slice at a time** (Execution
> Protocol). Updated at the start and end of every working session.

---

## In flight

*None — awaiting next directive.*

## Not yet started

- **Phase C** (`PREREQ-PROJ-2/3`) — between F04 and F05.
- **F04 → F11** — per `docs/IMPLEMENTATION_ROADMAP.md`.

## Recently completed

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
