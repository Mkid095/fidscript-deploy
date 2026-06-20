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
  `pnpm prisma generate`. **Status: closed** — `prisma generate` now in Dockerfile and dev
  workflow.
- **KI-2 · 2026-06-20 · Phase A · Live HTTP verification of auth.** Phase A code verified-by-review
  + typecheck-green; protocol's live-verification step now exercised. 13/13 PASS. **Status: open
  (sub-gate)** — magic-code email confirmed sent via Stalwart SMTP (logged); actual inbox delivery
  unconfirmed (needs a real inbox to verify). Core session revocation verified. Owner: next session.
- **KI-3 · 2026-06-20 · Phase B · `verifyMagicLink` is broken.** `auth-token.service.ts:verifyMagicLink`
  queries `where: { user: { email: dto.token } }` — it treats the submitted token AS an email.
  **Status: fixed** — removed in AUTH-3 (commit `f78a60c`); AUTH-05/06 retired, never recycled.

---

## Resolved

*(populate as issues are closed)*
