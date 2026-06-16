# Phase 04: Projects Engine

> **Status:** Planned  |  **Track:** Identity  |  **Depends on:** Phase 03

## Objective

The multi-tenant container: every resource in the platform (deployments, storage, databases, functions) belongs to a Project, and Projects enforce membership, roles, and isolation. This phase makes the existing CRUD production-grade by adding **encrypted environment variables**, **invitations**, and the **RBAC/tenant-isolation guarantees** every later phase depends on.

## Current State

**PARTIAL — the best module in the codebase.** See `docs/AUDIT.md` §C (Projects). Specific defects:

- Real multi-tenant CRUD, real RBAC roles, real per-request access checks — the foundation is solid.
- **Environment variables are stored in plaintext.** Secrets on disk in Postgres, readable by anyone with DB access.
- **No invitations.** Adding members requires the target user to already exist and offers no invite-by-email flow.
- **Subdomains are never routed** (routing is Phase 07; here we only claim/validate the slug).
- No project API keys (project-scoped secrets) — auth keys from Phase 03 are user-scoped.

## Dependencies

- **Phase 03** (auth context `CurrentUser`, `PlatformAdminGuard`, the `@Roles`/membership guards built there).

## Deliverables

- [ ] **Encrypted environment variables.** All project env vars encrypted at rest (AES-256-GCM) using a master key from `ENCRYPTION_KEY_FILE`. Decryption happens only in-process at deploy/runtime injection. A DB dump no longer leaks secrets.
- [ ] **Encryption service.** A reusable `CryptoService` (`encrypt`/`decrypt`) backed by a key read once at boot from `_FILE`; fail-closed if missing.
- [ ] **Project API keys.** Per-project secrets (shown once, hashed at rest) for SDK/CLI/MCP to act on a project without a user session.
- [ ] **Invitations.** `POST /projects/:id/invitations` (by email + role) → hashed token with expiry → `POST /invitations/:token/accept` → creates membership. Resend/revoke supported.
- [ ] **Membership + roles.** Roles: `owner | admin | developer | viewer`. Enforced via a `ProjectGuard` + `@ProjectRole(...)` decorator on every project-scoped route.
- [ ] **Tenant isolation enforced + tested.** Every project-scoped query filters by `projectId` from the validated membership; a user in Project A gets 403/404 on Project B's resources. Isolation is a prove-it test, not a hope.
- [ ] **Subdomain slug reservation.** Claim + format-validate a slug (e.g. `my-app`) for later routing (Phase 06/07); uniqueness enforced. Not routed here.
- [ ] **Project lifecycle.** Create/update/delete, suspend (disable resources), archive/restore. Deletion cascades responsibly (or blocks) per a documented policy.

## Technical Design

- **Encryption:** AES-256-GCM, random IV per value, auth tag stored alongside ciphertext. The master key never leaves the API process; rotated via re-encrypt migration job (documented; not built this phase).
- **API keys:** `key = 'fsk_<random>'`; store `sha256(key)`; lookup hashes the inbound key. Identical pattern to Phase 03 user API keys but project-scoped.
- **Invitations:** token = 32-byte random URL-safe; store `sha256(token)` + email + role + projectId + expiresAt. Accept creates a `ProjectMember` and burns the token.
- **Isolation:** a single `ProjectGuard` resolves `projectId` from the route, loads the requester's membership (or 404 if none), attaches `{ project, membership }` to the request. Services receive the membership and never re-trust client input for ownership.

## Integration Points

- **Events emitted:** `projects.project.created/updated/deleted`, `projects.member.added/removed`, `projects.invitation.accepted`. Consumed by the audit consumer (Phase 02) and later by Monitoring/realtime.
- **Service registry:** registers `projects`.
- **SDK (16):** `projects.*`, `projects.env.*`, `projects.members.*`, `projects.invitations.*`.
- **CLI (18):** `fidscript project create/list/select`, `fidscript env set/get`.
- **Dashboard (19):** project list/detail, members, env-var editor, invitations.
- **Consumers:** Deployments (06), Storage (05), Databases (08), Functions (10) all key off the Project + membership established here.

## Verification (VPS)

```bash
# 1) Create project + set an encrypted secret (with a real ENCRYPTION_KEY mounted):
PID=$(curl -fsS -X POST .../api/v1/projects -H "Authorization: Bearer $TOKEN" -d '{"name":"demo","slug":"demo"}' | jq -r .id)
curl -fsS -X POST .../projects/$PID/env -d '{"key":"DATABASE_URL","value":"postgres://..."}'

# 2) Secret is encrypted at rest (no plaintext in the DB):
docker compose exec postgres psql ... -c "select key,value from projects.project_envs where key='DATABASE_URL';"  # value is ciphertext, not the URL

# 3) Tenant isolation: user B (not a member) cannot read project A:
curl -s -o /dev/null -w "%{http_code}" .../projects/$PID -H "Authorization: Bearer $TOKEN_B"   # 404

# 4) Invitations: invite B by email → B accepts → B can now read 200
```

**Exit criterion:** a project's env vars are unreadable in the DB (ciphertext), decryption works in-process, membership RBAC is enforced, invitations convert to memberships, and cross-project access is denied. The platform now has a trustworthy tenancy boundary.

## Out of Scope / Future

- Routing the reserved subdomain (Phase 07) and serving it (Phase 06).
- Resource quotas/billing per project (future).
- Key rotation tooling (documented, not built).

## Risks

- A misconfigured/rotated `ENCRYPTION_KEY` makes existing secrets undecryptable → fail closed, document the key, back it up via secrets manager, never commit it.
- Forgetting to route a new resource type through `ProjectGuard` reopens isolation holes — the isolation prove-it test is the backstop.

## Next Phase

[Phase 05: Storage Platform](./phase-05.md)
