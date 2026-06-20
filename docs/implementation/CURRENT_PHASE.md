# Current Phase

> The single source of truth for "what is in flight right now." If this file says one thing,
> only that one thing is being worked on — **one vertical slice at a time** (Execution
> Protocol). Updated at the start and end of every working session.

---

## In flight

**Phase A — Critical platform correctness (Stage 0A of the roadmap).**

- **Goal:** fix the broken token/session machinery so authentication is correct, independent
  of any frontend.
- **Spec / contract:** `docs/backend-prerequisites.md` → Phase A; `docs/phases/frontend/f02-auth.md`.
- **Scope (3 items, in order):**
  1. `PREREQ-AUTH-5` — logout is a no-op (carry `sessionId` in the access JWT; `POST /auth/logout` deletes the `Session` row)
  2. `PREREQ-AUTH-6` — refresh/session handling (signed refresh JWT, rotate on use)
  3. `PREREQ-AUTH-7` — `JWT_SECRET_FILE` honored by `auth.module` + `jwt.strategy`
- **Next step:** read the real auth code (`apps/api/src/modules/auth/services/*`,
  `jwt.strategy.ts`, `auth.module.ts`) to confirm the current state before editing (rule 12).
- **Exit criterion:** all 3 Phase A items ✅; `pnpm typecheck && pnpm build` clean; API healthy
  on VPS; login → /me 200; logout revokes; refresh rotates.

## Not yet started

- **Phase B** (`PREREQ-AUTH-1/2/3/4`) — after Phase A.
- **F02** (the first vertical slice) — after Phase B.
- **F03 → F11** — per `docs/IMPLEMENTATION_ROADMAP.md`.

## Blocked / waiting

- None. (External creds for real OAuth delivery are out of scope — platform auth is
  magic-code + password, not OAuth — ADR-032.)
