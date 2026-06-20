# Service: Scheduler (cron)

Time-triggered jobs — call an HTTP URL or invoke a function, on a cron schedule, with retries and
Redis-locked execution so a job never fires twice.

## 1. Purpose
"Every hour, do X" / nightly cleanup / periodic token refresh / scheduled exports. The platform
guarantees the schedule survives a restart and that a job doesn't double-fire across instances.

## 2. Screens
- **Scheduler** (sidebar §8): job list with last-run + next-run + status.
- **Job detail**: tabs *Config / Runs / Next run*.

## 3. Data model
- `CronJob` — id, projectId, name, cronExpression (validated via `new cron.CronTime(expr)`),
  timezone, target (`function|http`), endpoint (URL) or functionId, payload, enabled,
  retryAttempts, retryDelaySeconds, timeoutSeconds, lastRunAt, nextRunAt, status.
- `CronJobRun` — id, jobId, status (`running|completed|failed`), errorMessage, startedAt,
  completedAt, durationMs.

## 4. API mapping
- CRUD: `CRON-01..05`. Manual trigger: `CRON-06`. Compute next run: `CRON-07`. List runs:
  `CRON-08`.

## 5. Realtime events
`cron.{job_created,job_updated,job_deleted,job_run_started,job_run_completed,job_run_failed}` —
the Runs tab subscribes so a manual trigger's progress streams in.

## 6. Settings
- **Create:** name, cron expression (with a human hint: "every 5 min → `*/5 * * * *`"), timezone
  (default UTC), target (function picker **or** endpoint URL), payload (JSON), enabled,
  retryAttempts (default 3), retryDelaySeconds (default 60), timeoutSeconds (default 300).

## 7. Automation
- **Re-registration on boot** — `onApplicationBootstrap` reloads every enabled job (audit confirms
  schedules don't depend on in-memory state).
- **Redis distributed lock** — `schedule:lock:<jobId>` via SETNX (5-min TTL). If a peer API
  instance holds the lock, the run is skipped (no double-fire).
- **Retry** — up to `retryAttempts` with `retryDelaySeconds` between attempts.

## 8. Dependencies
- **Hard:** Redis (lock), `node-cron` (parsing/scheduling). Functions (`function` target) or an
  HTTP-reachable endpoint (`http` target).
- **Backend gaps** (from the audit):
  - `target` choice (`function` vs `http`) is **not** mutable post-create (no field in the
    update DTO). UI should make this explicit when creating.
  - The Scheduler shares the realtime event-name family `cron.*` — consistent.

## 9. Phase
**F10 (Realtime/Queues/Scheduler UI)** — pending spec.
