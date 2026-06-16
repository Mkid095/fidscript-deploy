# Phase 03: Identity & Access

> **Status:** Planned  |  **Track:** Identity  |  **Depends on:** Phase 02

## Objective

Real authentication that protects every guarded route. A user can register with a password, log in, receive a signed JWT, and call a guarded endpoint successfully (today every guarded route returns 401). This is the gate: Projects, Deployments, Marketplace — nothing user-facing is reachable until auth actually works.

## Current State

**BROKEN.** See `docs/AUDIT.md` §C (Auth). Specific defects:

- Login mints a **raw hex token** (random bytes), but `JwtStrategy` verifies the `Authorization` header as a **signed JWT** → the two never match → **every `@UseGuards(JwtAuthGuard)` route returns 401**. The platform's own auth is unusable.
- `JWT_SECRET` defaults to the literal string `'change-me'` and is never validated at boot → silent insecure defaults.
- Magic-link flow queries `where user.email === token` (the token *is* the email) and **never sends email**. Not a real flow.
- bcrypt password hashing is real (the one correct piece).
- No refresh tokens, no token revocation, no MFA, no rate limiting on login.

## Dependencies

- **Phase 02** (events: `identity.user.*` must flow through the bus; the audit consumer logs auth events).

## Deliverables

- [ ] **JWT issuance aligned with verification.** `login()` issues a real signed JWT (HS256) using `JwtService.sign(...)`, matching what `JwtStrategy` validates. The hex-token bug is removed.
- [ ] **Secret hygiene.** Read `JWT_SECRET` from `JWT_SECRET_FILE` (Docker secret). **Fail closed** at boot if unset/`change-me` — never a silent default.
- [ ] **Password auth end-to-end.** `POST /auth/register` (bcrypt-hash, emit `identity.user.registered`), `POST /auth/login` (bcrypt-compare, return access token). `GET /auth/me` guarded and working.
- [ ] **Access + refresh tokens.** Short-lived access JWT (e.g. 15m) + long-lived refresh token (rotated on use, stored **hashed** in a `refresh_tokens`/`sessions` table). `POST /auth/refresh`; `POST /auth/logout` revokes the session.
- [ ] **Session management.** List/revoke active sessions (`GET /auth/sessions`, `DELETE /auth/sessions/:id`).
- [ ] **API keys.** `POST /auth/api-keys` returns a key once (stored hashed, like a password); usable as `Authorization: Bearer` or `X-API-Key` for programmatic access (CLI/SDK/MCP). Revoke supported.
- [ ] **Role guards.** `PlatformAdminGuard` (platform-level admin) + a `@Roles()` decorator. Used now to protect admin endpoints; consumed by Marketplace (Phase 23) and domain/infra ops.
- [ ] **Login rate limiting.** Throttle failed logins per-IP/per-account (Redis-backed) to blunt brute force.
- [ ] **MFA (TOTP) — optional toggle.** Enable/disable, verify on login. (Magic-link *delivery* is gated to Phase 09 when email is real; the token/verification math is correct here so 09 only adds the send.)
- [ ] **Tenant-scoped auth context.** A request-scoped `CurrentUser` with `{ id, email, platformRole, activeProjectId }` that later phases rely on for isolation.

## Technical Design

- **Token shape:** access JWT carries `{ sub, email, platformRole }`, signed HS256, short TTL; refresh is an opaque random token, hashed (SHA-256) at rest, bound to `userId` + a session and rotated on each refresh.
- **Why access+refresh:** short access TTL limits exposure; rotation with reuse-detection (a reused/rotated refresh invalidates the family) catches theft.
- **Strategy:** Passport `JwtStrategy` extracts+verifies the Bearer token; an `ApiKeyStrategy` (or guard) handles API keys by hashing the inbound key and looking it up. Both populate `request.user`.
- **Fail-closed secret:** a config validation module throws at bootstrap if `JWT_SECRET` is missing or a known default — no app starts with a guessable key.
- **Rate limit:** token-bucket in Redis keyed `login:attempt:<ip>` and `login:fail:<email>`.

## Integration Points

- **Events emitted:** `identity.user.registered`, `identity.user.logged_in`, `identity.user.logged_out`, `identity.token.refreshed`, `identity.api_key.created`, `identity.api_key.revoked`. All flow through the Phase 02 bus and land in the audit table.
- **Service registry:** registers `identity` with the auth/session endpoints it exposes.
- **SDK (16):** `auth.register/login/refresh/me/logout/listApiKeys/createApiKey`.
- **CLI (18):** `fidscript login` → opens browser or accepts API key → stores credentials.
- **Dashboard (19):** login/register/logout screens; the first real UI surface.
- **Marketplace (23):** consumes `PlatformAdminGuard` for approve/reject/feature.

## Verification (VPS)

```bash
# 1) Register + login + use the token:
curl -fsS -X POST https://deploy.fidscript.com/api/v1/auth/register -d '{...}'
TOKEN=$(curl -fsS -X POST .../auth/login -d '{"email":"...","password":"..."}' | jq -r .accessToken)
curl -fsS https://deploy.fidscript.com/api/v1/auth/me -H "Authorization: Bearer $TOKEN"   # 200, echoes user

# 2) Negative paths:
curl -s -o /dev/null -w "%{http_code}" .../auth/me                                  # 401 (no token)
curl .../auth/login -d '{"email":"...","password":"WRONG"}'                          # 401
# expired access → refresh → new access → /me 200
# brute force: 6th wrong login → 429

# 3) Audit row exists for the login:
docker compose exec postgres psql ... -c "select type from platform_events where type like 'identity.%' order by 1 desc limit 5;"
```

**Exit criterion:** register → login → `GET /auth/me` returns **200**; wrong password 401; expired access refreshes; failed logins throttle; an `identity.user.logged_in` event is recorded. The hex-token-vs-JWT mismatch is gone.

## Out of Scope / Future

- Magic-link / passwordless *delivery* (email transport arrives in Phase 09; auth wiring is ready).
- OAuth/SSO (Google/GitHub) — future ADR.
- WebAuthn/passkeys — future.

## Risks

- Refresh-token rotation bugs (reuse-detection false positives log users out) — test the rotate path explicitly.
- Existing seeded data created under the broken scheme — re-seed after the fix.

## Next Phase

[Phase 04: Projects Engine](./phase-04.md)
