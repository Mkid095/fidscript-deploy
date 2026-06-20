# Service: Functions (edge)

User-written Node/Python handlers that run in a sandboxed container — invoked on demand.

## 1. Purpose
Run a snippet of code when something calls it: webhook handler, data transform, API logic.
Cold-start under a second. No SSH, no servers to manage.

## 2. Screens
- **Functions** (sidebar §3): list + tabs *Functions / Versions*.
- **Function detail**: tabs *Code / Deploy / Invoke / Logs*. The Code tab is an in-browser editor;
  Deploy uploads the code; Invoke runs it; Logs tail the per-invocation entries.

## 3. Data model
- `Function` — id, projectId, name, runtime (`nodejs|python|php|go|rust`), entryPoint
  (default `index.handler`), memoryMb (default 256), timeoutSeconds (default 30), envVars
  (encrypted), status (`created|deployed|failed`), currentVersion.
- `FunctionLog` — id, functionId, version, status, durationMs, payload, output, error,
  memoryUsedMb (placeholder), timestamp.

## 4. API mapping
- CRUD + deploy + invoke + logs + versions: `FN-01..09`.

## 5. Realtime events
`function.{created,updated,deleted,deployed,invoked,error}` — the detail screen subscribes so
the Code/Deploy/Invoke/Logs tabs update live during a deploy or invoke.

## 6. Settings
- **Runtime:** the spec lets you pick `nodejs|python|php|go|rust` — **only nodejs + python are
  actually implemented** (per audit). The UI must grey the other runtimes and show "not yet
  available" honestly (Principle 7).
- **Memory / timeout:** defaults are beginner-friendly (256 MB / 30 s). The UI exposes them on
  the function's settings; advanced users can dial up.
- **Env vars:** stored encrypted; passed as `-e` to the container at invoke time.

## 7. Automation
- **Cold start** pulls the runtime image on first use; subsequent invokes use the cached image.
- **Code via stdin:** the runner pipes code through `execFileSync('docker', args, { input })` —
  no bind-mount, no shell (the F07 fix that made it work). Code is never written to the host.
- **Sandbox:** read-only rootfs, tmpfs `/tmp:64m`, no network (`--network none`), cap-drop ALL,
  pids-limit 64, mem + mem-swap (OOM on limit). The audit confirmed these are enforced.

## 8. Dependencies
- **Hard:** the API container has `docker-ce-cli` + `docker-buildx-plugin` + `git` (F06 fix in
  this session) and can talk to the host daemon (`group_add: ["$DOCKER_GID"]`).
- **Soft:** projects (functions belong to a project; the route is `/projects/:projectId/functions`).
- **Backend gaps** (from the audit):
  - php/go/rust runtimes don't execute.
  - `memoryUsedMb` is a placeholder (`durationMs/1000`).
  - Env-var comment says "decrypted" but no decrypt call is in the invoke path — known gap.
  - Versions are derived from distinct `FunctionLog.version`, not a dedicated table.

## 9. Phase
**F07 (Functions UI)** — pending spec.
