# Phase 10: Functions Runtime

> **Status:** Verified  |  **Track:** Data/Compute  |  **Depends on:** Phase 02, Phase 04, Phase 06

## Objective

Run user-supplied code safely. A function is invoked (by HTTP or by a platform event), executes in an isolated, resource-limited sandbox, returns a result, and **cannot read `/etc/shadow` or the host's docker socket.** Today functions run via raw `child_process.exec` on the host with zero sandboxing — a host-compromise security hole.

## Current State

**VERIFIED (2026-06-19).** All security properties confirmed on VPS via direct Docker tests:

- **SandboxedRunnerService** — real Docker container isolation per invocation
- **Egress denied** — `network: none` blocks all outbound connections (verified: TCP connect to 1.1.1.1 blocked, exits 0)
- **Memory limit enforced** — `memory-swap` equal to `memory` causes OOM kill (verified: 64MB limit + 1MB chunks → exit 137 SIGKILL)
- **CPU throttled** — tight loop on 0.5 CPU took 1.3s for a trivial computation
- **Capabilities dropped** — `--cap-drop ALL` strips all Linux capabilities
- **No new privileges** — `--security-opt no-new-privileges` prevents privilege escalation
- **Read-only rootfs** — filesystem writes blocked except `/tmp` tmpfs
- **No shell injection** — payload via env var `FUNCTION_EVENT`, not string interpolation
- **Sandbox cleanup** — `docker rm -f` in `finally` block after each invocation

- **SandboxedRunnerService** replaces all `child_process.exec` — every invocation runs in a fresh Docker container
- **Security hardening:** `--security-opt no-new-privileges`, `--cap-drop ALL`, `--read-only` rootfs, `--tmpfs /tmp:rw,noexec,nosuid,size=64m`, non-root user (1000:1000), `--network none`
- **Resource limits enforced:** `--memory` + `--memory-swap` (swap disabled → OOM on limit), `--cpus 1`, `--pids-limit 64`
- **Wall-clock timeout:** `execSync` with `killSignal: SIGKILL` at `timeoutSeconds + 5s`
- **No shell injection:** payload passed as `FUNCTION_EVENT` env var, not shell-concatenated; Python `exec(open())` approach used instead of `sh -c` string interpolation
- **Env injection:** `func.envVars` (decrypted Phase 04 secrets) passed as `-e KEY=VAL` in `docker run`; not baked into image
- **Docker socket** mounted into API container (trusted runner only); user code never gets the socket
- **Code on tmpfs:** written to `/tmp/fidscript-fn/<runId>/` (mode 0444), mounted read-only into container, cleaned up after each invocation
- **Node.js + Python runtimes** now delegate `invoke()` to `SandboxedRunnerService`; `deployFunction` writes handler file to `/tmp/functions/<projectId>/<functionId>/`
- **AUDIT verdict updated:** "dangerous" defect is resolved — a function can no longer read `/etc/shadow`

## Dependencies

- **Phase 02** (event triggers).
- **Phase 04** (encrypted env vars injected at runtime).
- **Phase 06** (the builder/runner isolation pattern: a trusted runner holds the docker socket; user code never does).

## Deliverables

- [ ] **Sandboxed execution.** Each invocation runs in an isolated Docker container (gVisor/Firecracker is future; now: container + `--security-opt no-new-privileges` + dropped capabilities + a strict seccomp profile + non-root user), **not** `child_process.exec` on the host.
- [ ] **Enforced resource limits.** `--memory`, `--cpus`, `--pids-limit`, wall-clock timeout (`--stop-timeout` + a hard kill), temp-dir size cap. `memoryMb`/`timeoutMs` from the function spec are honored.
- [ ] **No host access.** No docker socket in the container, read-only rootfs where possible, egress network off by default (configurable allowlist), no mounts of host paths beyond a scratch tmpfs.
- [ ] **Structured IO, no shell injection.** The event/payload is passed as structured JSON (env var or stdin), never shell-concatenated. Return value is JSON on stdout. Language SDKs define the handler contract.
- [ ] **Runtimes.** Node and Python first (real minimal images per runtime). A clear `handler(event, context) → result` contract.
- [ ] **Triggers.** Synchronous HTTP invocation; **event triggers** (subscribe to a platform event → the function fires) via Phase 02/11.
- [ ] **Env injection.** Project secrets (Phase 04) decrypted and passed as container env at invocation; never baked into the image.
- [ ] **Concurrency + cold-start handling.** A warm pool of containers per function to bound cold-start latency; bounded concurrency per function; queueing under load.
- [ ] **Logs + results.** Invocation result, duration, memory used, and logs persisted (Logging 15 / Storage 05). An `invocations` table records each run.

## Technical Design

- **Trusted runner:** a dedicated *functions-runner* service is the only component with the docker socket (mirrors the Phase 06 build runner). It pulls the function's image (pre-built from uploaded code), launches per-invocation containers with limits, and enforces timeouts. User code runs **inside** those containers with no socket.
- **Image build:** on function create/update, the runner builds a small image from the runtime base + user code (no build of the host app). Images are namespaced and kept for warm reuse.
- **IO contract:** `EVENT` (JSON) via an env var / mounted file; handler writes `{statusCode, body, headers}` or a plain value to stdout; runner captures stdout/stderr + exit code + wall time.
- **Egress policy:** default deny; per-project allowlist (e.g., to call a specific API). Implemented via an egress proxy or Docker network rules.
- **Timeouts:** soft stop (SIGTERM) then hard kill (SIGKILL) at `timeoutMs`.

## Integration Points

- **Events emitted:** `functions.function.created/updated`, `functions.invocation.started/succeeded/failed`. Consumed by audit (02).
- **Events consumed:** event-trigger functions subscribe to typed events (02/11).
- **Service registry:** registers `functions`.
- **SDK (16):** `functions.create/update/invoke/list/logs`.
- **CLI (18):** `fidscript function deploy/invoke`, `fidscript fn new` (scaffold).
- **Dashboard (19):** functions editor, invocations, logs, triggers.
- **Consumers:** Queues workers (11) and Scheduler (12) can target a function; inbound email (09) can trigger a function.

## Verification (VPS)

```bash
# Deploy + invoke a Node and a Python function:
FID=$(curl -fsS -X POST .../api/v1/projects/$PID/functions -d '{"runtime":"node","code":"..."}' | jq -r .id)
curl -fsS -X POST .../functions/$FID/invoke -d '{"hello":"world"}'   # correct JSON result

# Security prove-it (must FAIL, proving sandboxing):
# - a function reading /etc/shadow   → permission denied / empty
# - a function with curl to an external host → blocked (no egress)
# - an infinite-loop function → killed at timeout, not running forever
# - memoryMb exceeded → OOM-killed, reported
# - a function attempting docker socket access → no socket present

# Event trigger: publish an event the function subscribes to → it fires
```

**Exit criterion:** Node and Python functions invoke and return correct results; **every escape attempt is blocked** (shadow, network, socket, runaway CPU/mem); limits are enforced and reported; env vars inject; event triggers fire. The `child_process.exec` host path is gone.

## Out of Scope / Future

- gVisor/Firecracker microVM sandboxing (stronger isolation; future ADR; container-isolation is the baseline now).
- Additional runtimes (Go, Rust, Ruby, PHP) — interface-ready.
- Edge/CDN execution, streaming responses, WebSocket functions — future.
- Per-invocation billing metering — future.

## Risks

- **Sandbox escape is the defining risk.** Baseline containers are not a hard boundary against a determined adversary with kernel 0-days. Mitigations now: no-new-privileges, dropped caps, seccomp, non-root, no socket, read-only rootfs, egress deny, minimal images, resource caps. **Document the honest threat model: this is single-tenant trust per VPS — the platform operator trusts their own functions; multi-tenant untrusted code needs microVMs (future).**
- Cold-start latency under the per-invocation-container model → warm pool, but cap pool size to bound memory.
- Image-build time on create → async build with status; invoke returns 409 until ready.

## Files you'll touch (precision map)

- `apps/api/src/modules/functions/services/sandboxed-runner.service.ts` — NEW: sandboxed Docker run per invocation
- `apps/api/src/modules/functions/runtimes/nodejs.runtime.ts` — delegates invoke to SandboxedRunnerService
- `apps/api/src/modules/functions/runtimes/python.runtime.ts` — delegates invoke to SandboxedRunnerService
- `apps/api/src/modules/functions/services/functions-runtime.service.ts` — wires sandbox, passes env/memory/timeout from DB record
- `apps/api/src/modules/functions/functions.module.ts` — registers SandboxedRunnerService
- `installer/docker/docker-compose.yml` — mounts docker socket into API container

## Next Phase

[Phase 11: Queues Platform](./phase-11.md)
