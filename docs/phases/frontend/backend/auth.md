# Backend Inventory — Auth & Identity

See `index.md` for conventions. IDs are stable cross-reference targets for specs.

## Platform auth — `@Controller('auth')` → `/api/v1/auth`

| ID | Method | Path | Auth | Request | Response | Events |
|----|--------|------|------|---------|----------|--------|
| AUTH-01 | POST | `/auth/register` | public | `RegisterDto`{email,password(min8),name?} | `{user,accessToken,refreshToken,expiresIn}` | `identity.user.registered`, `identity.session.created` |
| AUTH-02 | POST | `/auth/login` | public | `LoginDto`{email,password} | tokens **or** `{mfaRequired:true,mfaToken}` | `identity.user.logged_in`/`login_failed`; `session.created` |
| AUTH-03 | POST | `/auth/refresh` | public | `RefreshTokenDto`{refreshToken} | tokens (rotated) | `identity.token.refreshed`, `session.created` |
| AUTH-04 | POST | `/auth/logout` | JWT | — | `{success:true}` | `identity.user.logged_out` |
| AUTH-05 | ~~POST `/auth/magic-link`~~ | — | — | — | **RETIRED 2026-06-20** — broken (queried `where user.email === token`, never emailed). Replaced by **AUTH-19**. ID retired, never recycled (rule 20). |
| AUTH-06 | ~~POST `/auth/verify-magic-link`~~ | — | — | — | **RETIRED 2026-06-20** — broken. Replaced by **AUTH-20**. ID retired, never recycled. |
| AUTH-07 | POST | `/auth/mfa/setup` | JWT | — | `{secret,otpauthUrl}` | `identity.user.mfa_setup` |
| AUTH-08 | POST | `/auth/mfa/verify` | JWT | `{code}` | `{enabled:true}` | `identity.user.mfa_enabled` |
| AUTH-09 | POST | `/auth/mfa/challenge` | public | `{mfaToken,code}` | tokens | `identity.user.mfa_challenge`, `session.created` |
| AUTH-10 | GET | `/auth/me` | JWT | — | `{id,email,name,avatarUrl,role,mfaEnabled,mustChangePassword,lastLoginAt,createdAt}` | none |
| AUTH-11 | PATCH | `/auth/me` | JWT | `{name?,avatarUrl?}` | profile | `identity.user.updated` |
| AUTH-12 | GET | `/auth/sessions` | JWT | — | `{sessions:[{id,expiresAt,ipAddress?,userAgent?,createdAt}]}` | none |
| AUTH-13 | DELETE | `/auth/sessions/:id` | JWT | — | `{success:true}` | `identity.session.revoked` {all:false} |
| AUTH-14 | DELETE | `/auth/sessions` | JWT | — | `{success:true}` | `identity.session.revoked` {all:true} |
| AUTH-15 | GET | `/auth/api-keys` | JWT | — | `{apiKeys:[{id,name,permissions,lastUsedAt?,expiresAt?,createdAt}]}` | none |
| AUTH-16 | POST | `/auth/api-keys` | JWT | `{name,permissions?,expiresAt?}` | `{apiKey,key}` (key shown once, `fsk_`) | `identity.api_key.created` |
| AUTH-17 | DELETE | `/auth/api-keys/:id` | JWT | — | `{success:true}` | `identity.api_key.revoked` |
| AUTH-18 | POST | `/auth/change-password` | JWT | `ChangePasswordDto`{currentPassword,newPassword(min12,upper+lower+number)} | tokens (rotated; `mustChangePassword` cleared) | `identity.user.password_changed`, `session.created` |
| AUTH-19 | POST | `/auth/magic-code` | public | `MagicCodeDto`{email} | `{sent:true}` (always; never reveals whether the email exists) | `identity.user.magic_code_sent` |
| AUTH-20 | POST | `/auth/verify-magic-code` | public | `VerifyMagicCodeDto`{email,code(6)} | tokens (rotated session) | `identity.user.magic_code_verified`, `session.created` |
| AUTH-21 | GET | `/auth/setup-password` | JWT (owner/admin) | — | `{configured:boolean}` — never the password itself | none |
| AUTH-22 | POST | `/auth/setup-password` | JWT (owner/admin) | `SetupPasswordDto`{setupPassword(min8)} | `{configured:true}` | none |

## The operator's GitHub account — `@Controller('users/me/github')` → `/api/v1/users/me/github`

The deployment pipeline clones private repositories with these credentials.
Two ways in: the OAuth popup (which needs a GitHub OAuth app on the
deployment) and a personal access token (which does not). Both end in the
same encrypted row — `identity.github_connections`, token AES-256-GCM
encrypted, never returned in a response.

| ID | Method | Path | Auth | Request | Response | Events |
|----|--------|------|------|---------|----------|--------|
| AUTH-23 | GET | `/users/me/github/connect` | JWT | — | `{url}` — the OAuth authorize URL. **503** when the deployment has no OAuth app; use AUTH-25 instead | none |
| AUTH-24 | GET | `/users/me/github/callback` | public | GitHub redirects here | an HTML page that posts the code to the opener and closes the popup | none |
| AUTH-25 | POST | `/users/me/github/token` | JWT | `{token}` — a GitHub personal access token | `{username,avatarUrl?,scopes}` — **the token is never returned** | `users.github_connected` |
| AUTH-26 | GET | `/users/me/github/oauth` | JWT | — | `{configured:boolean}` — whether this deployment has a GitHub OAuth app | none |
| AUTH-27 | POST | `/users/me/github/exchange` | JWT | `{code,state}` | `{username,avatarUrl?,scopes}` | `users.github_connected` |
| AUTH-28 | GET | `/users/me/github/status` | JWT | — | `{connected:false}` or `{connected:true,username,avatarUrl?,scopes}` | none |
| AUTH-29 | DELETE | `/users/me/github/disconnect` | JWT | — | `{success:true}` | `users.github_disconnected` |
| AUTH-30 | GET | `/users/me/github/repos` | JWT | `?page&limit` | `{repos,total,hasMore}` — 404 when no account is connected | none |
| AUTH-31 | GET | `/users/me/github/repos/:owner/:repo/branches` | JWT | — | `[{name,commit:{sha}}]` — 404 when no account is connected | none |


## BaaS app-auth — `/api/v1/projects/:projectId/auth` — **RETIRED 2026-11-05**

Every endpoint in this section is gone. The paths below were recorded without
their `projects/:projectId` prefix; the routes as implemented sat under it.

| ID | Method | Path | Auth | Request | Response | Events |
|----|--------|------|------|---------|----------|--------|
| APPAUTH-01 | ~~POST `/auth/register`~~ | — | — | — | **RETIRED 2026-11-05** — an application's users and permissions are Instant's job (CEL rules, evaluated per entity per action against live data). This was the weaker duplicate; the platform's own per-project role blobs are gone with it. **IDs retired, never recycled (rule 20).** |
| APPAUTH-02 | ~~POST `/auth/login`~~ | — | — | — | **RETIRED 2026-11-05** — an application's users and permissions are Instant's job (CEL rules, evaluated per entity per action against live data). This was the weaker duplicate; the platform's own per-project role blobs are gone with it. **IDs retired, never recycled (rule 20).** |
| APPAUTH-03 | ~~POST `/auth/magic-link`~~ | — | — | — | **RETIRED 2026-11-05** — an application's users and permissions are Instant's job (CEL rules, evaluated per entity per action against live data). This was the weaker duplicate; the platform's own per-project role blobs are gone with it. **IDs retired, never recycled (rule 20).** |
| APPAUTH-04 | ~~POST `/auth/verify-magic-link`~~ | — | — | — | **RETIRED 2026-11-05** — an application's users and permissions are Instant's job (CEL rules, evaluated per entity per action against live data). This was the weaker duplicate; the platform's own per-project role blobs are gone with it. **IDs retired, never recycled (rule 20).** |
| APPAUTH-05 | ~~POST `/auth/magic-code`~~ | — | — | — | **RETIRED 2026-11-05** — an application's users and permissions are Instant's job (CEL rules, evaluated per entity per action against live data). This was the weaker duplicate; the platform's own per-project role blobs are gone with it. **IDs retired, never recycled (rule 20).** |
| APPAUTH-06 | ~~POST `/auth/verify-magic-code`~~ | — | — | — | **RETIRED 2026-11-05** — an application's users and permissions are Instant's job (CEL rules, evaluated per entity per action against live data). This was the weaker duplicate; the platform's own per-project role blobs are gone with it. **IDs retired, never recycled (rule 20).** |
| APPAUTH-07 | ~~GET `/auth/oauth/:provider`~~ | — | — | — | **RETIRED 2026-11-05** — an application's users and permissions are Instant's job (CEL rules, evaluated per entity per action against live data). This was the weaker duplicate; the platform's own per-project role blobs are gone with it. **IDs retired, never recycled (rule 20).** |
| APPAUTH-08 | ~~GET `/auth/oauth/:provider/callback`~~ | — | — | — | **RETIRED 2026-11-05** — an application's users and permissions are Instant's job (CEL rules, evaluated per entity per action against live data). This was the weaker duplicate; the platform's own per-project role blobs are gone with it. **IDs retired, never recycled (rule 20).** |
| APPAUTH-09 | ~~POST `/auth/refresh`~~ | — | — | — | **RETIRED 2026-11-05** — an application's users and permissions are Instant's job (CEL rules, evaluated per entity per action against live data). This was the weaker duplicate; the platform's own per-project role blobs are gone with it. **IDs retired, never recycled (rule 20).** |
| APPAUTH-10 | ~~GET `/auth/me`~~ | — | — | — | **RETIRED 2026-11-05** — an application's users and permissions are Instant's job (CEL rules, evaluated per entity per action against live data). This was the weaker duplicate; the platform's own per-project role blobs are gone with it. **IDs retired, never recycled (rule 20).** |
| APPAUTH-11 | ~~POST `/auth/logout`~~ | — | — | — | **RETIRED 2026-11-05** — an application's users and permissions are Instant's job (CEL rules, evaluated per entity per action against live data). This was the weaker duplicate; the platform's own per-project role blobs are gone with it. **IDs retired, never recycled (rule 20).** |
| APPAUTH-12 | ~~GET `/auth/roles`~~ | — | — | — | **RETIRED 2026-11-05** — an application's users and permissions are Instant's job (CEL rules, evaluated per entity per action against live data). This was the weaker duplicate; the platform's own per-project role blobs are gone with it. **IDs retired, never recycled (rule 20).** |
| APPAUTH-13 | ~~POST `/auth/roles/assign`~~ | — | — | — | **RETIRED 2026-11-05** — an application's users and permissions are Instant's job (CEL rules, evaluated per entity per action against live data). This was the weaker duplicate; the platform's own per-project role blobs are gone with it. **IDs retired, never recycled (rule 20).** |
| APPAUTH-14 | ~~GET `/auth/users`~~ | — | — | — | **RETIRED 2026-11-05** — an application's users and permissions are Instant's job (CEL rules, evaluated per entity per action against live data). This was the weaker duplicate; the platform's own per-project role blobs are gone with it. **IDs retired, never recycled (rule 20).** |
| APPAUTH-15 | ~~GET `/auth/users/:userId`~~ | — | — | — | **RETIRED 2026-11-05** — an application's users and permissions are Instant's job (CEL rules, evaluated per entity per action against live data). This was the weaker duplicate; the platform's own per-project role blobs are gone with it. **IDs retired, never recycled (rule 20).** |
| APPAUTH-16 | ~~DELETE `/auth/users/:userId`~~ | — | — | — | **RETIRED 2026-11-05** — an application's users and permissions are Instant's job (CEL rules, evaluated per entity per action against live data). This was the weaker duplicate; the platform's own per-project role blobs are gone with it. **IDs retired, never recycled (rule 20).** |

Provider config — `/api/v1/projects/:projectId/auth/providers` (JWT; upsert/remove need admin/owner):

| ID | Method | Path | Request | Events |
|----|--------|------|---------|--------|
| APPAUTH-17 | ~~GET `/auth/providers`~~ | — | **RETIRED 2026-11-05** — an application's users and permissions are Instant's job (CEL rules, evaluated per entity per action against live data). This was the weaker duplicate; the platform's own per-project role blobs are gone with it. **IDs retired, never recycled (rule 20).** |
| APPAUTH-18 | ~~PUT `/auth/providers/:provider`~~ | — | **RETIRED 2026-11-05** — an application's users and permissions are Instant's job (CEL rules, evaluated per entity per action against live data). This was the weaker duplicate; the platform's own per-project role blobs are gone with it. **IDs retired, never recycled (rule 20).** |
| APPAUTH-19 | ~~DELETE `/auth/providers/:provider`~~ | — | **RETIRED 2026-11-05** — an application's users and permissions are Instant's job (CEL rules, evaluated per entity per action against live data). This was the weaker duplicate; the platform's own per-project role blobs are gone with it. **IDs retired, never recycled (rule 20).** |

## Capabilities

- **Platform auth**: register/login, bcrypt-12, Redis fixed-window rate limit (30/15min IP, 5-fail account lock), signed-JWT access(15m)+refresh(7d, rotated, sessionId claim), TOTP MFA (otplib, secret AES-encrypted), session list/revoke, `fsk_` API keys (bcrypt), profile.
- **BaaS app-auth**: **retired 2026-11-05.** An application's users, roles and OAuth providers are Instant's job now — its CEL rules are evaluated per entity per action against live data, which a per-project JSON permission blob never was. What remains in the platform is `app_users`/`app_sessions` for the **WhatsApp console's magic-code login**, and the operator's own **GitHub account connection** (`users/me/github`, which the deployment pipeline uses to clone private repositories).
- **CryptoService** (no routes): AES-256-GCM; key from `ENCRYPTION_KEY(_FILE)` (32-byte base64); ciphertext `iv:authTag:ct`.

## Findings
- Platform magic-link broken (AUTH-05/06) — use magic-code. · App magic-link stub (03/04) — retired with the rest of APPAUTH. · `createRole` dead code (no route) — gone with APPAUTH-12/13. · `validateApiKey` O(N) scan. · App-user list pagination hardcoded page1/limit50 — gone with APPAUTH-14.
