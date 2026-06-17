# Phase 06: Deployment Engine

> **Status:** Planned  |  **Track:** Core  |  **Depends on:** Phase 02, Phase 04, Phase 05

## Objective

The core product promise: **a project deploys and serves live HTTP traffic.** Submit source (git repo or uploaded archive), the platform builds a Docker image, runs the container, routes it under a live URL, and streams build logs. Today "deploy" inserts a row with `status:'PENDING'` and nothing else happens.

## Current State

**STUB.** See `docs/AUDIT.md` §C (Deployments). Specific defects:

- `create()` inserts a `PENDING` row. `triggerBuild()`/`completeBuild()` flip a status column and have **zero callers** — dead code.
- No Docker, no image build, no container run, no routing, no `deploymentUrl`. The single most important feature is not implemented.
- No build logs, no status state machine driven by a worker, no rollback, no teardown.

## Dependencies

- **Phase 02** (events drive the async build/deploy lifecycle).
- **Phase 04** (Project + membership + encrypted env vars injected at runtime).
- **Phase 05** (build logs and artifacts persisted to object storage).
- **Phase 01** (Docker available on the host; a shared bridge network + Traefik).

## Deliverables

- [ ] **Real build.** Pull source — a public/private git repo (clone with an optional deploy key/token) or an archive uploaded to Storage (05) — and `docker build` a tagged image (`fidscript/<project>:<deploy>`). Support user-provided `Dockerfile` first; a minimal buildpack/heuristics path (Node/Python/static) is a stretch goal, not required to exit.
- [ ] **Real deploy.** `docker run` the image on the platform host attached to the shared app network, with Traefik labels routing `<slug>.apps.deploy.fidscript.com` → the container. `deploymentUrl` is populated and **live**.
- [ ] **Async worker, not the HTTP request.** The build+deploy runs on a queue/worker; the API records state transitions. The request returns `202` + deployment id; clients poll or watch events.
- [ ] **Status state machine.** `PENDING → QUEUED → BUILDING → DEPLOYING → LIVE` or `→ FAILED`, driven by the worker, with failure reason + a tail of build logs.
- [ ] **Build logs.** Streamed to the client (realtime in Phase 13; here persisted + fetchable) and stored as an object in Storage (05).
- [ ] **Runtime config injection.** Encrypted env vars (Phase 04) are decrypted and passed to the container as real env (never baked into the image).
- [ ] **Lifecycle ops.** Restart, stop, destroy (remove container + image + Traefik route), rollback to a previous deployment.
- [ ] **Resource limits + hardening.** `docker run` with `--memory`, `--cpus`, `--restart`, `--read-only` where feasible, `--security-opt no-new-privileges`, dropped capabilities, and **no host docker socket mounted into the user container**.

## Technical Design

- **Build runner, not raw host socket for user images.** A dedicated, trusted *builder* service/container holds the docker socket and performs builds/runs on behalf of the platform. **User containers never receive the socket** — closing the privilege-escalation surface that today's functions/runtime share.
- **Source → image:** `git clone` (shallow) into a temp workspace → `docker build -t <tag> -f Dockerfile .` → push to a local registry (optional) or run directly. Archives are fetched from Storage and extracted.
- **Routing:** each deployed container is launched with Traefik Docker labels (`traefik.http.routers.<id>.rule=Host(`<slug>.apps.deploy.fidscript.com`)`, on the shared `traefik-public`/app network). Traefik picks it up dynamically — no file edits.
- **Why a worker:** builds take minutes; doing it in the HTTP handler times out and holds a connection. A queue (Phase 11) or an in-process worker (Phase 02 events) drives transitions. (If Phase 11 isn't done, an in-process worker is acceptable for the single-node VPS.)
- **Isolation:** every container is project-scoped; the deployment record carries `projectId`; `ProjectGuard` gates every route.

## Integration Points

- **Events emitted:** `deployments.deployment.created/queued/building/deploying/succeeded/failed/stopped`. The headline consumer of the Phase 02 bus.
- **Service registry:** registers `deployments`.
- **SDK (16):** `deployments.create/list/get/logs/stop/restart/rollback`.
- **CLI (18):** `fidscript deploy` (from a project dir), `fidscript deployments logs`.
- **Dashboard (19):** deployments list, live status, build-log viewer, promote/rollback.
- **Consumers:** Domains (07) attaches custom domains to a deployment; Realtime (13) streams status/logs; Monitoring (14) scrapes deployed-app metrics.

## Verification (VPS)

```bash
# Deploy a trivial static image (real build + run + route):
DEPL=$(curl -fsS -X POST .../api/v1/projects/$PID/deployments \
  -d '{"source":{"type":"git","url":"https://.../hello-http.git"}}' | jq -r .id)

# Poll until LIVE, then fetch the live URL:
URL=$(curl -fsS .../deployments/$DEPL | jq -r .deploymentUrl)   # https://<slug>.apps.deploy.fidscript.com
curl -fsS "$URL"        # 200, real content from the deployed app

# Build logs persisted + fetchable:
curl -fsS .../deployments/$DEPL/logs | tail

# Teardown:
curl -fsS -X DELETE .../deployments/$DEPL
curl -s -o /dev/null -w "%{http_code}" "$URL"   # 404 after the route is gone
```

**Exit criterion:** a deployment reaches `LIVE`, its URL serves real HTTP from the deployed container, logs are available, and destroying it removes the route. The build/worker is real, the container runs, and no user container has the host docker socket.

## Out of Scope / Future

- Buildpack auto-detection beyond Dockerfile (future; Dockerfile-first now).
- Multi-node scheduling / Kubernetes (future; single-VPS now).
- Zero-downtime blue-green, preview environments, autoscaling (future).
- Private registry w/ scanning (future; trusted-source assumption today).

## Risks

- **Host compromise via build/run** is the top risk. Mitigations: builder holds the socket, user containers don't; resource caps; `no-new-privileges`; dropped caps; trusted or reviewed base images; workspace on ephemeral tmpfs, wiped after build.
- Builds that consume all disk/RAM starve the host → enforce limits; fail builds that breach them.
- A bad `Dockerfile` or malicious image can still do damage inside its container — the isolation boundary is the container + network + cgroups, not a VM. Document this honestly (single-tenant trust model per VPS).

## Files you'll touch (precision map)

- Stub lives at: `apps/api/src/modules/deployments/deployments.service.ts` (`create()` inserts a `PENDING` row; `triggerBuild`/`completeBuild` flip a column with **zero callers** — dead code).
- Controller + dto: `apps/api/src/modules/deployments/` (`dto/create-deployment.dto.ts`, enum `BuildStrategy`).
- Prisma: `Deployment`, `BuildConfig`, enum `DeploymentStatus`.
- Create: a trusted build **runner** that holds the Docker socket (user containers never get it) — e.g. `apps/api/src/modules/deployments/runner/` or a sidecar; wire it through the Phase 02 event bus.
- Infra: a shared Docker bridge network + Traefik labels on deployed containers routing `<slug>.apps.deploy.fidscript.com`.

## Next Phase

[Phase 07: Domains & TLS](./phase-07.md)
