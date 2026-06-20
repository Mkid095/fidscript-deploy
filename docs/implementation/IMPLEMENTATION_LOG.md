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
