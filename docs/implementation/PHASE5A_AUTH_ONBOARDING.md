# Phase 5A — Authentication, MFA and onboarding

> Phase 5A in full: what the authentication journey is now, what the second
> factor does, what the first-time journey does, and what is still open.
>
> The headline: **an account with a second factor could not sign in at all.**
> The API answered with a challenge instead of tokens, the dashboard threw
> the challenge away, stored `undefined` as an access token, and the person
> was bounced between the sign-in screen and the app for as long as they
> tried. Two more things were broken behind it: **a password reset never
> changed the password**, and **the link in the reset email led to a page
> that did not exist**.

---

## 1. The authentication journey, end to end

| Step | What happens | Where |
|---|---|---|
| **Register** | `POST /auth/register` — email, password, name, the company password. The password must satisfy the policy (≥12 characters, upper + lower + a number). The account is created, a personal workspace and a first project are provisioned, and a session is minted. | `auth-register.service.ts` |
| **Sign in** | `POST /auth/login` — email + password. The answer is either tokens, or a challenge when the account has a second factor. | `auth-login.service.ts` |
| **The second factor** | `POST /auth/mfa/challenge` — the challenge token from the sign-in, plus a code from the authenticator **or a recovery code**. This is where the session is minted. | `mfa.service.ts` |
| **The session** | An access token (15 minutes) and a refresh token (7 days, rotated on every refresh). The session row holds the bcrypt hash of the refresh token. | `auth-session.service.ts`, `auth-token.service.ts` |
| **Refresh** | `POST /auth/refresh` — the old session is closed and a new one is minted. The refresh token is compared with the stored hash, so a replayed one closes the session. | `auth-token.service.ts` |
| **Sign out** | `POST /auth/logout` — the session is closed and the access token is tombstoned in Redis for the rest of its life. | `auth-login.service.ts` |
| **The sessions** | `GET /auth/sessions`, `DELETE /auth/sessions/:id`, `DELETE /auth/sessions` — list the live ones, end one, end them all. | `auth-session-mgmt.service.ts` |
| **Forgot the password** | `POST /auth/forgot-password` — always answers "sent", whether or not the account exists. The link points at `/reset-password`. | `auth-verification.service.ts` |
| **Set a new password** | `POST /auth/password-reset` — writes the new hash, ends every session, and consumes the token. | `auth-verification.service.ts` |
| **Confirm the email** | `POST /auth/send-verification` (EMAIL_VERIFY) then `POST /auth/verify-email` — the link points at `/verify-email`. | `auth-verification.service.ts` |
| **The magic code** | `POST /auth/magic-code` then `POST /auth/verify-magic-code` — a six-digit code by mail. A magic-code account with a second factor is challenged too. | `auth-magic-code*.ts` |
| **The first-time journey** | `/welcome` — what this is, your name, your first project, what to do next, the project console. | `app/welcome/` |
| **The account** | `GET/PATCH /auth/me`, the profile, the sessions, the API keys, and **the second factor**. | `auth-account.controller.ts` |

### What was broken, and what it is now

| The defect | Now |
|---|---|
| **An MFA account could not sign in.** The API answered `{mfaRequired, mfaToken}`; the client stored `undefined` as the access token and the person was bounced between `/login` and `/overview` for ever. | The challenge token is kept, the person is sent to `/login/mfa`, and the code (or a recovery code) turns it into a session. |
| **A password reset did not change the password.** It wrote `UserCredential.secretHash`; login reads `User.passwordHash`. The account was locked out of its own reset. | Both columns are written. |
| **The reset email led to a 404.** The link pointed at `${APP_URL}/auth/reset-password` — a page that never existed. | The links point at `/reset-password`, `/verify-email` and `/magic-link`, and all three pages exist. |
| **Asking for a reset said whether the account existed** (404 "No account found with this email address") — behind a form whose copy promised it would not. | It always says "sent". |
| **Signing in said whether the account existed**: "this account uses magic code login" came back before the password was checked. | Every failure says the same thing. |
| **The lockout was an oracle too**: only an address that HAD an account could be locked out, so twenty tries told you whether it was real. | The counter is keyed on the address that was typed, whether or not it belongs to anybody. |
| **Registration accepted any password at all.** The policy existed on the *change* endpoint and in the browser — the server enforced nothing. | One policy, on the server, on every door: register, change, reset. |
| **`POST /auth/forgot-password` refused the natural body** — its DTO required a `type` the route then ignored. | Its own DTO: an email address, and nothing else. |
| **`POST /auth/api-keys` returned the bcrypt hash** of the key, and the internal columns with it. | The row is returned without its hash. |
| **`POST /invitations/accept` was shadowed** by a duplicate that needed a session, so an invitation link could not be opened by the person it was sent to. | The route that wins is public. |
| **The GitHub OAuth callback reflected the query string into a `<script>`** and posted it to `*` — a crafted `error_description` could run in the callback's origin. | The payload is JSON with `<` escaped, and it is posted to the dashboard's origin. |
| **Signing out could leave the refresh token alive** — the failure to close the session was swallowed. | It is logged, and the request fails. |
| **A refresh token could be replayed** — the session's stored hash was written and never read. | It is compared. |
| **The sessions list showed revoked sessions** as if they were open. | Only the live ones. |
| **`/forgot-password` was unreachable** — no link to it from the sign-in screen. | There is one. |
| **The resend countdown never ticked** — "Resend in 30s" for ever. | It ticks. |
| **The "use a different email" button on the sign-up code step did nothing.** | It goes back. |
| **A failed magic-code sign-up showed nothing** and logged an unhandled rejection. | The error is shown. |
| **The destination was lost** on sign-out, on an expired session, and on the guard's redirect (the query string too). | The whole address comes with it. |
| **The one-time code boxes had no names** — six anonymous text fields to a screen reader. | The group and every box are named. |
| **The sign-in screen did not send a signed-in person away.** | It does. |
| **`/force-change-password` was open to anybody**, and answered "Not authenticated" to a stranger. | It sends them to sign in. |

---

## 2. The second factor

### What it does now

| Route | What it is |
|---|---|
| `POST /auth/mfa/setup` | The secret and the otpauth URL. When MFA is already on, the **current factor** is required — otherwise a stolen session could replace somebody's second factor. |
| `POST /auth/mfa/verify` | Confirms the first code and turns MFA on. |
| `GET /auth/mfa/status` | Whether it is on, and how many recovery codes are left. |
| `POST /auth/mfa/recovery-codes` | Ten fresh codes, returned **once**, in plain. The stored form is a bcrypt hash. |
| `POST /auth/mfa/disable` | Turns it off — with the password or a code from the authenticator. A session alone is not enough. |
| `POST /auth/mfa/challenge` | The second half of a sign-in. Public, because the person is not signed in yet: the challenge token is the proof of the first half. |

### The rules

- **The challenge is five minutes and five attempts.** The endpoint was public, with no attempt counter, in front of a 10⁶ code space. It is now counted in Redis, keyed by a **hash** of the challenge — the challenge is a bearer token and does not become part of a key anybody might read.
- **A recovery code is single-use.** `abcd1234-efgh56` — a format a six-digit TOTP code can never be, so the two paths never collide.
- **The codes are stored as hashes.** A database read does not hand anybody the ability back into an account.
- **Turning MFA off clears the secret and the codes.**
- **Replacing a secret needs the current one.**

### In the dashboard

- `/settings` → **Two-factor authentication**: turn it on (a QR code of the otpauth link, the secret for typing in by hand, and a code box), see how many recovery codes are left, generate a new set, turn it off.
- `/login/mfa` — the challenge: six boxes, or a recovery code.
- `/settings` → **Sessions**: where you are signed in, sign one out, sign them all out.

---

## 3. The first-time journey

`/welcome` — offered, never forced.

| Step | What it does |
|---|---|
| **Welcome** | What the platform is, in three sentences and three cards. |
| **Your name** | The account's name, pre-filled from the sign-up. A confirmation, not a form to fight with. |
| **Your first project** | Creates a real project through the API. An account that **already has projects** is shown them and offered one — it is never asked to make a second. |
| **Three things to do next** | Deploy something, add a database, turn on two-factor — each a link. |
| **Done** | The project console. |

**Resumable**: the step and what they had typed are kept in `sessionStorage`, so a reload does not lose their place.

**Offered, not forced**: `User.onboardedAt` says whether it has been finished. An account that has finished it is sent straight to the overview; an account that already has projects is not dragged through it.

**Real data throughout**: the project is created through `POST /projects` — the platform's own route, with its own ownership rules.

---

## 4. The contract

| Action | API | SDK | Dashboard |
|---|---|---|---|
| Register | `POST /auth/register` | `auth.register()` | `/register` |
| Sign in | `POST /auth/login` | `auth.login()` → `AuthResponse \| {mfaRequired, mfaToken}` | `/login` |
| The second factor | `POST /auth/mfa/challenge` | `auth.mfaChallenge()` | `/login/mfa` |
| Enroll | `POST /auth/mfa/setup` · `POST /auth/mfa/verify` | `auth.mfaSetup()` · `auth.mfaVerify()` | `/settings` |
| Recovery codes | `POST /auth/mfa/recovery-codes` | `auth.mfaRecoveryCodes()` | `/settings` |
| Turn it off | `POST /auth/mfa/disable` | `auth.mfaDisable()` | `/settings` |
| Is it on? | `GET /auth/mfa/status` | `auth.mfaStatus()` | `/settings` |
| Forget the password | `POST /auth/forgot-password` | `auth.sendVerification()` | `/forgot-password` |
| Set a new password | `POST /auth/password-reset` | `auth.confirmPasswordReset()` | `/reset-password` |
| Confirm the email | `POST /auth/verify-email` | `auth.verifyEmail()` | `/verify-email` |
| The sessions | `GET/DELETE /auth/sessions` | `auth.sessions()` · `auth.revokeSession()` | `/settings` |
| The journey | `POST /auth/onboarding/complete` | `auth.completeOnboarding()` | `/welcome` |
| The profile | `GET/PATCH /auth/me` | `auth.me()` · `auth.updateProfile()` | `/settings` |

The SDK had **no MFA methods at all**, and `auth.login()` was typed as returning tokens — so the challenge was invisible to TypeScript and to every consumer. Both are fixed, and the contract test reads the routes from the controllers' metadata and the paths from the SDK's source, so the two cannot drift again.

---

## 5. The tests

| Suite | Before | After |
|---|---|---|
| `apps/api` — jest (unit) | 115 in 19 | **167 in 25** |
| `apps/api` — the integration tier (the real application, over HTTP, against a database of its own) | 29 in 8 | **45 in 9** |
| `apps/dashboard` — vitest | 37 in 7 | **48 in 9** |
| `packages/ui` — vitest | 38 in 3 | **38 in 3** |

What the new ones cover:

- **The MFA rules** — the secret cannot be replaced without the current factor; recovery codes are hashes and are single-use; disabling needs a reauthentication; the challenge counts its attempts and never puts the challenge token in a Redis key; an expired challenge is refused.
- **The verification rules** — the reset writes **both** columns; the reset request says the same thing for every address; the links point at pages that exist; a used, expired or wrong-kind token is refused.
- **The enumeration rules** — an unknown address and a magic-code account get the same message; both count against the same counter; the lockout reads the same either way.
- **The password policy** — the same rule on registration, change and reset, checked through the DTOs themselves.
- **The dashboard** — the challenge screen sends the code and says what went wrong; the journey restores its place, creates the project for real and marks itself finished.
- **The integration tier** — register → sign in → enroll → challenge → recover → disable, and the password reset from end to end: the old password stops working and the new one works.

---

## 6. Typecheck and build

| | Result |
|---|---|
| `turbo typecheck` | **12 / 12** |
| `turbo build` | **8 / 8** |
| `apps/dashboard` `tsc --noEmit` | clean |
| `apps/api` `tsc --noEmit` | clean |

---

## 7. What is still open

| The gap | Why it is still open |
|---|---|
| **The email-verification gate is inert.** `EmailVerifiedGuard` runs *before* the guard that authenticates the caller, so it never sees a user. | The **flow** works now — the API sends the email, the link confirms the address, the dashboard has the screen. The **gate** is a different decision: every existing account has `emailVerifiedAt = null`, so turning it on would lock every one of them out. It needs a column that says "this account must verify" (default false) and a proof that the platform's mail reaches outside its own domain. Recorded as `TD-COR-0c`. |
| **`POST /auth/register` answers 409 "Email already registered".** | An enumeration oracle — but only **behind the company password**, which is the gate on registration, and the message is useful feedback. The two cheap oracles (the login message and the reset request) are closed. Recorded as `TD-COR-0d`. |
| **The verification, reset and invitation tokens are stored in plain.** | The token is the lookup key. Hashing it keeps the shape (the column is unique-indexed) and closes a database-read attack. Recorded as `TD-COR-0e`. |
| **The API's key validation is O(n) bcrypt-12 per request.** | Every non-expired key is loaded and compared. It gets slower with every key. It was found in the audit and is not an authentication-flow defect, so it is left for the hardening pass. |
| **The registration email is not sent.** | The API can send it; nothing calls it yet, because the gate is not on. Sending it for every account on a platform whose mail may not reach outside its own domain would produce a queue of undelivered mail. |

---

## 8. The organization decisions — still required

**Nothing about organizations was built in Phase 5A.** The ownership model is
still the product decision it was. What this phase found and recorded, so
Phase 5B starts from facts rather than guesses:

### What exists today

| Thing | Where | What it means |
|---|---|---|
| `Organization` + `OrganizationMember` + `OrgRole` | `identity.organizations` | A **workspace**. A project can belong to one (`Project.organizationId`), or to its owner's own workspace when the column is null. |
| `Team` + `TeamMember` | `identity.teams` | A group inside a workspace. |
| `Invitation` | `identity.invitations` | An invitation to a workspace, accepted by token. |
| **Auto-provisioning on registration** | `auth-onboarding.service.ts` | Every new account gets a personal workspace ("\<name\>'s Organization", role OWNER, permissions `['*']`) and a first project ("My First Project"). It is idempotent, and a failure is logged rather than thrown — the account is never stranded. |
| **Project ownership** | `Project.ownerId` | A project has an owner. `organizationId` says which workspace holds it. |
| **The first-time journey** | `app/welcome/` | Creates a project through `POST /projects` — the platform's own route, so the ownership rules are the platform's, not the journey's. |

### The decisions Phase 5B needs

1. **Does a person have a personal workspace at all?** Today every account gets one, automatically, and it is named after the email. A workspace with one member and one project may be more ceremony than the product wants — or it may be exactly the tenancy boundary a team deployment needs.
2. **What is a workspace for?** Today it holds projects, roles, teams and invitations. If it is only a grouping, the roles and teams may be more than a single-operator platform needs.
3. **Who owns a project that belongs to a workspace?** `Project.ownerId` and `Project.organizationId` can disagree — the owner is a person, the workspace is the tenant. The rule that decides which one grants access is not written down.
4. **What happens to the auto-provisioned personal workspace if the answer to (1) is "no"?** Every account on every install has one. Changing that is a migration, not a code change.
5. **Is there a billing or plan relationship?** `Organization.plan` exists as a column (`'starter'`). Nothing reads it. Whether workspaces are billable entities is a product decision, and it changes what an organization *is*.
6. **What does "invite somebody to my platform" mean** — to a workspace, to a project, or to the platform? The invitation model today is workspace-scoped, but the deployment wizard's invitation flow (PROJ-22) is project-scoped.

**Nothing in Phase 5A depends on the answer**, and nothing in Phase 5A was built to presume one: the first-time journey creates a project through the platform's own route, and the workspace stays wherever the auto-provisioning put it.

---

*Written 2026-11-07.*
