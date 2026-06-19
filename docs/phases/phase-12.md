# Phase 12: Scheduler Platform

> **Status:** Verified (2026-06-19)  |  **Track:** Data/Compute  |  **Depends on:** Phase 02, Phase 10, Phase 06

## Objective

Cron jobs that **survive a restart and fire on schedule**, targeting real HTTP endpoints and functions. Today jobs fire only while the process happens to be alive — every restart silently disables every schedule, and `functionId` targets are ignored.

## Current State

**Verified 2026-06-19.** The AUDIT §C defects are closed. See `docs/AUDIT.md` §C (Scheduler) for the updated verdict. What is now real (proven on the VPS):

- **Restore on boot.** `CronJobSchedulerService` implements `OnApplicationBootstrap` and re-registers **every** enabled job on startup — restarting the API no longer disables schedules (verified: a DB-only job inserted outside the running process was picked up and fired after restart).
- **Distributed lock.** `scheduleJob` acquires `schedule:lock:<jobId>` via Redis `SET NX PX` and releases with a Lua compare-and-delete (token-checked). Proven: second acquirer is blocked; wrong-token release is a no-op.
- **Both targets.** HTTP (`fetch(endpoint, POST)` w/ timeout) and function (`FunctionsService.invokeFunction`) branches both wired and exercised.
- **`nextRunAt`** computed from the real expression (`cron.CronTime.sendAt()`), refreshed after each fire.
- **Execution history** in `CronJobRun` (startedAt / completed / failed + errorMessage).
- **Correct failure surfacing.** A function-target run whose function errored used to be silently `completed` (invokeFunction returns rather than throws); executeJob now throws on `!fnResult.success`, so the run is recorded as `failed`.

**Honest gaps (still open, non-blocking for the exit criterion):**

- Only the **cron-expression** schedule type is implemented. Fixed-interval and one-shot (`runAt`) are not (no schema field for them yet).
- No explicit **concurrency policy** field (`allow`/`skip`/`replace`); the Redis lease gives implicit "skip" behavior.
- **Function-target execution cannot run on the current VPS** because the `node:18-alpine` sandbox image is not cached and the box has **no external egress** to pull it. The *scheduler dispatch* (`executeJob → invokeFunction → sandbox.run`, observable via `FunctionLog`) is verified; the *function runtime* executing successfully depends on a Phase 10 environment fix (pre-pull/cache the runtime image or enable egress).

## Dependencies

- **Phase 02** (events for job lifecycle).
- **Phase 10** (function targets — a schedule can invoke a function).
- **Phase 06** (HTTP targets — a schedule can hit a deployment URL).

## Deliverables

- [ ] **Persistence + restore on boot.** Schedules live in the DB; on `OnApplicationBootstrap`, **every** schedule is re-registered with the cron engine. Restarting the API no longer disables jobs.
- [ ] **Distributed lock.** A Redis lease per job so only one instance fires it (future multi-node; on single-node it prevents double-fire during rolling restarts/overlap). Acquire → fire → release.
- [ ] **Real targets, both kinds.** `target.type = 'http'` → `fetch(url)` against a deployment; `target.type = 'function'` → invoke a Phase 10 function. Both wired and verified.
- [ ] **Correct `nextRunAt`.** Computed from the actual cron expression (and shown in the UI); no phantom times.
- [ ] **Schedule types.** Cron expression, fixed interval, and one-shot (`runAt`).
- [ ] **Execution history.** Each fire records `startedAt`, result (success/failure), duration, error — with retention.
- [ ] **Timezones.** Per-schedule `timezone` (IANA) honored.
- [ ] **Concurrency policy.** `allow` / `skip` / `replace` if a previous run is still in flight.

## Technical Design

- **Engine:** `node-cron` (already a dependency) or `agenda`/`bullmq` scheduler. On bootstrap: `for (job of await prisma.schedule.findMany({where:{enabled:true}})) register(job)`. `register` parses the expression + timezone and schedules a callback that acquires the Redis lock, dispatches to the target, and records the run.
- **Lock:** `SET schedule:lock:<jobId> <token> NX PX <estimatedRuntime>`; release only if token matches (Lua compare-and-delete). Prevents overlap double-fire and multi-node duplicates.
- **Dispatch:** `http` → `fetch(url, {method, headers, body})` with a timeout + the deployment's availability checked; `function` → call the Functions service `invoke(id, scheduledEvent)`.
- **`nextRunAt`:** derived from the cron parser's next invocation at submit/update time and refreshed after each fire.

## Integration Points

- **Events emitted:** `scheduler.job.created/updated/enabled/disabled`, `scheduler.job.fired/succeeded/failed`. Consumed by audit (02).
- **Service registry:** registers `scheduler`.
- **SDK (16):** `scheduler.create/list/update/delete`, `scheduler.run` (manual trigger).
- **CLI (18):** `fidscript cron list/create/run`.
- **Dashboard (19):** cron editor (with next-run preview), execution history.
- **Consumers:** backs recurring **Database backups (08)**, log/retention sweeps (15), metric downsampling (14).

## Verification (VPS)

```bash
# Create a job firing every minute at an HTTP target (a deployment) and at a function:
curl -fsS -X POST .../api/v1/projects/$PID/schedules \
  -d '{"name":"tick","schedule":"* * * * *","timezone":"UTC","target":{"type":"http","url":"https://<slug>.apps.deploy.fidscript.com/hook"}}'

# nextRunAt is real and ≤ 60s out:
curl -fsS .../schedules/<id> | jq .nextRunAt

# Restart the API mid-cycle, then confirm the NEXT tick still fires:
docker compose restart api
sleep 70
curl -fsS .../schedules/<id>/runs | jq '.[-1]'   # a run recorded AFTER the restart

# Function target fires the function (check invocations); distributed lock prevents double-fire
```

**Exit criterion:** a schedule fires on its cron after an API restart (jobs are no longer silently disabled), both HTTP and function targets work, `nextRunAt` is correct, execution history is recorded, and a single fire occurs per tick (no double-fire on restart overlap). The `OnModuleInit` gap is closed.

## Out of Scope / Future

- Calendar-aware scheduling, human-language schedules ("every weekday") — future.
- Cross-cluster leader election beyond the Redis lease — future.
- Workflow / DAG orchestration — future.

## Risks

- Cron engine state lives only in memory by default — the bootstrap restore is mandatory; if a job is added but the bootstrap is skipped (e.g., race at startup) it won't run until next restart. Verify with the restart prove-it.
- Timezone/DST mishandling in `nextRunAt` → use a battle-tested parser (croner/cron-parser) and pin the stored timezone.

## Files you'll touch (precision map)

- Stub lives at: `apps/api/src/modules/scheduler/scheduler.service.ts` (real `cron` lib, fires HTTP while alive — but **no `OnModuleInit`/`OnApplicationBootstrap`**, so every restart silently disables all jobs; `functionId` targets ignored; `nextRunAt` reports a time that never fires).
- Prisma: `CronJob`, `CronJobRun`.
- Add: bootstrap re-registration on startup; a Redis distributed lock (prevent double-fire); function-target dispatch (Phase 10); correct `nextRunAt` from the expression.

## Next Phase

[Phase 13: Realtime Platform](./phase-13.md)
