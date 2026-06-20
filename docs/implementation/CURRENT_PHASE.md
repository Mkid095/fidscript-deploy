# Current Phase

> The single source of truth for "what is in flight right now." If this file says one thing,
> only that one thing is being worked on — **one vertical slice at a time** (Execution
> Protocol). Updated at the start and end of every working session.

---

## In flight

**Phase B — F02 functional blockers (Stage 0B). 3 of 4 closed; AUTH-3 remaining.**

- **Phase A — ✅ CLOSED:** `PREREQ-AUTH-5/6/7` were already implemented (AUDIT was stale);
  verified by code review + clean typecheck. Live HTTP verification pending (KI-2).
- **Phase B progress:**
  - ✅ `PREREQ-AUTH-1` — `mustChangePassword` field + migration + seed
  - ✅ `PREREQ-AUTH-2` — `POST /auth/change-password` (endpoint **AUTH-18**; rotates session)
  - ✅ `PREREQ-AUTH-4` — flag surfaced on `GET /auth/me`
  - ⏳ **`PREREQ-AUTH-3` — platform magic-code (NEXT)**

### AUTH-3 — the next unit (plan)

`POST /auth/magic-code` + `POST /auth/verify-magic-code` (inventory IDs **AUTH-19** + **AUTH-20**).
- New `MagicCode` model (Prisma) + migration: `{ email, codeHash, expiresAt(10m), attempts, consumed }`.
- New `AuthMagicCodeService`: generate 6-digit OTP (`crypto.randomInt`), bcrypt-hash, persist,
  deliver via `SmtpSendService` (omit `from` → uses `SMTP_FROM`), rate-limited via the existing
  `AuthRateLimiter`; verify path checks hash + expiry + attempts (≤5), mints a session.
- Removes the **broken** `verifyMagicLink` (`where user.email === token`) — `AUTH-05/06` routes
  retired (IDs never recycled — rule 20; inventory rows marked deprecated).
- **Live verification requires the VPS** (a real code must arrive in an inbox). Code-complete +
  typecheck-green is the unit gate; live email delivery is the phase sign-off gate.

## Not yet started

- **F02** (the first frontend vertical slice) — after Phase B is fully closed + live-verified.
- **F03 → F11** — per `docs/IMPLEMENTATION_ROADMAP.md`.

## Blocked / waiting

- Phase A + AUTH-1/2/4 live HTTP verification — pending a VPS bring-up (login → /me → logout →
  401; refresh rotates; change-password clears the flag + rotates; /me returns the flag). Code
  is verified-correct; this is the protocol's live-verification gate (KI-2).
