# Service: Projects

The workspace's primary unit — the container for all services, members, env, API keys, and
configurations. Every per-service screen lives **inside** a project.

## 1. Purpose
A project is the tenant boundary: one database, one storage namespace, one set of functions,
queues, email, etc. The user creates a project, then opens it to access the sidebar's services.

## 2. Screens
- **Workspace root** (`/dashboard`) — projects list, create, recent activity (`docs/product/navigation.md` §1).
- **Project dashboard** (`/dashboard/projects/:id`) — overview tabs (Deployments default).
- **Settings** (14 sidebar) — General, Env, API Keys, Members, Invitations, Build Config, Danger Zone.

## 3. Data model (Prisma)
- `Project` — id, name, slug (auto), type (`frontend|backend|worker|cron|docker|static`), description,
  region, status (`ACTIVE|SUSPENDED|ARCHIVED|DELETED`), ownerId, timestamps.
- `ProjectMember` — id, projectId, userId, role (`admin|developer|viewer`).
- `ProjectInvitation` — id, projectId, email, role, token (hashed), expiresAt, inviterId.
- `ProjectEnv` — id, projectId, key, value (AES-256-GCM encrypted).
- `ProjectApiKey` — id, projectId, name, keyHash (SHA-256), permissions, lastUsedAt, expiresAt.
- `ProjectSettings` — id, projectId, activeDeploymentId (deployment lock), flags.

## 4. API mapping
- List/create/get: `PROJ-01/02/03`. Lifecycle: `PROJ-04..08`. Clone: `PROJ-09`.
- Members: `PROJ-10/11/12`. Invitations: `PROJ-13/14/15/22`.
- Env (encrypted): `PROJ-16/17/18`.
- API keys (`fpk_`): `PROJ-19/20/21`.

## 5. Realtime events
`projects.project.{created,updated,deleted,suspended,archived,restored,cloned}`,
`projects.member.{added,removed}`, `projects.invitation.{created,accepted,revoked}`,
`projects.env_var.{updated,deleted}`, `projects.api_key.{created,revoked}`.

## 6. Settings
- **Project-level:** name, description, type (set at create; type drives defaults), region.
  Auto-managed: slug, ownerId, status.
- **Member-level:** role (admin/developer/viewer). The audit notes `developer`/`viewer` currently
  grant only read across most services — the contract is "read + act within their tier."
- **Env (encrypted at rest):** set on the Settings → Env tab. `DATABASE_URL`/`DB_*` and other
  service-injected keys are auto-managed; user edits only the rest.

## 7. Automation
- **Clone** copies env (decrypted → re-encrypted under the new project's key).
- **Database provision / rotation** auto-injects/rewrites `DATABASE_URL` + `DB_*` env (DB-01, DB-08).
- **Invitation accept** (PROJ-22) is public; creates a `ProjectMember` from the token.
- **Status transitions** (suspend/archive/restore) emit their event; the Activity feed
  shows the chain.

## 8. Dependencies
- **Hard:** auth (F02) — every project route is JWT + project access.
- **Hard:** all per-service screens live inside a project.
- **Backend gaps** (from the audit):
  - `PROJ-20` (`dto:any`) — api-keys create has no DTO. UI must validate locally; harden later.
  - `PROJ-14` `role` is free-text, not enum. UI should constrain to the role select.
  - `developer`/`viewer` permissions are aspirational — UI greys admin-only actions, but the
    backend currently lets any member pass several destructive routes. Document the gap; harden.

## 9. Phase
Implemented by **F04 (Projects)**, specced under `docs/phases/frontend/f04-projects.md` (pending).
Settings is the cross-cutting home for env + members + API keys; builds are specced with deployments.
