# F02 — Authentication

> **Status:** ⏳ Next · Connects to backend **Phase 03 (Identity & Access)**

Wire the real platform auth into the dashboard. This is the gate every `/dashboard/*` route passes
through, and the entry point of the user's whole flow.

## Goal

Temp admin creds (printed by the installer) → **first login forces a password change** → persistent
session → guarded app. Two sign-in methods only: **email/password** and **magic-code** (delivered
through the platform's own Stalwart mail). **No OAuth button in the UI** (the backend provider stays
available per-project, but platform login stays simple).

## Backend dependencies (API-side work first)

- Add `mustChangePassword Boolean @default(false)` to `User`; seed it `true` for the install admin.
- A `POST /auth/change-password` endpoint that flips the flag and rotates the session.
- Extend **platform** login to accept magic-code (`POST /auth/magic-code` + `/verify-magic-code`),
  reusing the Stalwart delivery path already built for BaaS (Inc 4).
- `GET /auth/me` returns `mustChangePassword` so the client can route to the change screen.

## Frontend deliverables

- `contexts/auth-context.tsx` — real JWT session: access token in memory, refresh on 401, `user`
  + `mustChangePassword` exposed; `login`, `register`, `logout`, `refresh`.
- `components/auth-guard.tsx` — wraps `/dashboard/*`; redirects to `/login` when no session; routes
  to the force-change screen when `mustChangePassword` is true.
- `app/login/page.tsx` — email/password + magic-code tabs (toggle, no OAuth).
- `app/register/page.tsx` — register → auto-login.
- `app/(auth)/force-change-password/page.tsx` — required before entering the app.
- Magic-code input (6-digit, resend + rate-limit UI).

## Verification (on the VPS)

1. Register → `accessToken` → `GET /auth/me` 200.
2. Login with the seeded **temp creds** → redirected to force-change → after change, `mustChangePassword=false`.
3. Magic-code: request → email arrives (host mail check) → verify → session issued.
4. Session persists across reload (refresh rotation); `/dashboard/*` without session → `/login`.
5. Wrong/expired token → 401 → refresh or redirect.

## Coordination note

`app/login`, `app/register`, `contexts/auth-context`, `components/auth-guard`, `app/providers` already
exist as **parallel work** (not authored in the public-site commits). Before rewriting, confirm they
aren't being edited concurrently — otherwise do the API-side changes first and merge the UI after.
