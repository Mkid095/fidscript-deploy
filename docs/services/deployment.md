# Deployment Service

> **Phase:** 06  |  **Status:** Verified  |  **Owner:** Phase 06

## Overview

The Deployment Engine is the core product promise: a project deploys and serves live HTTP traffic. Submit source (git repo with a Dockerfile), the platform builds a Docker image, runs the container, routes it under a live URL, and streams build logs.

---

## Deployment Matrix

How each `ProjectType` is deployed:

| Type     | Traefik Route | HTTP Health Check | Port Required | Container Lifecycle | Notes |
|----------|--------------|-------------------|---------------|---------------------|-------|
| `FRONTEND` | ✅ Yes | ✅ Yes (`/`) | ✅ Yes (default 3000) | Detached + health probe | Standard web app |
| `BACKEND`  | ✅ Yes | ✅ Yes (`/health`) | ✅ Yes (default 3000) | Detached + health probe | API service |
| `STATIC`   | ✅ Yes | ✅ Yes (`/`) | ✅ Yes (default 8080) | Detached + health probe | Static file server |
| `DOCKER`   | ✅ Yes | ✅ Yes (configurable) | ✅ Yes (configurable) | Detached + health probe | User controls everything |
| `WORKER`   | ❌ No  | ❌ No | ❌ No | Detached, no probe | Background process; no HTTP |
| `CRON`     | ❌ No  | ❌ No | ❌ No | Detached, no probe | Background; future scheduler Phase 12 will enable |

### Key Behaviour by Type

#### FRONTEND / BACKEND / STATIC / DOCKER
- Container joins `fidscript-app` network
- Traefik routes `https://<slug>.apps.deploy.fidscript.com` → container port
- `PORT` env var injected (configurable via `BuildConfig.healthCheckPort`)
- Health check: `GET localhost:<port><healthCheckPath>` (curl in container)
- Fails deployment if health check doesn't respond within 60s

#### WORKER
- Container joins `fidscript-app` network
- **No Traefik route** — not publicly addressable
- **No `PORT` env var** injected
- **No health check probe** — deployment succeeds as soon as container is `Running`
- Container is a background process (e.g. message consumer, queue processor)

#### CRON
- Same as WORKER: no route, no port, no health check
- Future (Phase 12): `CronJob` record will be created alongside the deployment
- For now: deployed but disabled until scheduler platform is built

---

## Deployment Profiles

Every `ProjectType` maps to a `DeploymentProfile` defined in `apps/api/src/modules/deployments/types/deployment-profile.ts`:

```typescript
export interface DeploymentProfile {
  label: string;
  requiresRoute: boolean;   // Create Traefik route?
  requiresPort: boolean;     // Expose and bind a port?
  defaultPort: number;       // Default PORT value
  requiresHealthCheck: boolean;
  healthCheckPath: string;   // Path for HTTP health probe
  isWorker: boolean;         // Background-only, no HTTP
  isCron: boolean;           // Cron-style, no HTTP
}
```

The profile is resolved from `Project.type` at deploy time. Unknown types default to the `DOCKER` profile.

---

## Build System

### Architecture: `BuildProvider` Interface

Build strategies are pluggable via the `BuildProvider` interface:

```typescript
export interface BuildProvider {
  name: string;
  validate(context: BuildContext): Promise<void>;  // Fail fast before building
  build(context: BuildContext): Promise<BuildResult>;
}
```

### Phase 06 Implementation: `DockerfileBuildProvider`

The only provider implemented today. It:

1. **Validates** — checks that a Dockerfile exists in the cloned source (before building)
2. **Fetches source** — `git clone --depth=1 --branch <branch> <url> <workspace>`
3. **Builds** — `docker build -t fidscript/<slug>:<version> -f <dockerfile> <workspace>`
4. **Secrets** — env vars written to `.fidscript.env` (mode 0o600) and passed via `--secret id=envfile,src=<path>` (not `--build-arg`, which leaks into image layers)
5. **Cleans up** — ephemeral `/tmp/fidscript-build-*` workspace wiped after build

### Future Providers (not implemented)

| Provider | Trigger | Phase |
|----------|---------|-------|
| `NodeBuildpackProvider` | `strategy: 'buildpack'` + detected Node app | Future |
| `PythonBuildpackProvider` | `strategy: 'buildpack'` + detected Python app | Future |
| `StaticBuildpackProvider` | `strategy: 'buildpack'` + static site heuristic | Future |

These plug in by implementing `BuildProvider` and registering in `DeploymentsModule` — no changes to `BuildRunnerService` or `DeploymentWorkerService`.

---

## Env Var Injection

Project environment variables (Phase 04, AES-256-GCM encrypted in `ProjectEnv`) are:

1. **Decrypted** by `CryptoService.decrypt()` in `DeploymentWorkerService`
2. **Injected at runtime** as `-e KEY=value` flags to `docker run`
3. **Never baked into image layers** (via `--secret`, not `--build-arg`)

This means:
- Rotating an env var doesn't require a rebuild
- Env vars are not visible in `docker inspect` output for intermediate layers
- The running container has the decrypted values; the image does not

---

## Container Security

All deployed containers run with:

```
--security-opt no-new-privileges
--read-only
--tmpfs /tmp:rw,noexec,nosuid,size=64m
--memory 512m
--cpus 1
--restart unless-stopped
```

The Docker socket is held by the **API container** (via the `docker.sock` bind mount). User containers **never** receive the socket. This is the primary host-compromise mitigation.

---

## Status State Machine

```
PENDING → QUEUED → BUILDING → DEPLOYING → SUCCESS
                        ↓
                      FAILED
                        ↓
                  (retry → PENDING)

SUCCESS → STOPPED → SUCCESS (restart)
SUCCESS → ROLLED_BACK (via rollback → new deployment)
```

`QUEUED` and `STOPPED` were added to `DeploymentStatus` in Phase 06.

---

## Routing

Deployed containers are routed via Traefik Docker labels:

```
traefik.enable=true
traefik.http.routers.<containerName>.rule=Host(`<slug>.apps.deploy.fidscript.com`)
traefik.http.routers.<containerName>.entrypoints=websecure
traefik.http.routers.<containerName>.tls=true
traefik.http.services.<containerName>.loadbalancer.server.port=<port>
traefik.docker.network=fidscript-app
```

The `fidscript-app` Docker network is shared between Traefik and all deployed containers.

---

## Lifecycle Operations

| Operation | Endpoint | Effect |
|-----------|----------|--------|
| Create | `POST /projects/:pid/deployments` | Returns `202 Accepted`, worker picks up async |
| Stop | `POST /projects/:pid/deployments/:id/stop` | `docker stop`, status → `STOPPED` |
| Restart | `POST /projects/:pid/deployments/:id/restart` | `docker restart`, status → `SUCCESS` |
| Destroy | `DELETE /projects/:pid/deployments/:id` | `docker rm -f`, image NOT removed, row deleted |
| Rollback | `POST /projects/:pid/deployments/:id/rollback` | New `PENDING` deployment re-running previous image |

---

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/v1/projects/:projectId/deployments` | List deployments (paginated) |
| `POST` | `/api/v1/projects/:projectId/deployments` | Create deployment (async) |
| `GET` | `/api/v1/projects/:projectId/deployments/:id` | Get deployment details |
| `GET` | `/api/v1/projects/:projectId/deployments/:id/logs` | Get build logs |
| `POST` | `/api/v1/projects/:projectId/deployments/:id/stop` | Stop running deployment |
| `POST` | `/api/v1/projects/:projectId/deployments/:id/restart` | Restart stopped deployment |
| `DELETE` | `/api/v1/projects/:projectId/deployments/:id` | Destroy deployment |
| `POST` | `/api/v1/projects/:projectId/deployments/:id/rollback` | Rollback to previous |
| `GET` | `/api/v1/projects/:projectId/build-config` | Get build config |
| `PATCH` | `/api/v1/projects/:projectId/build-config` | Update build config |

---

## Events Emitted

| Event | When |
|-------|------|
| `deployments.deployment.created` | HTTP handler created the row |
| `deployments.deployment.queued` | Worker picked up the job |
| `deployments.deployment.building` | Build started |
| `deployments.deployment.succeeded` | Container live + healthy |
| `deployments.deployment.failed` | Build or deploy failed |
| `deployments.deployment.stopped` | Container stopped by user |
| `deployments.deployment.rolled_back` | Rollback triggered |

All events are typed in `EventType` union (`packages/events/src/index.ts`).

---

## Out of Scope

- **Archive source** — git source only; archive from Storage (Phase 05) is stubbed
- **Buildpacks** — Dockerfile-first now; buildpack providers are a future phase
- **Multi-region** — single VPS; multi-node scheduling is future
- **Blue-green / canary** — zero-downtime deploys are future
- **Autoscaling** — HPA-based scaling is future

---

## Files

| File | Role |
|------|------|
| `apps/api/src/modules/deployments/deployments.service.ts` | HTTP handler: create/list/get/stop/restart/destroy/rollback |
| `apps/api/src/modules/deployments/runner/build-runner.service.ts` | Docker run orchestration, network, health checks |
| `apps/api/src/modules/deployments/runner/deployment-worker.service.ts` | Event listener, state machine driver |
| `apps/api/src/modules/deployments/providers/build-provider.interface.ts` | `BuildProvider` interface |
| `apps/api/src/modules/deployments/providers/dockerfile-build.provider.ts` | Dockerfile-based build strategy |
| `apps/api/src/modules/deployments/types/deployment-profile.ts` | `DeploymentProfile` type + all project type profiles |
| `apps/api/prisma/schema.prisma` | `Deployment`, `BuildConfig` models |
| `apps/api/prisma/migrations/20260617170000_*/migration.sql` | `QUEUED`, `STOPPED` added to enum |
| `installer/docker/docker-compose.yml` | `fidscript-app` network added |
| `packages/events/src/index.ts` | `deployments.deployment.*` events in `EventType` union |