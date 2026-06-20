# Backend Inventory — Auth & Identity

See `index.md` for conventions. IDs are stable cross-reference targets for specs.

## Platform auth — `@Controller('auth')` → `/api/v1/auth`

| ID | Method | Path | Auth | Request | Response | Events |
|----|--------|------|------|---------|----------|--------|
| AUTH-01 | POST | `/auth/register` | public | `RegisterDto`{email,password(min8),name?} | `{user,accessToken,refreshToken,expiresIn}` | `identity.user.registered`, `identity.session.created` |
| AUTH-02 | POST | `/auth/login` | public | `LoginDto`{email,password} | tokens **or** `{mfaRequired:true,mfaToken}` | `identity.user.logged_in`/`login_failed`; `session.created` |
| AUTH-03 | POST | `/auth/refresh` | public | `RefreshTokenDto`{refreshToken} | tokens (rotated) | `identity.token.refreshed`, `session.created` |
| AUTH-04 | POST | `/auth/logout` | JWT | — | `{success:true}` | `identity.user.logged_out` |
| AUTH-05 | POST | `/auth/magic-link` | public | `{email}` | `{sent:true}` ⚠ **broken** | none |
| AUTH-06 | POST | `/auth/verify-magic-link` | public | `{token}` | tokens ⚠ **broken** | `session.created` |
| AUTH-07 | POST | `/auth/mfa/setup` | JWT | — | `{secret,otpauthUrl}` | `identity.user.mfa_setup` |
| AUTH-08 | POST | `/auth/mfa/verify` | JWT | `{code}` | `{enabled:true}` | `identity.user.mfa_enabled` |
| AUTH-09 | POST | `/auth/mfa/challenge` | public | `{mfaToken,code}` | tokens | `identity.user.mfa_challenge`, `session.created` |
| AUTH-10 | GET | `/auth/me` | JWT | — | `{id,email,name,avatarUrl,role,mfaEnabled,lastLoginAt,createdAt}` | none |
| AUTH-11 | PATCH | `/auth/me` | JWT | `{name?,avatarUrl?}` | profile | `identity.user.updated` |
| AUTH-12 | GET | `/auth/sessions` | JWT | — | `{sessions:[{id,expiresAt,ipAddress?,userAgent?,createdAt}]}` | none |
| AUTH-13 | DELETE | `/auth/sessions/:id` | JWT | — | `{success:true}` | `identity.session.revoked` {all:false} |
| AUTH-14 | DELETE | `/auth/sessions` | JWT | — | `{success:true}` | `identity.session.revoked` {all:true} |
| AUTH-15 | GET | `/auth/api-keys` | JWT | — | `{apiKeys:[{id,name,permissions,lastUsedAt?,expiresAt?,createdAt}]}` | none |
| AUTH-16 | POST | `/auth/api-keys` | JWT | `{name,permissions?,expiresAt?}` | `{apiKey,key}` (key shown once, `fsk_`) | `identity.api_key.created` |
| AUTH-17 | DELETE | `/auth/api-keys/:id` | JWT | — | `{success:true}` | `identity.api_key.revoked` |

## BaaS app-auth — `/api/v1/projects/:projectId/auth`

| ID | Method | Path | Auth | Request | Response | Events |
|----|--------|------|------|---------|----------|--------|
| APPAUTH-01 | POST | `/auth/register` | public | {email,password,name?} | app-user | `auth.user_created` |
| APPAUTH-02 | POST | `/auth/login` | public | {email,password} | tokens+user | `auth.login_succeeded`/`_failed` |
| APPAUTH-03 | POST | `/auth/magic-link` | public | {email} | `{sent:true}` ⚠ stub | none |
| APPAUTH-04 | POST | `/auth/verify-magic-link` | public | {token} | tokens ⚠ stub | `auth.login_succeeded` |
| APPAUTH-05 | POST | `/auth/magic-code` | public | {email} | `{sent:true}` | `auth.magic_code_sent` |
| APPAUTH-06 | POST | `/auth/verify-magic-code` | public | {email,code(6)} | tokens+user | `auth.magic_code_verified`, `login_succeeded` |
| APPAUTH-07 | GET | `/auth/oauth/:provider` | public | provider; ?redirect | 302 authorize URL | `auth.oauth_authorize_started` |
| APPAUTH-08 | GET | `/auth/oauth/:provider/callback` | public | ?code,?state | tokens or 302 | `auth.oauth_signin_succeeded` |
| APPAUTH-09 | POST | `/auth/refresh` | public | {refreshToken} | tokens | `auth.token_refreshed`/`refresh_rejected` |
| APPAUTH-10 | GET | `/auth/me` | AppJwt | — | `{appUserId,projectId,email,roles}` | none |
| APPAUTH-11 | POST | `/auth/logout` | AppJwt | — | `{success:true}` | none |
| APPAUTH-12 | GET | `/auth/roles` | JWT | — | `{roles}` | none |
| APPAUTH-13 | POST | `/auth/roles/assign` | JWT | {email,roleName} | assignment | none |
| APPAUTH-14 | GET | `/auth/users` | JWT+admin | — | users+pagination | none |
| APPAUTH-15 | GET | `/auth/users/:userId` | JWT+admin | — | user+roles+oauth | none |
| APPAUTH-16 | DELETE | `/auth/users/:userId` | JWT+admin | — | `{success:true}` | `auth.user_disabled` |

Provider config — `/api/v1/projects/:projectId/auth/providers` (JWT; upsert/remove need admin/owner):

| ID | Method | Path | Request | Events |
|----|--------|------|---------|--------|
| APPAUTH-17 | GET | `/auth/providers` | — | none |
| APPAUTH-18 | PUT | `/auth/providers/:provider` | `UpsertAuthProviderDto`{clientId,clientSecret,enabled?,scopes?,redirectUri?} | `auth.provider_configured` |
| APPAUTH-19 | DELETE | `/auth/providers/:provider` | — | `auth.provider_removed` |

## Capabilities

- **Platform auth**: register/login, bcrypt-12, Redis fixed-window rate limit (30/15min IP, 5-fail account lock), signed-JWT access(15m)+refresh(7d, rotated, sessionId claim), TOTP MFA (otplib, secret AES-encrypted), session list/revoke, `fsk_` API keys (bcrypt), profile.
- **BaaS app-auth**: per-project register/login/magic-code (6-digit, bcrypt, Redis 10m TTL, rate-limited, Stalwart delivery), OAuth google/github (manual auth-code, encrypted per-project creds, MOCK for testing), app-user JWT (scope:app), refresh rotation, app-user management (admin-gated).
- **CryptoService** (no routes): AES-256-GCM; key from `ENCRYPTION_KEY(_FILE)` (32-byte base64); ciphertext `iv:authTag:ct`.

## Findings
- Platform magic-link broken (AUTH-05/06) — use magic-code. · App magic-link stub (03/04) — use magic-code. · `createRole` dead code (no route). · `validateApiKey` O(N) scan. · App-user list pagination hardcoded page1/limit50.
