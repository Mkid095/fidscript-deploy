# Current Phase

> The single source of truth for "what is in flight right now." If this file says one thing,
> only that one thing is being worked on — **one vertical slice at a time** (Execution
> Protocol). Updated at the start and end of every working session.

---

## In flight

**F02 — Authentication (frontend vertical slice)** — design system + auth pages + SDK integration.

## Not yet started

- **Phase C** (`PREREQ-PROJ-2/3`) — between F04 and F05.
- **F03 → F11** — per `docs/IMPLEMENTATION_ROADMAP.md`.

## Recently completed

**Phase B — ✅ LIVE-VERIFIED 13/13** (2026-06-20).

- ✅ `PREREQ-AUTH-1` — `mustChangePassword` field + migration + seed
- ✅ `PREREQ-AUTH-2` — `POST /auth/change-password` (endpoint **AUTH-18**)
- ✅ `PREREQ-AUTH-3` — platform magic-code (endpoints **AUTH-19** + **AUTH-20**)
- ✅ `PREREQ-AUTH-4` — flag surfaced on `GET /auth/me`
- (Phase A `PREREQ-AUTH-5/6/7` was already implemented — verified, not re-built.)

**Live verification catch:** `JwtStrategy.validate()` was checking user existence + token type
but **not** session validity. A revoked session (logout, change-password rotation,
`DELETE /sessions/:id`) left the access token still usable until its own 15-min expiry.
Fix: added session-expiry check in `validate()`. Verification script: 13/13 PASS.

## Blocked / waiting

- **Real email delivery** (KI-2 sub-gate) — magic-code email confirmed sent via Stalwart SMTP
  (logged); actual inbox delivery unconfirmed (needs a real inbox to check).
