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

## 2026-11-06 — Phase 1: isolation and authorization

Phase: Phase 1 (security only — no product or interface work)

Completed:
- **The test harness came first.** `apps/api/jest.config.js` did not exist, `pnpm test` in the API
  was `jest --passWithNoTests` (so an empty suite was a green suite), and turbo's `test` task
  depended on the API's own build — a 3m43s tax before every test run. The harness is real now:
  **97 tests in 12 suites**, and the dashboard has its own runner (`node --test`, no new
  dependency).
- **Tenant isolation (B1).** `ProjectMemberGuard` now compares the key's project with the route's,
  `ProjectAccessService` fails closed for a key whose project cannot be resolved, and the four
  services that carried their own copies of the access check now use the one implementation.
- **Role enforcement (B6).** `checkPermission` compared the member's role with the allowed list —
  but every call site passed `['admin','owner']` and the check tested whether `'owner'` was in
  that list, so it returned before the member was even looked up. A viewer could delete the
  project, mint an API key, write environment variables and add an admin. The role is the
  member's own role now, and the functions console got the same treatment.
- **Tokens, sessions and secrets (B10, B11).** One implementation of "what a token is worth"
  (`AccessTokenService`) is used by both the session strategy and the composite guard, so they
  cannot disagree — a refresh token presented as a bearer token used to authenticate. The mail
  server's password is redacted, the login code is not logged, and a queue message's body is
  logged by length.
- **The installation routes (B2), the mail webhooks (B3), the Cloudflare OAuth callback (B12),
  the doubled `api/v1` prefix (B9), and the default-allow API (B13)** — each with a test and a
  live check.
- **The metrics endpoint** no longer names every project to anyone who asks: the scrape carries a
  token, and without one the platform's own series are served and the per-project ones are not.
- **A function's variables** were stored in plain text and returned to every member of the
  project. They are encrypted on write, masked on read for anyone who does not administer the
  project, and decrypted only for the runtime — and a page that saves the mask back does not
  overwrite the secret with the word "masked".
- **Five defects Phase 1 found on its own reading of the code**, not in the audit: the sign-in
  lookup said whether an address had an account; the login code skipped the second factor; the
  login's `next` parameter could send a person to another site; the account's API keys page
  listed the **first project's** keys; and the MCP server's scope check failed open.
- **The SDK** was corrected against the API: the ten paths that did not exist, the database's
  backup calls that carried no project, the template categories that asked about a project that
  does not exist, and the invitation endpoint.

Unexpected issues:
- **The API would not start.** `ApiKeyOrJwtGuard` gained a dependency on `AccessTokenService`,
  and the guard is instantiated in the context of whichever module declares the controller —
  twelve of them do not import the auth module. The platform that could not be constructed is a
  platform that does not start. The token service is now resolved through the module reference,
  the way the guard already resolved the two API-key services.
- **The Docker build could not read its own context.** `installer/docker/secrets` is root-only,
  and the build context is the repository root. The secrets are now excluded from the context —
  they are mounted at RUN time and must never be part of a build.
- **The database's `secret.findUnique` with a null project id is invalid in Prisma**, so the
  email bootstrap fails on every start (`Invalid this.prisma.secret.findUnique() invocation`).
  Pre-existing, not caused by this phase, and it is one of the reasons the email console is
  empty. Recorded as `KI-8`.

Decision:
- **The functions console was given roles rather than left open.** A viewer may read and nothing
  else; a developer may write, deploy and invoke but not delete; the deletion is the owner's and
  the admin's alone. The screen inventory already said a viewer sees no "Deploy", no "Invoke"
  and no env edit — this makes the API agree with the specification instead of inventing a rule.
- **The sign-in lookup answers with the platform's method, not the account's.** A per-account
  answer cannot be returned without being an oracle; a platform-level answer is true, and it is
  what the dashboard's own login page already used.
- **Two defects outside the security mandate were fixed because the platform was visibly broken
  by them**: the platform's own secrets could not be read at all (a Prisma compound lookup cannot
  match a NULL column, so the email bootstrap failed on every start of the API), and the mail
  server's credential was handed over whole (`admin:admin:<hash>` instead of `admin:<hash>`).
  Both have tests. The remaining causes of the empty email console are Phase 3's, and are recorded
  as KI-11.
- **The verification data was removed afterwards.** Two projects, two members, one function, one
  account key and one project key were created to prove the rules against the running platform,
  and every one of them was deleted afterwards — along with the eight `smoke-test-*` projects an
  earlier verification had left behind. The platform has no projects and no test users now, as it
  did before.

Impact:
- **API:** authorization is default-deny; every project-scoped route is tenant-bound and, where
  the screen inventory says so, role-bound. The SDK, the MCP server and the dashboard were
  corrected to match.
- **No migration.** Nothing in the schema changed: the function's variables were encrypted with
  the platform's existing AES-256-GCM `CryptoService`, and the platform has no functions with
  variables, so there was nothing to re-encrypt.
- **Documentation:** `docs/technical-debt.md` was **corrected**, not merely updated —
  `TD-SEC-5` was wrong and is rewritten as the three gaps that are real; `docs/product/UX_AUDIT.md`
  §3.1 records what Phase 1 closed and how it was proved.
- **The 150-line rule.** Every file this phase created or grew is under the limit: the functions
  console was split into a reading controller and a writing controller, the variables into their
  own service, the MCP server's scope check and its tool dispatcher into their own modules, the
  code mail out of the magic-code service, and the code exchange into a service of its own.
  **Three files that were already over the limit are still over it** — `cloudflare-oauth.service.ts`
  (329), `domain-email-key.service.ts` (197) and `installation.service.ts` (557). This phase made
  each of them **smaller**; splitting them properly is a Phase 2 piece of work.

## 2026-11-06 — Phase 0: the product, architecture and journey audit

Phase: Phase 0 (audit only — no feature code)

Completed:
- `docs/product/UX_AUDIT.md`: the true state of the product, established by reading all 68
  dashboard routes and 62 API controllers, cross-referencing every SDK module against the live
  API's response shapes, tracing the six user journeys, and driving the live platform in a
  browser. It supersedes `docs/FRONTEND_AUDIT.md` (the 2026-07-31 snapshot).
- Eleven blockers found, of which three were reproduced live against the running platform:
  - an `fpk_` project API key reads **and renames** another project (tenant isolation does not
    hold for project keys);
  - a project `viewer` can mint an **admin invitation** and a **write-scoped API key**;
  - the email console is empty everywhere (the SDK unwraps an envelope the API never sends) and
    adding a domain **crashes the page** (the API's response envelope is pushed into a list of
    domain rows).
- Corrected three stale findings in `docs/technical-debt.md`: the functions runtime **is**
  sandboxed (`--network none`, read-only rootfs, `--cap-drop ALL`, code over stdin), and the
  domains/email/storage endpoints **do** check project membership — the real gap is that the
  project *role* is enforced nowhere.

Unexpected issues:
- The `ErrorState` component is specified in `docs/product/components/error-state.md` and
  catalogued as implemented, but **it does not exist**. That single omission is the root of 113
  swallowed errors and ~110 raw error strings.
- `ToastProvider` is mounted in 5 of 68 pages and its context default is a silent no-op, so **84%
  of the product's "it worked" messages render nothing**.
- Five controllers carry a literal `api/v1` in their path while the app sets a global `api/v1`
  prefix — 21 routes live at `/api/v1/api/v1/…`.
- The sidebar builds its hrefs from the project **UUID** while the projects list navigates by
  **slug**, so no sidebar item is highlighted after opening a project from the list.

Decision:
- The audit is a document, not a code change. Nothing was implemented in this phase: the
  directive is explicit that the audit must establish the baseline before a redesign, and several
  findings change the shape of the later phases (the roadmap is reordered to put isolation and
  authorization first, and the first test suite lands in Phase 2 rather than at the end).
- Two isolated test resources were created and deleted to reproduce the email and role findings
  honestly (a project named `audit-probe`, a `viewer` account, two `*.example.com` mail domains
  and two probe projects). No production data, service or credential was touched.

Impact:
- Documentation only: one new document, one superseded document, and this log. No API, migration,
  dependency or runtime change.

## 2026-06-21 — F06: Deployments UI

Phase: F06

Completed:
- `projects/[projectId]/sections/deployments.tsx`: Active/All tab bar, state-colored deployment cards with Stop/Restart/Delete actions, inline git-URL paste empty state, NewDeploymentModal trigger.
- `projects/[projectId]/deployments/[deploymentId]/page.tsx`: state-machine timeline (9 states), build logs (collapsible), Stop/Restart/Rollback/Delete actions bar.
- `components/deployments/new-deployment-modal.tsx`: git/archive source picker, branch + Dockerfile path fields, "What will build" live preview.
- SDK `DeploymentsModule`: full CRUD + stop/restart/destroy/rollback/getBuildConfig/updateBuildConfig; `DeploymentListResult` with pagination.
- Dashboard `types/index.ts`: `Deployment` type extended with `releaseId`, `rolledBackToId`.
- Pre-existing `deployments/page.tsx` + `deployments/[id]/page.tsx`: SDK type casts added to fix `Deployment` interface mismatch with SDK's narrower type.

Impact:
- Every per-service screen (F07–F11) renders inside the F05 shell. Deployments list + detail are live.

## 2026-06-20 (later session) — F05: Project Dashboard Shell

Phase: F05

Completed:
- `projects/[projectId]/layout.tsx`: project shell with project sidebar (14 items, role-gated Settings/MCP), header (FIDScript logo, breadcrumbs, notification bell, account avatar), project switcher modal trigger.
- `projects/[projectId]/page.tsx`: redirects `/projects/:id` → `?section=deployments`; section router renders Overview/Deployments/Members/Settings.
- `projects/[projectId]/sections/`: overview (cards: env vars, members, last deploy, created), deployments (list + EmptyState), members (role-colored badges), settings (env vars + danger zone).
- `ProjectSidebar`: 14-item sidebar, active highlight (fire-red accent), Settings/MCP greyed for non-admin, collapse toggle persisted in localStorage, project status dot (green/amber/grey).
- `ProjectSwitcherModal`: searchable list of all user projects, role badges (owner/admin/developer/viewer), lastActivityAt timestamps.
- `NotificationBell`: dropdown of last 20 events via `GET /api/v1/projects/:id/events` (PROJ-23), unread count dot.
- Outer `(app)/layout.tsx`: transparent for `/projects/*` routes — no double chrome.
- SDK: `ProjectsModule.getEvents()` added; `Project` interface extended with `role`, `lastActivityAt`, `lastDeployAt`, `region`.
- Removed conflicting `[id]` directory (was conflicting with `[projectId]`).
- Build clean; all 9 F05 files pass `import/order` lint.

Impact:
- Every per-service screen (F06–F11) now renders inside this shell. Sidebar chrome is the same across all projects. Project switcher is live.

## 2026-06-20 (later session) — Phase C closed

Phase: Phase C — F05 blockers

Completed:
- `PREREQ-PROJ-2` ✅ — `ProjectCrudService.list()` now joins `members { role }` per row,
  derives `role` (`owner`/`member.role`/`viewer`), computes `lastActivityAt`
  (`lastDeployAt ?? updatedAt`); `ProjectFormatService.formatProject()` surfaces both.
- `PREREQ-PROJ-3` ✅ — `GET /projects/:id/events` route added to `ProjectsCrudController`;
  `ProjectCrudService.getProjectEvents()` queries `platform.events` for `project`,
  `deployment`, and `member` resource types under the project, ordered `timestamp desc`,
  configurable limit (default 20), access via `findProjectWithAccess`.
- `backend-prerequisites.md` updated: Phase C 🟥→✅; Phase C summary entry updated.

Impact:
- F05 (project dashboard shell) is now unblocked. Both endpoints are live for the activity feed
  and project-switcher role badges.

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

## 2026-06-20 (later) — F03 onboarding implemented

Phase: F03 First-Run Onboarding

Completed:
- `GET /health/email`: added `PlatformMailService.check()` (SMTP transporter.verify(), 5s timeout,
  returns {status, latencyMs, error}); wired into `HealthController`; `HealthModule` imports
  `EmailModule` to inject it.
- `/onboarding` page: 5-row live-polling health board (5s setInterval). Row 1: Docker aggregate
  from /health; Row 2: Database from /health; Row 3: Domain via Cloudflare DoH
  (cloudflare-dns.com/dns-query) comparing deploy.<domain> → expected SERVER_IP; Row 4: SSL via
  fetch https://<domain>/.well-known/fidscript with redirect:manual; Row 5: Email via GET /health/email.
- Each row: idle → running → healthy/unhealthy; red rows show inline error detail.
- 30s per-check timeout enforced; unresponsive → unhealthy with "Service did not respond" detail.
- All-green: "100% ready" banner; Continue button enables.
- ≥1 red: "Continue anyway" ghost button visible.
- On Continue: set `fidscript_onboarded=1` cookie (platform domain scoped); redirect to /login.
  On revisit: cookie check on mount → redirect to /login immediately.
- `HealthBadge` component: idle/running/healthy/unhealthy states, color-coded, pulse animation on running.
- `apps/dashboard/.env.local`: NEXT_PUBLIC_SERVER_IP=127.0.0.1 (gitignored, injected by docker-compose in prod).
- `apps/dashboard/.env.local` created; not committed (secrets/environment-specific).
- Dashboard typecheck + build clean. `/onboarding` in route manifest (4.78 kB).

Unexpected issues:
- ESLint import/order: blank line required between third-party and `@/` imports — fixed.
- `docsAnchor: 'installation#dns`` had a stray trailing backtick (string not closed) — found by tsc,
  fixed manually.

Decision:
- Platform domain hardcoded in the page (`deploy.fidscript.com`) as a reasonable default for
  self-hosted staging. In production, docker-compose injects it via environment.
  The DNS/SSL probes are intentionally client-side (no backend round-trip needed).

Impact:
- F03 implemented: `/onboarding` page, `GET /health/email` endpoint, `HealthBadge` component.
  `PREREQ-HEALTH-1` closed. `PREREQ-HEALTH-2` (services.email in /health) remains open — deferred
  to future hardening. F04 (Projects) is the next vertical slice per roadmap.

## 2026-06-20 (evening) — Runtime Platform Configuration + Onboarding Rewrite

Phase: Platform Configuration / F03-F04 follow-up

Completed:
- Added `InstallationLifecycle` enum + `InstallationStatus` / `InstallationOperation` / `InstallationSettings` / `InstallationSettingsVersion` / `UserCredential` models to schema.prisma; created migration `20260620150000_installation_and_credentials`.
- Built `InstallationModule`: `InstallationOrchestratorService` with `configure()` + SSE progress stream; provider interfaces (`IReverseProxyProvider`, `ICertificateProvider`); concrete implementations (`TraefikProxyProvider`, `TraefikCertProvider`); step classes (`DnsStep`, `ProxyStep`, `CertificateStep`, `EmailStep`, `HealthStep`) with `validate()` / `execute()` pattern.
- Added 26 new `installation.*` event types to `packages/events` (`installation.lifecycle.changed`, `installation.step.dns.started`, etc.).
- Rewrote `/onboarding` page: 5-step wizard — Welcome (minimal, no Restore/Join), Discovery (live health checks), Configure (3 fields only), Progress (verbose log), Complete → Login.
- Simplified onboarding welcome: single "Create a new platform" button — removed Restore/Join Cluster cards.
- `UserCredential` model: installer seeds PASSWORD credential for admin; `AuthProfileService.getProfile` returns `credentials[]`; force-change-password page: has PASSWORD → "Change password", no PASSWORD → "Create password".
- `AuthPasswordService` updated: magic-code-only users can create their first password (no `currentPassword` required); upserts `UserCredential` row instead of relying on `User.passwordHash`.

Unexpected issues:
- Prisma `Jsonb` not supported in PostgreSQL without `@db.Jsonb` annotation — removed native type annotation, used default `Json`.
- `EventType` union didn't include new `installation.*` events — added all 26 types to `packages/events/src/index.ts` + rebuilt package.

Decision:
- `CLOUDFLARE_API_TOKEN_FILE` already mounted in docker-compose (line 237) — no docker-compose change needed.
- For open-source deployers: Cloudflare token is environment-variable driven; anyone provides their own token at install time.
- Rollback = manual compensation, not auto-reverse; failures stop and report.

Impact:
- New migration ready to apply on VPS. API module `InstallationModule` added to `AppModule`. All typecheck + build clean.

## 2026-06-20 (later) — F04 projects list + create modal

Phase: F04 Projects (initial slice)

Completed:
- `AuthContext.getSdk()`: exposed so child pages can access the authenticated SDK instance rather
  than each creating their own with a hardcoded `localStorage` token key.
- `/dashboard/projects`: rewrote from scratch using `useAuth().getSdk()` (was: `localStorage.getItem('fidscript_token')` + wrong key name).
- CreateProjectModal: name field + live slug preview (slugify) + 6-type grid selector
  (frontend/backend/worker/cron/docker/static) + optional description. Submit calls
  `sdk.projects.create({name, type, description})`.
- Optimistic create: modal closes immediately, new card appears in grid. On error, modal
  re-opens with inline error message.
- Empty state when no projects (conditional Create CTA based on role).
- Project cards: name, slug, status badge, type pill, updatedAt. Link to `/projects/:id`.
- Per-role rendering: "Create Project" shown for owner/admin/developer; viewer sees cards read-only.
- Responsive grid: 1 col → md:2 → xl:3.
- Dashboard typecheck + build clean. `/projects` in route manifest (4.99 kB).

Unexpected issues:
- Existing projects page used wrong token key (`fidscript_token` vs `fidscript_access_token`),
  and instantiated its own SDK instead of using the shared AuthContext. Both fixed.
- `Modal` component had no `footer` prop — restructured to inline footer buttons inside the form.
- `Card` inside `Link` is invalid HTML (block-level inside inline) — replaced with a plain div.

Decision:
- Pages should use `useAuth().getSdk()` for all API calls, not their own SDK instantiation.
  AuthContext holds the single source of truth for the current access token.

Impact:
- F04 initial slice: projects list + create modal implemented. Follow-up: project detail
  page (/projects/:id, F05 shell), activity feed, members, env vars, API keys, invitations.
