# F02 — Authentication (full spec)

> **Status:** Spec complete — pending approval. **Connects to:** backend Phase 03 (`AUTH-*`, `APPAUTH-*`;
> see `backend/auth.md`). **No implementation until this is approved AND the §15 backend gaps are closed.**

## 1. Purpose
Authentication is the gate every `/dashboard/*` route passes through and the start of every user's
flow. It proves who the user is, establishes a JWT session, and enforces the "temp creds → change on
first login" contract the installer promises. Without F02, no project-scoped screen can be safely
shown.

## 2. Business Goal
Match the sign-in simplicity of **Supabase / Firebase / Convex** for a *self-hosted* audience: land,
pick email/password **or** a 6-digit magic code, done. We are NOT trying to out-feature them on SSO —
we are trying to out-*simplify* them: no provider setup, no OAuth dance, magic codes delivered by the
platform's own mail server. The experience to beat: Supabase's "magic link" email round-trip (we use a
fast typed **code** instead of a click-link).

## 3. User Personas
- **Installer / platform admin** — first login with installer-printed temp creds; must change password;
  wants to enable MFA. Frustration: being forced through weak default creds.
- **Solo developer** — registers themselves; wants magic-code (no password to remember) or email/pw.
- **Invited team member** — arrives via invitation (PROJ-22); sets a password via accept flow.
- **End user of a customer's app** — out of scope here (that's BaaS `APPAUTH-*`, surfaced per-project,
  not in the platform console).

## 4. Complete User Journey
```
Visit any /dashboard/* (no session)
  → redirected to /login
/login: tab [Email + password] | [Magic code]
  Email+password path:
    enter email + password → POST AUTH-02
      → if mustChangePassword: redirect /force-change-password
      → else: session set → redirect to intended route (or /dashboard)
      → if mfaRequired: /login/mfa (enter TOTP → POST AUTH-09)
      → if 401 invalid creds: inline error, shake, rate-limit countdown after N fails
      → if 429: show Retry-After, lock the form
  Magic-code path:
    enter email → POST (NEW) /auth/magic-code → "code sent" (always 200, no enumeration)
    enter 6-digit code → POST (NEW) /auth/verify-magic-code
      → success: session set → if mustChangePassword → /force-change-password
      → invalid/expired/too-many-tries: inline error
/register: email + password (strength meter) → POST AUTH-01 → session → /dashboard
/force-change-password: current + new password → POST (NEW) /auth/change-password
  → flag cleared, session rotated → /dashboard
Session persists across reload (refresh on 401 via AUTH-03); logout → AUTH-04 → /login
```
Every error path has a specific message and recovery action; no generic "something went wrong".

## 5. Information Architecture
Auth screens live **outside** the `(app)` shell (no sidebar/header) and are **not linked from the public
site**: `/login`, `/register`, `/force-change-password`, `/login/mfa`. Deep-link target is preserved
(`?next=`) so a user sent to `/dashboard/projects/x` while logged-out returns there after login. The
header's account menu (in F05) surfaces Profile/MFA/Sessions/API-keys/Logout — those *screens* belong
to F11 (Settings), but F02 provides the **session + logout** primitives they consume.

## 6. Screen Specifications
- **`/login`** — centered glass card on `bg-ink-950`; logo + "Gateway Access"; segmented control
  [Email] [Magic code]. Email tab: email, password, "Sign in" (primary), "Forgot?" → magic-code tab,
  link to `/register`. Magic tab: email → "Send code" → 6-digit OTP input → "Verify". States: idle,
  submitting (spinner, button disabled), error (red inline + a11y `aria-invalid`), rate-limited
  (countdown). Empty: n/a. Responsive: card max-w-md, full-width on mobile.
- **`/register`** — email, password (live strength meter: weak/fair/strong), confirm; "Create account".
  Validation: email format, password ≥8 (backend rule), confirm match. On success → auto-login.
- **`/force-change-password`** — current password (or "you're using temp creds" note), new password +
  strength meter + confirm; "Update & continue". Blocks navigation away until done (route guard).
- **`/login/mfa`** — 6-digit TOTP input, "Verify" → AUTH-09; "use backup code" (future); back to login.
- Accessibility: all inputs labelled, `autoFocus` on first field, Enter submits the active form, errors
  announced via `aria-live`.

## 7. Component Specifications
- **`AuthContext` / `AuthProvider`** (client) — holds `{ user, loading, mustChangePassword }`; methods
  `login`, `register`, `logout`, `changePassword`, `requestMagicCode`, `verifyMagicCode`. Access token
  in memory; refresh on 401 interceptor. Exposes `useAuth()`.
- **`AuthGuard`** — wraps `/dashboard/*`; while `loading` → full-screen spinner; if no user → redirect
  `/login?next=<encoded>`; if `mustChangePassword` → redirect `/force-change-password`.
- **`<LoginForm/>`** — props `{ onSubmitted, defaultTab? }`; states idle/submitting/error/rate-limited;
  variants email/magic via internal tab.
- **`<MagicCodeInput/>`** — props `{ length:6, onComplete, disabled? }`; 6 boxes, auto-advance, paste
  support, `inputMode="numeric"`.
- **`<PasswordStrength/>`** — props `{ password }`; computes weak/fair/strong; renders bar + label.
- **`<ForceChangeForm/>`**, **`<OtpField/>`** (reused by MFA + magic-code).

## 8. API Mapping (cross-ref `backend/auth.md`)
| Screen/Action | Endpoint | Method | Body | On success | On error |
|---|---|---|---|---|---|
| Login (pw) | `AUTH-02` `/auth/login` | POST | `{email,password}` | store tokens | 401→inline, 429→lockdown |
| Register | `AUTH-01` `/auth/register` | POST | `{email,password,name?}` | store tokens | 400 validation |
| Refresh | `AUTH-03` `/auth/refresh` | POST | `{refreshToken}` | rotate tokens | 401→logout |
| Logout | `AUTH-04` `/auth/logout` | POST | — | clear | — |
| Me (boot) | `AUTH-10` `/auth/me` | GET | — | hydrate `user`+`mustChangePassword` | 401→refresh or logout |
| Revoke session | `AUTH-13/14` | DELETE | — | update list | — |
| Magic-code send | **NEW** `/auth/magic-code` | POST | `{email}` | 200 always | 429 |
| Magic-code verify | **NEW** `/auth/verify-magic-code` | POST | `{email,code}` | tokens | 400/401 |
| Change password | **NEW** `/auth/change-password` | POST | `{currentPassword,newPassword}` | rotate session | 400/401 |
| MFA verify | `AUTH-09` `/auth/mfa/challenge` | POST | `{mfaToken,code}` | tokens | 401 |

Loading: per-form spinner + disabled submit. Caching: `user` cached in context; re-hydrated on focus.
Realtime: n/a (auth is request/response). Retry: none on auth (security). Rate-limit (429): read
`Retry-After`, show countdown, disable form. Offline: show "no connection", queue nothing.

## 9. Backend Integration Map
```
LoginForm → sdk.auth.login → POST /auth/login
  → AuthLoginService (bcrypt verify, Redis rate-limit, MFA gate)
  → AuthSessionService (create Session, mint JWT pair)
  → emits identity.user.logged_in + identity.session.created
AuthContext stores tokens; AuthGuard reads /auth/me (AUTH-10)
ForceChangeForm → NEW /auth/change-password → flips mustChangePassword, rotates session
  → emits identity.user.updated + identity.session.created
Realtime: identity.session.revoked (from another device's "revoke all") can be listened to → force logout
```

## 10. User Experience Specification (interaction-level)
**Login (email/pw):** user focuses email (`autoFocus`) → types → tabs to password → "Sign in". Button
shows spinner, text → "Signing in…", disabled. On 401: password field shakes, red helper "Wrong email
or password", focus returns to password. After 5 fails: 429 → banner "Too many attempts. Try again in
<mm:ss>" (countdown from `Retry-After`), form locked. On success: brief "Signed in" toast, optimistic
redirect (don't wait for `/me` paint), then `AuthGuard` hydrates.
**Magic-code:** "Send code" → button becomes "Resend in 0:30" (rate-limit UX, not server-enforced here);
OTP boxes appear with first box focused; paste fills all 6; on 6th digit auto-submit. "Code sent to
a•••@…." (masked) for trust. Invalid code: boxes clear, shake, helper "Invalid or expired code".
**Force-change:** detect `mustChangePassword` → hard redirect; "Choose a permanent password" copy;
strength meter updates live; confirm must match; "Update & continue" → clears flag → redirect to
`?next` or `/dashboard`.

## 11. Design Philosophy
Two methods only (email/pw + magic-code) — fewer choices = faster decisions. **No OAuth button** in the
platform console UI (the BaaS `APPAUTH-*` OAuth stays available for *customer* apps, configured
per-project, not here). Magic-code chosen over magic-**link** because a typed code needs no email
client switch and is faster (and the backend magic-**link** is broken — AUTH-05/06). Defaults: tab =
email/pw; "remember me" implicit via refresh-token rotation. Advanced (MFA, sessions, API keys) live in
Settings, not on the login card.

## 12. Configuration Philosophy
The user configures **nothing** for auth at login time. The installer generates the temp admin
(`ADMIN_PASSWORD` → seed), prints it, and sets `mustChangePassword=true`. JWT secret + encryption key
are install-time secrets. Magic codes are delivered by the platform mail server — which itself is
configured by the **single domain** the user set at install (one config → mail + SSL + deployment URLs
all work). So "auth works" is a downstream consequence of the one domain config, not a separate setup.

## 13. Automation Rules
- **Temp admin auto-seed** at install (installer → `pnpm db:seed` with `ADMIN_PASSWORD`).
- **`mustChangePassword=true`** seeded for the install admin → forces the change flow.
- **Refresh-token rotation** on every refresh (old invalid) — automatic, no user action.
- **Rate-limit feedback** surfaced (429 + `Retry-After`) — automatic, no config.
- **Session revocation broadcast** (`identity.session.revoked` {all:true}) — listen → force logout.

## 14. Endpoint Documentation
(See `backend/auth.md` for full DTOs.) New endpoints required by F02:
- **`POST /auth/change-password`** (**AUTH-18**) — auth: JWT; body `{currentPassword,newPassword}`
  (new ≥12 + upper+lower+number; new≠current); output `{accessToken,refreshToken,user}` (session
  rotated, `mustChangePassword` cleared) or 400 (weak)/401 (bad current). Emits `identity.user.password_changed`.
- **`POST /auth/magic-code`** (**AUTH-19**) — public; body `{email}`; output `{sent:true}` always
  (200, no enumeration); per-IP + per-email rate-limited; delivers a 6-digit code via Stalwart through
  the **`PlatformMailService`** (a project-less system-mail sender — `SmtpSendService.send` is
  project-scoped and can't be used for platform auth mail; verified during AUTH-3 implementation).
- **`POST /auth/verify-magic-code`** (**AUTH-20**) — public; body `{email,code(6)}`; output tokens
  (rotated session) or 401 (invalid/expired/≤5-attempts-exceeded). Emits `identity.user.magic_code_verified`.
  The broken `verify-magic-link` path (AUTH-05/06) is removed — IDs retired, never recycled (rule 20).
- **Extend `GET /auth/me` (AUTH-10)** to include `mustChangePassword` (done — AUTH-4).
- **Schema:** add `User.mustChangePassword Boolean @default(false)`; seed true for install admin.

## 15. Feature Dependency Graph
- **Hard backend prerequisites (must be implemented + verified before F02 frontend):**
  1. `User.mustChangePassword` field + migration + seed-default for install admin.
  2. `POST /auth/change-password`.
  3. Platform magic-code (`/auth/magic-code` + `/auth/verify-magic-code`); add `mustChangePassword` to `/auth/me`.
- **Frontend deps:** F00 (design system, `AuthProvider`, `AuthGuard` shells — present as parallel wip).
- **Gated by F02:** F03+ (every `/dashboard/*` route needs the session). F11 (Settings: profile, MFA,
  sessions, API keys) consumes F02's session but is specced separately.

## 16. Acceptance Criteria
1. `/login` (email/pw) → real session → `GET /auth/me` 200 → lands on `?next`/`/dashboard`.
2. Temp-cred login → redirected to `/force-change-password` → after change, `mustChangePassword=false`,
   session rotated, proceeds.
3. Magic-code: request → email arrives (host mail check) → verify → session. Wrong/expired rejected;
   5 fails → lockout.
4. Refresh on 401 works; logout clears session; `/dashboard/*` without session → `/login?next=`.
5. Rate-limit (429) shows countdown and locks the form.
6. No OAuth UI; no mock data; responsive + accessible; `pnpm --filter @fidscript/dashboard build` clean;
   this spec updated to match shipped behavior.

## Change log
- 2026-06-20 — Initial full spec (16 sections). Identified 4 backend prerequisites (mustChangePassword
  field, change-password endpoint, platform magic-code, /me flag) that block implementation.
