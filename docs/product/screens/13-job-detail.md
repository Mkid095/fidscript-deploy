# Screen Spec — `CronJobDetail`

> Per-job detail at `/dashboard/projects/:id/scheduler/jobs/:j` (F10). The operator's
> console for one cron job: config, runs, next run.

## 1. Purpose
The user inspects a scheduled job — sees its config, watches its runs, and triggers a
manual run. The principle: **a cron is a recurring thing; the UI shows the past, present,
and next three states at a glance.**

## 2. Route + access
- **Route:** `/dashboard/projects/:id/scheduler/jobs/:j`.
- **Permission:** any member (`O/A/D/V`); viewer greys Trigger / Edit / Delete.
- **Project scope:** the job belongs to the current project.

## 3. Layout
```
┌──────────────────────────────────────────────────────────────────────┐
│ Project › my-app › Scheduler › nightly-cleanup                       │
├──────────────────────────────────────────────────────────────────────┤
│ nightly-cleanup  [● enabled]  0 2 * * *  next run: 4h 32m 17s        │
│ Last run: 12h ago (succeeded)                                        │
│ [Trigger now]  [Skip next run]                                       │
├──────────────────────────────────────────────────────────────────────┤
│ [Config] [Runs] [Next run]                                           │
├──────────────────────────────────────────────────────────────────────┤
│ Name:        nightly-cleanup                                         │
│ Cron:        0 2 * * *   (Runs every day at 02:00 UTC)               │
│ Timezone:    UTC                                                     │
│ Target:      Function: webhook-receiver                              │
│ Payload:     { "action": "cleanup" }                                 │
│ Retries:     3   Timeout: 300s                                       │
│ Enabled:     ●                                                       │
│                                                                      │
│ [Edit]                                                               │
├──────────────────────────────────────────────────────────────────────┤
│ ▶ Danger Zone                                                        │
│   Delete this job                                                    │
└──────────────────────────────────────────────────────────────────────┘
```

## 4. Sections + states
- **Header strip**: job name, enabled badge, cron (human + raw), next run (live countdown),
  last run (relative + status), Trigger / Skip next run buttons.
- **Tabs**:
  - **Config** (default): editable fields; Save (PATCH CRON-04); Danger Zone (Delete).
  - **Runs**: history of `CronJobRun` (from CRON-08).
  - **Next run**: shows nextRunAt with live countdown; the next 5 derived runs.
- **Per-tab states**:
  - **Config**:
    - *Idle*: editable form.
    - *Saving*: spinner.
    - *Saved*: success toast.
  - **Runs**:
    - *Empty*: "No runs yet — the first run will happen at the next scheduled time."
    - *Live*: rows appear as `cron.job_run_started` + `cron.job_run_completed/failed`
      arrive.
    - *Click row*: modal with full request payload + response output.
  - **Next run**:
    - *Live*: countdown ticks every second; the next 5 derived runs.
    - *Skip next run*: button greyed with "coming soon" — endpoint does not exist yet
      (`docs/backend-prerequisites.md` → `SCHED-1`).

## 5. Primary + secondary actions
- **Primary (top-right)**: "Trigger now" (POST CRON-06).
- **Secondary**:
  - "Skip next run" (top-right; P1 follow-up).
  - "Edit" (Config tab).
  - "Delete" (Danger Zone; type-to-confirm with job name).

## 6. API mapping
- **Get job** — `GET /api/v1/cron/:jobId` (`CRON-03`).
- **Update** — `PATCH /api/v1/cron/:jobId` (`CRON-04`).
- **Trigger** — `POST /api/v1/cron/:jobId/trigger` (`CRON-06`) with optional `{payload}`.
- **Next run** — `GET /api/v1/cron/:jobId/next-run` (`CRON-07`).
- **Run history** — `GET /api/v1/cron/:jobId/runs` (`CRON-08`).
- **Delete** — `DELETE /api/v1/cron/:jobId` (`CRON-05`).
- **Realtime** — `cron.job_run_started`, `cron.job_run_completed`, `cron.job_run_failed`.

## 7. Forms + validation
- **Config**: per F10 §6 (same fields as the create modal).
- **Skip next run**: P1 follow-up; the button is present but uses a placeholder action
  today (a manual run with `{"_skip": true}` payload). The button is documented but not
  functional.
- **Delete**: type-to-confirm with the job name.

## 8. Accessibility
- **Focus order**: header → tabs → tab content → actions.
- **Live countdown**: `aria-live="polite"`; the next-run time is announced every minute.
- **ARIA**: `role="dialog"` on the run-detail modal; `role="alert"` on the "Skip next
  run is a P1 follow-up" tooltip.

## 9. Cross-references
- **Phase**: F10 Scheduler UI §6.
- **Service spec**: `docs/product/services/scheduler.md`.
- **Journey**: backend dev's "is the cron running?" flow.
- **Navigation**: Scheduler list → click a job.
- **Related screens**: New cron job modal (sibling), Logs (filtered to job:<id>).

## 10. Acceptance criteria
1. The detail page opens at `/dashboard/projects/:id/scheduler/jobs/:j`; the **Config**
   tab is preselected.
2. The header shows the cron (human + raw), next run (live countdown), last run (relative
   + status).
3. "Trigger now" POSTs `CRON-06`; the optimistic "Running…" badge updates via
   `cron.job_run_started/completed/failed` events.
4. The Runs tab shows the history with status, duration, errorMessage; click a row →
   modal with full payload + response.
5. The Next run tab shows the countdown + the next 5 derived runs.
6. "Skip next run" is greyed with "coming soon" — endpoint does not exist yet (`SCHED-1`).
7. The Config tab is editable; "Delete" in Danger Zone has type-to-confirm.
8. Realtime updates: runs appear in the Runs tab via WS events.
