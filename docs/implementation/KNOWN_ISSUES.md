# Known Issues

> Issues **discovered during implementation** — surprises, regressions, deferred fixes. This is
> the *unplanned* log; the *planned* gaps live in `docs/backend-prerequisites.md` and
> `docs/technical-debt.md`. If a known issue turns out to be a real blocker, promote it to a
> `PREREQ-*`.
>
> Format: `ID · date found · phase · description · status (open/fixed/deferred→owner)`.

---

## Open

- **KI-4 · 2026-11-06 · Phase 0 · A project API key is not bound to its project.** The `fpk_` guard
  attaches the key's project id to the request and never compares it with the URL's `:projectId`;
  `ProjectMemberGuard` and `ProjectAccessService` both short-circuit for API-key callers on the
  strength of a check that does not exist. **Verified live**: a key minted for project A read
  project B, **renamed** it, and listed its databases. **Status: open (blocker)** — see
  `docs/product/UX_AUDIT.md` B1.
- **KI-5 · 2026-11-06 · Phase 0 · The email console is empty, and adding a domain crashes the
  page.** The SDK unwraps `{domains}`/`{mailboxes}`/`{aliases}` from three endpoints that return a
  bare array, so every list is empty; and the create call's response envelope is pushed into the
  list as a row, so `domain.id.slice()` throws. **Verified live** on both the flat and the
  project-scoped email screens. **Status: open (blocker)** — UX_AUDIT B4, B5.
- **KI-6 · 2026-11-06 · Phase 0 · A project `viewer` can mint an admin invitation and a
  write-scoped API key.** Membership is enforced on all 26 project-scoped controllers; the *role*
  is enforced on none of them. **Verified live.** **Status: open (blocker)** — UX_AUDIT B6.
- **KI-7 · 2026-11-06 · Phase 0 · Three entries in `docs/technical-debt.md` are stale.** TD-SEC-5
  says the functions runtime has no sandboxing; it has `--network none`, a read-only rootfs,
  `--cap-drop ALL` and code over stdin. TD-SEC-1/2/3 say the domains/email/storage endpoints
  skip project-access checks; they check **membership** — what is missing is **role** enforcement.
  **Status: open** — the debt file needs rewriting, which is part of Phase 1.

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
