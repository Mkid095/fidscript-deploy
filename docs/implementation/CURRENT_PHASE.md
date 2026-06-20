# Current Phase

> The single source of truth for "what is in flight right now." If this file says one thing,
> only that one thing is being worked on — **one vertical slice at a time** (Execution
> Protocol). Updated at the start and end of every working session.

---

## In flight

**Phase B — F02 functional blockers (Stage 0B of the roadmap).**

- **Goal:** add the four capabilities F02 Authentication depends on.
- **Spec / contract:** `docs/backend-prerequisites.md` → Phase B; `docs/phases/frontend/f02-auth.md`.
- **Phase A — ✅ CLOSED 2026-06-20:** all three platform-correctness items
  (`PREREQ-AUTH-5/6/7`) were already implemented in the code; the AUDIT was stale. Verified by
  code review + clean `pnpm typecheck`. Remaining gate: live HTTP verification on the VPS
  (tracked in `KNOWN_ISSUES.md`).
- **Phase B scope (4 items, AUTH-1 first as the foundation):**
  1. `PREREQ-AUTH-1` — `User.mustChangePassword` field + seed-true for the install admin *(migration + seed)*
  2. `PREREQ-AUTH-2` — `POST /auth/change-password` endpoint *(depends on AUTH-1)*
  3. `PREREQ-AUTH-3` — platform magic-code (`/auth/magic-code` + `/auth/verify-magic-code`); replaces the broken `verifyMagicLink` (`where user.email === token`)
  4. `PREREQ-AUTH-4` — `mustChangePassword` on `GET /auth/me` *(depends on AUTH-1)*
- **Next step:** implement AUTH-1 (the migration + seed), since AUTH-2 and AUTH-4 depend on it.

## Not yet started

- **F02** (the first vertical slice) — after Phase B.
- **F03 → F11** — per `docs/IMPLEMENTATION_ROADMAP.md`.

## Blocked / waiting

- Phase A live HTTP verification — pending a VPS bring-up (login → /me → logout → 401;
  refresh rotates). Code is verified-correct; this is the protocol's live-verification gate.
