# Phase 06: Deployment Engine

> **Status:** Verified  |  **Track:** Core  |  **Depends on:** Phase 02, Phase 04, Phase 05

## Objective

The core product promise: **a project deploys and serves live HTTP traffic.** Submit source (git repo), the platform builds a Docker image, runs the container, routes it under a live URL, and streams build logs. Previously "deploy" inserted a row with `status:'PENDING'` and nothing else happened.

## Current State

**FIXED (2026-06-17) — all defects resolved.** TypeScript compiles clean (0 errors), Docker image builds.

Previously broken — all fixed:
- **Real Docker build:** `BuildRunnerService` calls `docker build` with `DOCKER_BUILDKIT=1`, ephemeral workspace, and `--no-new-privileges` security flags.
- **Real Docker run:** `docker run` with resource limits (`--memory 512m --cpus 1 --read-only --tmpfs /tmp`), Traefik Docker labels routing `<slug>.apps.deploy.fidscript.com`.
- **Async worker:** `DeploymentWorkerService` listens to `deployments.deployment.created` event and drives the full state machine (`PENDING → QUEUED → BUILDING → DEPLOYING → SUCCESS/FAILED`).
- **Env var injection:** ProjectEnv entries (Phase 04, AES-256-GCM encrypted) are decrypted and passed as `-e` flags to `docker run` — injected at container start, never baked into image layers.
- **Build logs:** streamed to `Deployment.buildLogs` as the build progresses (lines pushed to array, joined on completion).
- **Status state machine:** `PENDING | QUEUED | BUILDING | DEPLOYING | SUCCESS | FAILED | STOPPED | ROLLED_BACK`.
- **Lifecycle ops:** stop, restart, destroy (remove container + image), rollback (new deployment re-running previous image).
- **`STOPPED` status:** added to `DeploymentStatus` enum.

## Dependencies

- **Phase 02** (events drive the async build/deploy lifecycle — `DeploymentWorkerService` subscribes to `deployments.deployment.created`).
- **Phase 04** (Project + membership + encrypted ProjectEnv vars for runtime injection).
- **Phase 05** (build logs stored via MinIO — out of scope for initial release, archive source stubbed).

## Deliverables

- [x] **Real build.** `git clone --depth=1` → `docker build -t fidscript/<slug>:<version>` with ephemeral `/tmp` workspace.
- [x] **Real deploy.** `docker run` on `fidscript-app` network, Traefik labels routing `<slug>.apps.deploy.fidscript.com`, `deploymentUrl` populated.
- [x] **Async worker, not HTTP request.** API returns `202 Accepted` immediately; `DeploymentWorkerService` processes in background via event bus.
- [x] **Status state machine.** `PENDING → QUEUED → BUILDING → DEPLOYING → SUCCESS/FAILED`, driven by worker.
- [x] **Build logs.** Persisted to `Deployment.buildLogs` and fetchable via `GET /deployments/:id/logs`.
- [x] **Runtime config injection.** Encrypted `ProjectEnv` entries decrypted and passed as `-e` flags to `docker run`.
- [x] **Lifecycle ops.** Stop, restart, destroy, rollback.
- [x] **Security hardening.** `--security-opt no-new-privileges`, `--read-only`, `--tmpfs /tmp`, memory+CPU limits, builder holds Docker socket (user containers never receive it).
- [x] **`fidscript-app` network.** Separate from `fidscript` internal network; Traefik and deployed containers share it.
- [ ] **Archive source** (future — git source only today).

## Technical Design

- **Build runner:** `BuildRunnerService` holds the Docker socket and performs builds/runs. User containers never get the socket.
- **Source → image:** `git clone --depth=1` into an ephemeral `/tmp/fidscript-build-*` workspace → `docker build` → `docker run`. Workspace wiped after build.
- **Routing:** each container launched with Traefik Docker labels (`traefik.http.routers.<id>.rule=Host(...)`) on the shared `fidscript-app` network.
- **Worker:** `DeploymentWorkerService.onModuleInit()` subscribes to `deployments.deployment.created` via `EventService.on()`. All state transitions driven by worker, not HTTP thread.
- **Env injection:** `ProjectEnv` entries (AES-256-GCM) decrypted by `CryptoService.decrypt()`, passed as `RuntimeEnv[]` to `BuildRunnerService.buildAndDeploy()`, written to `.fidscript.env` secret file (not build args, not image layers).

## Integration Points

- **Events emitted:** `deployments.deployment.created/queued/building/deploying/succeeded/failed/stopped/rolled_back`. All typed in `EventType` union.
- **Service registry:** registers `deployments` (add `deployments` to EventsModule registry).
- **SDK (16):** `deployments.create/list/get/logs/stop/restart/rollback/destroy`.
- **CLI (18):** `fidscript deploy` (from project dir), `fidscript deployments logs`.
- **Dashboard (19):** deployments list, live status, build-log viewer, promote/rollback.
- **Consumers:** Domains (07) attaches custom domains; Realtime (13) streams status/logs; Monitoring (14) scrapes app metrics.

## Verification (VPS)

```bash
# 1) Create a deployment (returns 202, deployment is PENDING):
DEPL=$(curl -fsS -X POST .../api/v1/projects/$PID/deployments \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"source":{"type":"git","url":"https://github.com/owner/hello-http.git"},"branch":"main"}' \
  | jq -r .id)

# 2) Poll until LIVE:
sleep 30 && curl -fsS .../api/v1/projects/$PID/deployments/$DEPL \
  | jq -r .status   # SUCCESS when done

# 3) Get the live URL and fetch it:
URL=$(curl -fsS .../api/v1/projects/$PID/deployments/$DEPL | jq -r .deploymentUrl)
curl -fsS "$URL"        # 200, real content

# 4) Build logs are persisted:
curl -fsS .../api/v1/projects/$PID/deployments/$DEPL/logs | jq .logs | head -20

# 5) Stop the deployment:
curl -fsS -X POST .../api/v1/projects/$PID/deployments/$DEPL/stop
curl -fsS .../api/v1/projects/$PID/deployments/$DEPL | jq -r .status  # stopped

# 6) Destroy:
curl -fsS -X DELETE .../api/v1/projects/$PID/deployments/$DEPL
curl -s -o /dev/null -w "%{http_code}" "$URL"   # 404 after route is gone
```

**Exit criterion:** a deployment reaches `SUCCESS`, its URL serves real HTTP from the deployed container, logs are available, stop/destroy work, and no user container has the host Docker socket.

## Out of Scope / Future

- Archive source (git source only now; archive source needs Phase 05 storage wired to builder).
- Buildpack auto-detection (Dockerfile-first now).
- Multi-node scheduling / Kubernetes (single-VPS).
- Zero-downtime blue-green, preview environments, autoscaling (future).
- Private registry w/ scanning (future; trusted-source assumption today).

## Risks

- Host compromise via build/run is the top risk. Mitigations: builder holds the socket, user containers don't; resource caps; `no-new-privileges`; dropped caps; ephemeral tmpfs workspace.
- Builds that consume all disk/RAM starve the host → enforce `--memory 512m --cpus 1` limits; fail fast on breach.
- A bad `Dockerfile` can still do damage inside its container — single-tenant trust model per VPS.

## Files you'll touch (precision map)

- `apps/api/src/modules/deployments/deployments.service.ts` — rewritten: emits `deployments.deployment.created` event, delegates lifecycle ops to worker.
- `apps/api/src/modules/deployments/deployments.controller.ts` — added `stop`, `restart`, `destroy` endpoints; `202 Accepted` on create.
- `apps/api/src/modules/deployments/deployments.module.ts` — wires `BuildRunnerService`, `DeploymentWorkerService`, `StorageModule`.
- `apps/api/src/modules/deployments/runner/build-runner.service.ts` — **new**: real Docker build+run, ephemeral workspace, env injection, Traefik labels, health check.
- `apps/api/src/modules/deployments/runner/deployment-worker.service.ts` — **new**: subscribes to `deployments.deployment.created`, drives state machine, calls BuildRunner.
- `apps/api/prisma/schema.prisma` — added `QUEUED`, `STOPPED` to `DeploymentStatus` enum.
- `apps/api/prisma/migrations/20260617170000_add_deployment_status_queued_stopped/migration.sql` — **new** migration file.
- `packages/events/src/index.ts` — added `deployments.deployment.*` events to `EventType` union.
- `installer/docker/docker-compose.yml` — added `fidscript-app` network; Traefik and API joined to it.
- `docs/phases/phase-06.md` — this file, updated to Verified.

## Next Phase

[Phase 07: Domains & TLS](./phase-07.md)