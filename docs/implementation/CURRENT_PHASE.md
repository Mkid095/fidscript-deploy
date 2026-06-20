# Current Phase

> The single source of truth for "what is in flight right now." If this file says one thing,
> only that one thing is being worked on — **one vertical slice at a time** (Execution
> Protocol). Updated at the start and end of every working session.

---

## In flight

**Phase B — ✅ CODE-COMPLETE (all 4 items closed). Live verification is the remaining gate.**

- ✅ `PREREQ-AUTH-1` — `mustChangePassword` field + migration + seed
- ✅ `PREREQ-AUTH-2` — `POST /auth/change-password` (endpoint **AUTH-18**)
- ✅ `PREREQ-AUTH-3` — platform magic-code (endpoints **AUTH-19** + **AUTH-20**)
- ✅ `PREREQ-AUTH-4` — flag surfaced on `GET /auth/me`
- (Phase A `PREREQ-AUTH-5/6/7` was already implemented — verified, not re-built.)

**Next:** bring up the API on the VPS, run the two pending migrations
(`20260620120000_auth_must_change_password`, `20260620130000_auth_magic_code`), re-seed so the
admin gets `mustChangePassword=true`, and run the live-verification checklist (KI-2):
login → /me (returns `mustChangePassword`) → change-password (clears flag, rotates) → /me
(flag now false) → logout → next call 401 → refresh rotates → magic-code arrives in an inbox
+ verifies → wrong/expired/thrice-failed codes rejected.

## Not yet started

- **F02** (the first frontend vertical slice) — after Phase B is live-verified.
- **Phase C** (`PREREQ-PROJ-2/3`) — between F04 and F05.
- **F03 → F11** — per `docs/IMPLEMENTATION_ROADMAP.md`.

## Blocked / waiting

- **Phase B live verification (KI-2)** — needs the VPS: migrate, re-seed, exercise the auth
  flows over HTTP, confirm the magic-code email actually arrives. This is the protocol's
  live-verification + phase-sign-off gate. Code is verified-correct + typecheck/build green.
