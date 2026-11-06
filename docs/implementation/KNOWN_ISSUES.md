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
  project B, **renamed** it, and listed its databases. **Status: FIXED (Phase 1)** — the guard
  compares the two projects and the service fails closed; **verified live**: a key on project A
  answers 403 on project B and 200 on its own. See `docs/product/UX_AUDIT.md` B1.
- **KI-5 · 2026-11-06 · Phase 0 · The email console is empty, and adding a domain crashes the
  page.** The SDK unwraps `{domains}`/`{mailboxes}`/`{aliases}` from three endpoints that return a
  bare array, so every list is empty; and the create call's response envelope is pushed into the
  list as a row, so `domain.id.slice()` throws. **Verified live** on both the flat and the
  project-scoped email screens. **Status: open (blocker)** — UX_AUDIT B4, B5.
- **KI-6 · 2026-11-06 · Phase 0 · A project `viewer` can mint an admin invitation and a
  write-scoped API key.** Membership is enforced on all 26 project-scoped controllers; the *role*
  is enforced on none of them. **Verified live.** **Status: FIXED (Phase 1)** — the role is the
  member's own role now, and the functions console was given the same rules (a viewer may read
  and nothing else; a developer may write, deploy and invoke but not delete). **Verified live**: a
  viewer is refused the administrator operations with 403, and the owner keeps them. UX_AUDIT B6.
- **KI-7 · 2026-11-06 · Phase 0 · Three entries in `docs/technical-debt.md` are stale.** TD-SEC-5
  says the functions runtime has no sandboxing; it has `--network none`, a read-only rootfs,
  `--cap-drop ALL` and code over stdin. TD-SEC-1/2/3 say the domains/email/storage endpoints
  skip project-access checks; they check **membership** — what is missing is **role** enforcement.
  **Status: FIXED (Phase 1)** — the debt file is rewritten: TD-SEC-5 is now the three narrower
  gaps that are real (`TD-SEC-5a`–`d`), TD-SEC-1/2/3 say "membership, not role", and TD-SEC-4 is
  resolved.

- **KI-8 · 2026-11-06 · Phase 1 · The email bootstrap failed on every start.** The platform's own
  secret lookup asked Prisma for a `secret` row by `{ projectId: null, key }`, and a composite
  unique lookup with a null column is invalid — the API logged
  `Invalid this.prisma.secret.findUnique() invocation` and the email bootstrap was skipped, so
  the platform's domains were never connected to Stalwart. **Pre-existing** (not introduced by
  this phase) and one of the reasons the email console is empty. **Status: FIXED (Phase 1)** — a
  null project is found with `findFirst`, written as find-then-update-or-create and deleted with
  `deleteMany`; a project's secret keeps the compound lookup. Four tests cover it.
- **KI-11 · 2026-11-06 · Phase 1 · The platform's own mail domains cannot be registered.** The email
  bootstrap registers the platform's domains against `PLATFORM_PROJECT_ID`, which is not set — so the
  platform falls back to a nil id and the insert fails on the foreign key
  (`domains_project_id_fkey`). The platform has no project of its own to own them. Two further
  causes sit behind it, both recorded by the Phase 0 audit: the SDK unwraps an envelope the API
  never sends (the email console is empty), and the mail server's admin JMAP session answers 400
  for the recovery admin. **Status: open** — Phase 3 (the email console).
- **KI-9 · 2026-11-06 · Phase 1 · The dashboard cannot complete a sign-in for an account with MFA
  enrolled.** The API answers `{ mfaRequired: true, mfaToken }` on both the password path and the
  code path, and the dashboard's login ignores the field, so there is no session. The API is
  correct; the frontend step is missing (F02 is still a spec). **Status: open** — Phase 2/F02.
- **KI-10 · 2026-11-06 · Phase 1 · `GET /projects/:id/env-vars` carries no scope requirement.** A
  project key reads the project's variable **names** whatever its scopes; the values stay masked.
  **Status: open** — one line of work, deferred with the rest of the scope audit.

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
