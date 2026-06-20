# Known Issues

> Issues **discovered during implementation** — surprises, regressions, deferred fixes. This is
> the *unplanned* log; the *planned* gaps live in `docs/backend-prerequisites.md` and
> `docs/technical-debt.md`. If a known issue turns out to be a real blocker, promote it to a
> `PREREQ-*`.
>
> Format: `ID · date found · phase · description · status (open/fixed/deferred→owner)`.

---

## Open

- **KI-1 · 2026-06-20 · Phase A · Stale Prisma client breaks typecheck.** `apps/api` typecheck
  failed on `deployment-crud.service.ts:27` (`sourceUrl` not in Release type) because the
  generated Prisma client predated `Release.sourceUrl` in `schema.prisma`. Fixed by
  `pnpm prisma generate`. **Status: open (process)** — `prisma generate` must run before any
  typecheck/build; ensure the Dockerfile + dev workflow run it. Owner: build/CI.
- **KI-2 · 2026-06-20 · Phase A · Live HTTP verification of auth not yet run.** Phase A code is
  verified-by-review + typecheck-green, but the protocol's live-verification step (login → /me →
  logout → next call 401; refresh rotates the token) has not been exercised against the running
  API on the VPS. **Status: deferred** — pending a VPS bring-up. Blocks full Phase A sign-off
  (the checkpoint report). Owner: next session.
- **KI-3 · 2026-06-20 · Phase B · `verifyMagicLink` is broken.** `auth-token.service.ts:verifyMagicLink`
  queries `where: { user: { email: dto.token } }` — it treats the submitted token AS an email.
  This is the broken magic-link path the AUDIT flagged; `PREREQ-AUTH-3` (magic-code) replaces
  it. **Status: open** — will be removed when AUTH-3 lands.

---

## Resolved

*(populate as issues are closed)*
