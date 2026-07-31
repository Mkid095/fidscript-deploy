# Auth BaaS UI Gaps

> **Status:** 5 missing frontend features identified by auth-mapper agent (2026-07-31).
> Backend endpoints exist; no frontend UI has been built for any of these.
> These gaps block Journey 5 (BaaS power user) and Journey 2 (team member) use cases.

---

## 1. OAuth Provider Connection UI

**Backend:** `APPAUTH-07` `GET /projects/:projectId/auth/oauth/:provider` — initiates OAuth flow, returns 302 to provider authorize URL. `APPAUTH-08` `GET /projects/:projectId/auth/oauth/:provider/callback` — handles callback, sets tokens.

**Frontend:** MISSING — no UI to connect Google or GitHub OAuth to a project.

**User Experience:**
- Project Settings → Auth tab shows "Connected Providers" section
- User clicks "Connect Google" or "Connect GitHub"
- Redirects through OAuth flow (APPAUTH-07 → provider → APPAUTH-08 callback)
- On return, project dashboard shows green "Connected" badge for the provider
- User can disconnect via the same screen (APPAUTH-19 DELETE)

**Screen:** `/dashboard/projects/:projectId/settings/auth` (tab inside project Settings)
**Route:** Part of the project-level Settings sidebar item (sidebar item 13: Settings → Auth sub-tab)
**Priority: HIGH** — OAuth is a core BaaS feature for Journey 5 (backend developer). Supabase/Firebase both lead with OAuth. Without this, the BaaS offering is incomplete for consumer-facing apps.

---

## 2. API Key Management UI

**Backend (platform-level):**
- `AUTH-15` `GET /auth/api-keys` — list `fsk_` platform keys (name, permissions, lastUsedAt, expiresAt, createdAt)
- `AUTH-16` `POST /auth/api-keys` — create key, returns `{apiKey, key}` shown once with `fsk_` prefix
- `AUTH-17` `DELETE /auth/api-keys/:id` — revoke key

**Backend (project-level):**
- `PROJ-19` `GET /projects/:projectId/api-keys` — list `fpk_` project keys
- `PROJ-20` `POST /projects/:projectId/api-keys` — create project key
- `PROJ-21` `DELETE /projects/:projectId/api-keys/:keyId` — revoke project key

**Frontend:** MISSING — no UI for either platform-level or project-level API key management.

**User Experience:**
- Platform API Keys: Account menu → API Keys → list of `fsk_` keys with name, created date, last used, expires. "Generate key" button opens modal with name input + optional expiry. Key is shown once in a copy-able field with warning "this will not be shown again."
- Project API Keys: Project Settings → API Keys tab → same pattern for `fpk_` keys.

**Screens:**
- Platform: `/dashboard/settings/api-keys` (account-level, reached from avatar menu)
- Project: `/dashboard/projects/:projectId/settings` → API Keys tab

**Priority: HIGH** — Every developer using FIDScript as a BaaS needs API keys to connect their apps (Journey 5 step 8). Also required for monitoring/log ingestion via `X-API-Key`.

---

## 3. Auth Provider Settings UI

**Backend:**
- `APPAUTH-17` `GET /projects/:projectId/auth/providers` — list configured providers
- `APPAUTH-18` `PUT /projects/:projectId/auth/providers/:provider` — configure `{clientId, clientSecret, enabled?, scopes?, redirectUri?}`
- `APPAUTH-19` `DELETE /projects/:projectId/auth/providers/:provider` — remove provider

**Frontend:** MISSING — no UI to configure per-project OAuth credentials.

**User Experience:**
- Project Settings → Auth tab shows each provider (Google, GitHub) with enabled/disabled toggle
- Admin enters `clientId` and `clientSecret` from the OAuth app created in the provider's developer console
- Redirect URI is auto-derived and shown to the user (`https://deploy.example.com/api/v1/projects/:id/auth/oauth/:provider/callback`)
- Fields: Client ID, Client Secret, Scopes (advanced), Enabled toggle

**Screen:** `/dashboard/projects/:projectId/settings/auth` — same tab as OAuth connection UI (Gap 1)
**Priority: MEDIUM** — Closely related to Gap 1. OAuth connection and provider configuration are the same feature from the user's perspective (configure credentials + connect). Could be combined into one screen.

---

## 4. BaaS User Management UI

**Backend:**
- `APPAUTH-14` `GET /projects/:projectId/auth/users` — paginated list of app users (admin only)
- `APPAUTH-15` `GET /projects/:projectId/auth/users/:userId` — user detail with roles + OAuth providers linked
- `APPAUTH-16` `DELETE /projects/:projectId/auth/users/:userId` — disable user (emits `auth.user_disabled`)

**Frontend:** MISSING — no UI to list, view, or disable app users.

**User Experience:**
- Project dashboard → Auth tab (or dedicated Auth section in sidebar)
- User lists all registered app users for this project (not platform members — these are end-users of the customer's app)
- Each row: email, role badge, OAuth provider (if any), created date, last login
- Click row → user detail: email, roles, linked OAuth accounts, session info
- "Disable user" button with confirmation dialog (APPAUTH-16)

**Screen:** `/dashboard/projects/:projectId/settings/auth/users` (sub-route of project Settings)
**Note:** This is distinct from platform member management (PROJ-10/11/12) which IS a planned F04 feature.

**Priority: MEDIUM** — Required for Journey 5 (BaaS power user) and Journey 4 (enterprise admin managing a multi-tenant SaaS). Without this, the platform admin cannot manage app end-users.

---

## 5. Guided First-Project Creation

**Backend:** `PROJ-02` `POST /projects` — create project. `PROJ-03` `GET /projects/:id` — get project detail.

**Frontend:** EXISTS but incomplete — `/projects` page shows empty state. No guided CTA exists to walk a new user through creating their first project.

**Current State:**
- After login + password change (Journey 1b), user lands on `/projects`
- Empty state shows "No projects yet" with what appears to be a create button
- But the empty state is not prominent and there is no onboarding toast/tour pointing the user to it
- After creating a project, no guided flow to deploy the first app (Deployments tab is empty)

**User Experience:**
- First login lands on `/projects` with a prominent empty state card
- Card reads: "Create your first project to get started" with a single primary "Create project" button
- Clicking opens the create-project modal (name + type selector)
- After project creation, a brief toast or inline banner says "Project created! Now connect a deployment..."
- Alternatively: a 3-step onboarding card (Create project → Paste git URL → Deploy) that auto-advances

**Screen:** `/dashboard/projects` (the workspace root)
**Priority: HIGH** — This is Journey 1b's critical path. The spec calls out "Create project" as the expected first action after login, but the empty state is not prominent enough and has no guided next step. A new user who just installed the platform and logged in should not be left wondering what to do.

---

## Summary Table

| # | Feature | Routes | Backend IDs | Priority | ANPAS Phase |
|---|---------|--------|-------------|----------|-------------|
| 1 | OAuth Provider Connection | `/projects/:id/settings/auth` | APPAUTH-07, 08 | HIGH | F11 |
| 2 | API Key Management (platform + project) | `/settings/api-keys`, `/projects/:id/settings` | AUTH-15/16/17, PROJ-19/20/21 | HIGH | F11 |
| 3 | Auth Provider Settings | `/projects/:id/settings/auth` | APPAUTH-17/18/19 | MEDIUM | F11 |
| 4 | BaaS User Management | `/projects/:id/settings/auth/users` | APPAUTH-14/15/16 | MEDIUM | F11 |
| 5 | Guided First-Project Creation | `/projects` | PROJ-02, 03 | HIGH | F03 |

---

## Notes

- All 5 features have real backend endpoints — no backend work required before implementation.
- Features 1, 3, 4 can share a single "Auth" sub-tab under project Settings.
- Feature 5 (first-project creation) is a prerequisite for making other features discoverable.
- Gap 5 requires UX work to design the empty-state card and guided onboarding flow.
- None of these features should use mock data — implement against the real SDK calls listed above.
