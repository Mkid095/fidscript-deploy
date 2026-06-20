# Implementation Log

> Reverse-chronological record of **what actually happened** while building — one entry per
> working session. Not a spec (those live in `docs/product/` + `docs/phases/frontend/`); this
> is the history. Future models read this to understand *why something changed on a given day*.
>
> Entry format:
> ```md
> ## YYYY-MM-DD
> Phase: <phase>
> Completed:
> - <concrete thing>
> Unexpected issues:
> - <what surprised us>
> Decision:
> - <what we chose and why>
> Impact:
> - <API / migration / doc / cross-phase effects>
> ```

---

## 2026-06-20

Phase: Documentation-first (pre-implementation)

Completed:
- Wrote the full frontend blueprint: F00–F11 phase specs, 12 service specs, 19 per-screen
  specs, 30/30 component specs, 5 backend-inventory cluster files.
- Ran Phase D0 validation: 0 broken cross-references; implementation matrix (13/16 buildable
  now); API readiness ~89%; UX consistency pass.
- Created the contract layer: `docs/VALIDATION.md`, `docs/backend-prerequisites.md` (9 Open,
  A→B→C phased), `docs/IMPLEMENTATION_ROADMAP.md`, `docs/DEFINITION_OF_DONE.md`,
  `docs/EXECUTION_PROTOCOL.md`, `docs/technical-debt.md`.
- Added 7 product-rationale ADRs (029–035) to `DECISIONS.md`; froze the blueprint (CLAUDE.md
  rules 16–20).

Decision:
- Freeze the documentation as the contract before any code. Implementation begins with Phase A
  (platform correctness), then Phase B, then F02 as the first vertical slice.

Impact:
- No code changes this session — documentation only. Backend remains as verified
  (`docs/AUDIT.md` §C + this session's deployment/functions proofs).

## 2026-06-20 (later) — Stage 0A opened

Phase: Phase A (platform correctness)

Completed:
- Ran the execution protocol's first step (research) on the auth code before editing.
- Found **Phase A was already implemented**: `auth-session.service.ts` (signed refresh JWT +
  sessionId in access JWT), `auth-token.service.ts:refreshToken` (rotation), `jwt.strategy.ts`
  (surfaces sessionId), `auth-login.service.ts:logout` (revokes the Session row),
  `common/secrets.ts:resolveJwtSecret` (JWT_SECRET_FILE, fails-closed).
- Regenerated the stale Prisma client (`sourceUrl` was in `schema.prisma` but not the generated
  client) → `pnpm --filter @fidscript/api typecheck` now clean.
- Flipped `PREREQ-AUTH-5/6/7` to ✅ Closed in the registry with verification notes.

Unexpected issues:
- `docs/AUDIT.md` "Auth: BROKEN" verdict (2026-06-16) was **stale** — the hardening happened
  after the audit but the audit was never updated. Caught by rule 12 (research before implement).
- The repo failed typecheck on a *deployments* file (`sourceUrl`) due to a stale Prisma client,
  not an auth problem — fixed with `prisma generate`.

Decision:
- Do NOT re-implement Phase A. Record it as closed-by-verification and move to Phase B, which is
  confirmed still genuinely missing (mustChangePassword, change-password, magic-code, /me flag).

Impact:
- No auth code changes (it was already correct). Prisma client regenerated. Registry, AUDIT,
  CURRENT_PHASE, and this log updated to reflect reality. Phase B is now the active work.

## 2026-06-20 (later) — Phase B / Unit 1: AUTH-1 + AUTH-4

Phase: Phase B (F02 functional blockers)

Completed:
- `PREREQ-AUTH-1`: added `mustChangePassword Boolean @default(false)` to `User` in
  `schema.prisma`; migration `20260620120000_auth_must_change_password` (ADD COLUMN DEFAULT
  false — no disruption to existing rows); seed sets `true` on the fresh-install admin.
- `PREREQ-AUTH-4`: `auth-profile.service.ts:getProfile` now selects `mustChangePassword`, so
  `GET /auth/me` returns the flag.
- Regenerated the Prisma client; `pnpm --filter @fidscript/api typecheck` + `build` both clean.

Unexpected issues:
- None. The field slotted cleanly into the existing User model + profile select.

Decision:
- AUTH-1 + AUTH-4 shipped together as "Unit 1" — the flag exists (schema/migration/seed) AND is
  observable (/me). They're the read half of the force-change-password flow. AUTH-2 (the write
  half — change-password endpoint) and AUTH-3 (magic-code) are separate units.
- Existing deployed admins are NOT retroactively flagged (migration is DEFAULT false, seed only
  flags on create). Rationale: least-surprise for an already-operating admin; the policy is for
  fresh installs. An operator who wants the flag on an existing admin runs a one-line UPDATE.

Impact:
- DB: one new migration (`20260620120000_auth_must_change_password`). API: typecheck + build
  clean. `/auth/me` response gains a `mustChangePassword` boolean. No endpoint ID changes
  (AUTH-4 extends AUTH-02's response, doesn't add an endpoint). Live verification pending (KI-2).

## 2026-06-20 (later) — Phase B / Unit 2: AUTH-2 change-password

Phase: Phase B (F02 functional blockers)

Completed:
- `PREREQ-AUTH-2`: `POST /auth/change-password` (endpoint **AUTH-18**). New
  `ChangePasswordDto` (currentPassword; newPassword ≥12 + upper+lower+number); new focused
  `AuthPasswordService` (verifies current via bcrypt, rejects new===current, hashes new,
  clears `mustChangePassword`, revokes the originating session, mints a fresh session +
  tokens, emits `identity.user.password_changed`); wired through `auth.module` →
  `AuthService` → `AuthController`.
- Added `identity.user.password_changed` to the `EventType` union (`packages/events`).
- Added `AUTH-18` to the inventory; updated `AUTH-10` to list `mustChangePassword` in its
  response (AUTH-4).
- Rebuilt `@fidscript/events`; `pnpm --filter @fidscript/api typecheck` + `build` clean.

Unexpected issues:
- Two typecheck errors caught by the gate (good): (1) forgot the DTO barrel export — fixed;
  (2) `identity.user.password_changed` wasn't in the `EventType` union — added it + rebuilt
  the events package (the api resolves `@fidscript/events` to its built `dist/`, so editing
  src alone wasn't enough).

Decision:
- Change-password rotates the session (revoke originating + mint fresh) rather than leaving
  the old token valid. Rationale: the flag-clearing should be reflected in a fresh token and
  the old (pre-change) token should not remain usable. Returns the same shape as login so the
  client swaps tokens.
- Endpoint ID assigned **AUTH-18** (next free platform AUTH ID; AUTH-17 was the prior max —
  the `APPAUTH-*` IDs are a separate cluster and don't consume AUTH numbers). Immutable-ID
  rule 20 honored.

Impact:
- New endpoint AUTH-18; new event type; one new service + DTO. VALIDATION re-run: 0 broken
  references. Open count 4 → 3. Only `PREREQ-AUTH-3` (platform magic-code) remains in Phase B.

## 2026-06-20 (later) — Phase B / Unit 3: AUTH-3 platform magic-code (Phase B COMPLETE)

Phase: Phase B (F02 functional blockers)

Completed:
- `PREREQ-AUTH-3`: platform magic-code login (endpoints **AUTH-19** + **AUTH-20**).
  - `MagicCode` model + migration `20260620130000_auth_magic_code` (bcrypt codeHash, 10m expiry, attempts, consumed).
  - `AuthMagicCodeService`: 6-digit `crypto.randomInt` (uniform), bcrypt-10 hash, ≤5 attempts,
    per-IP + per-email send rate limits (reuses `AuthRateLimiter`); verify consumes the code +
    nulls earlier unconsumed codes + mints a session. Always returns `{sent:true}` (no email-exists leak).
  - **New `PlatformMailService`** (email module) — sends system mail via Stalwart with NO
    project context (magic-code, future password-reset/notifications). Exported from EmailModule;
    AuthModule imports EmailModule to inject it.
  - Removed the broken `verifyMagicLink` (`where user.email === token`) from `AuthTokenService`;
    removed `magic-link`/`verify-magic-link` routes + the `MagicLinkDto`. **AUTH-05/06 retired**
    (inventory rows marked retired; IDs never recycled — rule 20).
  - EventType union: `identity.user.magic_code_sent`, `identity.user.magic_code_verified`.
  - `pnpm --filter @fidscript/api typecheck` + `build` clean; VALIDATION: 0 broken refs.

Unexpected issues:
- **The F02 spec's delivery assumption was wrong.** It said "deliver via SmtpSendService (omit
  dto.from)." Reading the real `SmtpSendService.send` (rule 12) showed it is **project-scoped**
  — it does `project.findUnique` and writes an `EmailMessage` row tied to a project. Platform
  magic-code has no project. No project-less sender existed (the monitoring email notifier is
  also project-scoped). → Created `PlatformMailService` as the clean fix.

Decision:
- `PlatformMailService` as a separate service (not a method on `SmtpSendService`) because (a)
  `SmtpSendService` is already 165 lines (over the 150-line rule — adding to it worsens that);
  (b) project-mail and platform-mail are genuinely different concerns (sender-identity +
  suppression + usage tracking vs none). The Stalwart transporter config is duplicated (~6
  declarative lines) — logged as minor tech debt (DRY via a shared transporter builder later).
- Endpoint IDs **AUTH-19** + **AUTH-20** (next free, after AUTH-18). AUTH-05/06 retired, not recycled.

Impact:
- 2 new endpoints (AUTH-19/20), 2 new event types, 1 new model + migration, 2 new services
  (`AuthMagicCodeService`, `PlatformMailService`), EmailModule exports `PlatformMailService`.
- **Phase B is code-complete (all 4 items closed).** Registry: Open 3 → 2 (Phase C only).
  F02 is unblocked on the backend. Remaining gate: live verification on the VPS (login/logout/
  refresh/change-password/magic-code email delivery) — KI-2.

## 2026-06-20 (later) — Phase B live verification + JwtStrategy bug fix

Phase: Phase B / Verification

Completed:
- Ran `/tmp/auth_verify.sh` against the live API on the VPS (13 checks).
- **10 PASS / 3 FAIL on first run.** Two failures shared one root cause (real bug):
  1. "old token rejected after change-password" → got 200, want 401.
  2. "/me after logout → 401" → got 200, want 401.
- Root cause: `JwtStrategy.validate()` checked user existence + token type but **not session validity**.
  A revoked/expired `Session` row left the access token usable until its own 15-min expiry.
  This is exactly what live verification is for.
- **Fix:** Added session-expiry check in `jwt.strategy.ts:validate()`. When `sessionId` is present
  in the payload, verify the `Session` row is still valid (`expiresAt > now`).
- Third failure: "verify known code → 200" → got 401. Root cause: pgcrypto extension not loaded
  on the test database. Fixed with `CREATE EXTENSION pgcrypto;` + retry with bcrypt-compatible hash.
- **Second run: 13/13 PASS.** All Phase A + B flows verified end-to-end over HTTP.
- Committed fix as `f78a60c fix(auth): enforce session validity in JwtStrategy.validate()`.

Unexpected issues:
- The session-revocation bug was invisible to code review — all individual services (logout,
  change-password, session deletion) were correct in isolation. Only the interaction between
  `validate()` and the session-scoped JWT revealed it. This is precisely why live verification
  exists in the execution protocol.

Decision:
- Live verification is a mandatory gate, not optional polish. The execution protocol's Step 6
  (live verification) exists to catch exactly this class of bug.

Impact:
- JwtStrategy now enforces session validity on every guarded request. Phase B is fully
  live-verified (13/13 PASS). Phase B is complete. F02 frontend is the next target.

## 2026-06-20 (later) — F02 auth frontend implemented

Phase: F02 Authentication (frontend vertical slice)

Completed:
- SDK auth module: fixed to match real API — `login`/`register` return `{accessToken, refreshToken,
  user}` (was: wrong shape), session via `/auth/me` (was: wrong path), added `sendMagicCode`,
  `verifyMagicCode`, `changePassword`, `refreshToken` with correct request/response shapes.
- `User` type: added `mustChangePassword: boolean`.
- `AuthContext`: dual-token storage (`accessToken` + `refreshToken` keys), session hydration via
  `/auth/me`, auto-refresh on 401, `mustChangePassword` flag drives redirect to `/force-change-password`.
  All auth methods throw so forms handle errors inline. `?next` param preserved for post-login redirect.
- `AuthGuard`: unauthenticated → `/login?next=<path>`; `mustChangePassword` → `/force-change-password`.
- Login page: segmented `[Email] [Magic code]` tab control; magic-code tab: send → masked email shown →
  6-digit OTP input (auto-advance, paste support, 30s resend countdown) → verify → session.
- Register page: name + email + password (12+ chars minimum, live strength meter, confirm match).
  Proper validation (upper+lower+number) matching backend rule.
- force-change-password page: current + new (strength meter) + confirm; backend strength rules in
  validation; redirects to `?next` or `/dashboard` on success.
- New components: `PasswordStrength` (3-bar weak/fair/strong), `MagicCodeInput` (6 OTP boxes with
  paste support via `onPaste`).
- Build: `pnpm --filter @fidscript/dashboard typecheck` clean; `build` clean with all 3 auth routes
  in the generated route manifest (`/login`, `/register`, `/force-change-password`).

Unexpected issues:
- SDK `dist/` (compiled types) was stale — `auth.ts` edits weren't visible to the dashboard's tsc
  until `pnpm --filter @fidscript/sdk build` was run. Dashboard imports from `@fidscript/sdk` which
  resolves to `dist/`, not the raw ts. Fix: rebuild SDK before checking dashboard types.
- `ClipboardEvent.clipboardData` is on `ClipboardEvent`, not `KeyboardEvent` — `handlePaste` must be
  a `ClipboardEvent` handler, not a `KeyDown` sub-branch.

Decision:
- SDK types are the authoritative API contract — the dashboard must import from `@fidscript/sdk` and
  the SDK's `dist/` must be rebuilt whenever auth interfaces change. Add `pnpm sdk build` as a
  required step before dashboard typecheck when editing SDK auth types.

Impact:
- F02 is implemented: login, register, magic-code send/verify, force-change-password, SDK updated.
  F03 (onboarding) is the next vertical slice per `docs/IMPLEMENTATION_ROADMAP.md`.
