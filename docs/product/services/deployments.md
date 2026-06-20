# Service: Deployments

The deployment lifecycle for a project: from "paste a git URL" to "HTTPS URL serving traffic" — and
everything between (build logs, rollback, lifecycle).

## 1. Purpose
Turn a Dockerfile repo into a running container, served at `<slug>.apps.<domain>` over TLS, with
build + health visibility and zero-downtime rollback.

## 2. Screens
- **Deployments** (sidebar §2): tabs *Active / All / Logs / Build Config*.
- **Deployment detail** (`/dashboard/projects/:id/deployments/:id`): state machine header, live logs,
  metadata, rollback.
- **Logs** (`/deployments/:id/logs`): streaming build output.
- **Build config** (`/build-config`): strategy, buildCommand, outputDirectory, healthCheckPath,
  healthCheckPort, startupTimeoutSeconds.

## 3. Data model
- `ProjectSettings.activeDeploymentId` — the per-project deployment lock (one in flight).
- `Deployment` — id, projectId, releaseId, status
  (`PENDING|BLOCKED|QUEUED|BUILDING|DEPLOYING|SUCCESS|FAILED|STOPPED|ROLLED_BACK`),
  deploymentUrl, rolledBackToId, createdAt, completedAt.
- `Release` — id, deploymentId, sourceUrl, sourceType (`git|archive`), commitSha, imageTag
  (`fidscript/<slug>:<version>`), buildLogs (string), buildConfig (snapshot), env (encrypted).
- **Build profiles** (`DeploymentProfile`): `FRONTEND|BACKEND|STATIC|DOCKER|WORKER|CRON` — drive
  Traefik routing, port exposure, and health-check semantics. The audit notes profile `DOCKER`
  is the safe fallback.

## 4. API mapping
- List/create/get: `DEPL-01/02/03`. Logs: `DEPL-04`. Lifecycle: stop `DEPL-05`, restart `DEPL-06`,
  delete `DEPL-07`, rollback `DEPL-08`. Build config: `DEPL-09/10`.

## 5. Realtime events
`deployments.deployment.{created,blocked,queued,building,succeeded,failed,stopped,rolled_back}` —
the live state machine. The Deployments screen subscribes and updates rows in place (no polling).

## 6. Settings
- **Build config (project-level, auto-managed defaults):** strategy `dockerfile` (only
  implemented provider; `buildpack`/`archive` are stubs per audit), healthCheckPath `/`,
  healthCheckPort profile default (`3000` for web, `8080` for static), startupTimeoutSeconds `120`.
- **Container hardening (managed by platform, not user-visible):** `--restart unless-stopped`,
  `--security-opt no-new-privileges`, `--read-only`, tmpfs `/tmp:64m` + `/storage:128m`,
  `--memory 512m`, `--cpus 1`, `--network fidscript-app`. Web profiles get Traefik labels
  (Host(`<domain>`), tls, loadbalancer.server.port).
- **Env:** edited in the project's Settings → Env (PROJ-17); injected as BuildKit `--secret`
  at build time, `-e` at run time.

## 7. Automation
- **Auto-create** the slug from the project name on create; the route is auto-derived
  (`<slug>.apps.<domain>`) + Traefik-labeled.
- **Auto-health probe** from the API container over `fidscript-app` (avoids `docker exec curl`
  into images that lack curl — see audit + F06's bug fix in this session).
- **Auto-rollback** to the previous SUCCESS on rollback (DEPL-08) — no rebuild needed (image
  already exists; release is reused).
- **Auto-recovery** of stuck PENDING deployments on API restart (`DeploymentStateService`).

## 8. Dependencies
- **Hard:** Docker socket access (compose `group_add: ["$DOCKER_GID"]`); BuildKit
  (`docker-buildx-plugin`); projects.
- **Hard:** SSL/TLS via Domains + Traefik (a deployment at `<slug>.apps.<domain>` only works
  once the platform's wildcard cert is live).
- **Backend gaps** (from the audit):
  - `archive` source type throws (`Archive source not yet supported…`).
  - `DEPLOYING` state is declared but never written.
  - Lifecycle precondition failures throw plain `Error` → HTTP 500. UI must show a real error
    with the container logs link, not a generic "something went wrong."
  - Role is **ignored** on deployments — any member can destroy/rollback. Document; UI should
    still grey these for `viewer` and the backend should be hardened later.
  - Dockerfile only. Nixpacks / buildpacks are aspirational (the audit found no buildpack provider).

## 9. Phase
**F06 (Deployments UI)** — pending spec. Build config UI lives in F06; project-wide build settings
surface in F04 (Projects) → Settings → Build Config.
