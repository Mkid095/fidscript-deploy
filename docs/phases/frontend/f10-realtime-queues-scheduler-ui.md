# F10 — Realtime + Queues + Scheduler UI (full spec)

> **Status:** ⏳ Spec complete — pending approval.
> **Connects to:** backend `RT-*`, `QUEUE-*`, `CRON-*` inventories
> (`docs/phases/frontend/backend/compute.md`). Cross-references F05 (shell), F11 Logs (the
> queue/cron run logs flow into the Logs section). Renders the **`RealtimeChannel`** +
> **`RealtimeMessage`** + **`RealtimePresence`** + **`Queue`** + **`QueueMessage`** + **`CronJob`** +
> **`CronJobRun`** Prisma entities.

## 1. Purpose
The operator's console for the **async + realtime half** of the platform. Three sidebar items —
Realtime, Queues, Scheduler — share enough conceptual ground (background workers, live
activity, durability, retries) that they live in one spec. The principle: **async work is
first-class; the user can see it, manage it, and intervene.**

## 2. Business Goal
Match the realtime + queues consoles of Ably + Cloudflare Workers + Cron-job.org: channels
that broadcast, queues that buffer, crons that trigger. The principle: **the user should
never wonder "did my message land? is the job running? is anyone listening?" — the UI tells
them.**

## 3. Personas
- **Backend dev** — broadcasts realtime events to the dashboard; publishes queue messages;
  schedules cron jobs. The most common power user of these three sections.
- **Solo dev** — uses queues for webhooks, crons for nightly cleanup, realtime for chat.
- **On-call** — opens the queues tab to inspect a stuck message, opens a cron job to see the
  last run, opens a channel to see who's connected.

## 4. Complete User Journey

### Realtime
```
Open /dashboard/projects/:id/realtime (F05) → Channels tab.
  → list of channels: name, isPrivate badge, presence count, last message (relative), kebab.
  → empty state: "No channels yet — create one to broadcast events to connected clients."
    CTA "Create channel".
  → "Create channel" modal: name, isPrivate toggle, metadata (JSON, optional).
    → if isPrivate: POST RT-01 returns a one-time access token in a toast.
  → click a channel → /realtime/channels/:c:
      tabs: Messages · Presence · Test publish.
      default: Messages.
  → Messages tab: live tail of RealtimeMessage (last 100, paginated). Each row: timestamp,
    userId, event, content (truncated; click to expand). "Live tail" auto-scrolls;
    pauseable.
  → Presence tab: RealtimePresence list. Each row: userId, status (online/away/busy/offline),
    updatedAt. "Set my status" inline toggle for the current user.
  → Test publish: form with event + content + userId; "Publish" → POST RT-06 (uses the
    socket gateway for the actual publish); row appears in Messages.
  → realtime: realtime.channel_created → card animates in; realtime.channel_deleted → card
    removes.
```

### Queues
```
Open /dashboard/projects/:id/queues (F05) → Queues tab.
  → list of queues: name, type pill, status badge, depth (from QUEUE-06), pending, failed,
    deadLettered, kebab.
  → empty state: "No queues yet — durable background work, with retries and DLQ." CTA
    "Create queue".
  → "Create queue" modal: name, type (stream | queue | workqueue), retentionDays, maxMessages,
    maxBytes, replicas, retryAttempts, retryDelaySeconds, deadLetterQueue (optional).
    → "Create" → POST QUEUE-01; server-side worker auto-starts (no UI action needed).
  → click a queue → /queues/:q:
      tabs: Messages · Stats · Config.
      default: Messages.
  → Messages tab: live tail of QueueMessage by status (pending | delivered | acknowledged |
    failed | deadLettered). Filter by status; cursor pagination.
    Per-row: id, status badge, body (truncated; click to expand), attempts, scheduledAt,
    deliveredAt, acknowledgedAt, errorMessage, kebab (Ack · Retry · Dead-letter).
  → Stats tab: depth (live), pending, delivered, acknowledged, failed, deadLettered, total
    (from QUEUE-06). Sparklines for depth + failed.
  → Config tab: editable fields (retentionDays, maxMessages, maxBytes, retries, DLQ).
    PATCH QUEUE-04. "Delete queue" (Danger Zone; type-to-confirm) → DELETE QUEUE-05.
  → "Publish test message" inline (top of Messages tab): body (textarea), delaySeconds (slider
    0-300), "Publish" → POST QUEUE-07 → row appears in pending.
  → realtime: queues.message.published → row animates in; queues.message.acknowledged →
    status updates; queues.message.dead_lettered → row moves to deadLettered filter.
```

### Scheduler
```
Open /dashboard/projects/:id/scheduler (F05) → Jobs tab.
  → list of cron jobs: name, cron expression (human-readable), lastRunAt, nextRunAt, status,
    kebab.
  → empty state: "No cron jobs yet — schedule anything that runs on a timer." CTA "Create job".
  → "Create job" modal: name, cron expression (with a human hint "every 5 minutes" /
    "every day at 9am"), timezone (select), target (radio: function picker | endpoint URL),
    payload (JSON, optional), retries, timeoutSeconds, enabled toggle.
    → "Create" → POST CRON-01 → card animates in.
  → click a job → /scheduler/jobs/:j:
      tabs: Config · Runs · Next run.
      default: Config.
  → Config tab: editable fields; "Trigger now" button (POST CRON-06) → optimistic "Running…"
    badge; cron.job_run_started + cron.job_run_completed/failed via realtime.
  → Runs tab: history of CronJobRun (from CRON-08). Each row: id, status, startedAt,
    completedAt, durationMs, errorMessage. Click a row → modal with full output.
  → Next run tab: shows nextRunAt + a live countdown; "Skip next run" button (PATCH
    CRON-04 with skip flag, or POST a new endpoint; for now: triggers a manual run with
    a "skip" payload).
  → realtime: cron.job_created → card animates in; cron.job_run_started → status updates;
    cron.job_run_completed/failed → row in Runs tab updates.
```

## 5. Information Architecture

### Realtime
- `/dashboard/projects/:id/realtime` — channels list. Tabs: Channels (default).
- `/dashboard/projects/:id/realtime/channels/new` — create-channel modal (overlay).
- `/dashboard/projects/:id/realtime/channels/:c` — channel detail. Tabs: Messages / Presence /
  Test publish.

### Queues
- `/dashboard/projects/:id/queues` — queues list. Tabs: Queues (default).
- `/dashboard/projects/:id/queues/new` — create-queue modal (overlay).
- `/dashboard/projects/:id/queues/:q` — queue detail. Tabs: Messages / Stats / Config.

### Scheduler
- `/dashboard/projects/:id/scheduler` — jobs list. Tabs: Jobs (default).
- `/dashboard/projects/:id/scheduler/new` — create-job modal (overlay).
- `/dashboard/projects/:id/scheduler/jobs/:j` — job detail. Tabs: Config / Runs / Next run.

## 6. Screen Specifications

### Realtime
- **`/dashboard/projects/:id/realtime`** — channels list.
  - **Per-channel card**: name, isPrivate badge (Public/Private), presence count (from
    `RT-07` summary), last message (relative time from `RT-05`), kebab menu.
  - **Empty state**: "No channels yet — create one to broadcast events to connected clients."
    + CTA "Create channel" + hint "Tip: realtime is for ephemeral events — for durable
    messages, use Queues."
  - **Tabs**: Channels (default).
- **Create channel modal** — focused modal. Fields: name (required, unique per project),
  isPrivate (toggle, default false), metadata (JSON, optional). "Create" → POST RT-01.
  - If `isPrivate=true`: the response includes a one-time `accessToken`; the toast shows the
    token with a "Copy" button (the token is shown **once**, like a project API key).
- **`/dashboard/projects/:id/realtime/channels/:c`** — channel detail.
  - **Header strip**: channel name, isPrivate badge, presence count (live), "Connected" status
    (the dashboard's own socket connection state).
  - **Tabs**: Messages / Presence / Test publish.
  - **Messages tab**: live tail of `RealtimeMessage` (last 100). Each row: timestamp (relative),
    userId, event (pill), content (truncated; click to expand into a code block). **Live tail**
    auto-scrolls to the bottom; pauseable. "Jump to latest" button when scrolled away. Cursor
    pagination for "load more."
  - **Presence tab**: list of `RealtimePresence`. Each row: userId, status badge
    (online/away/busy/offline — color-coded), updatedAt. **"Set my status"** inline toggle for
    the current user; the current user's row is highlighted.
  - **Test publish tab**: form with `event` (text), `content` (textarea), `userId` (text,
    default "test"); "Publish" → uses the socket gateway (RT-06-equivalent) → row appears in
    Messages. Useful for verifying the channel works without writing a client.

### Queues
- **`/dashboard/projects/:id/queues`** — queues list.
  - **Per-queue card**: name, type pill, status badge, depth (from QUEUE-06), pending, failed,
    deadLettered (small numbers with color thresholds: failed >0 = red, deadLettered >0 =
    purple), kebab.
  - **Empty state**: "No queues yet — durable background work, with retries and DLQ." + CTA
    "Create queue" + hint "Tip: queues are for work that should NOT block the user — async
    email, image processing, webhooks."
  - **Tabs**: Queues (default).
- **Create queue modal** — focused modal. Fields: name, type (stream | queue | workqueue,
  default stream), retentionDays (slider 1-30, default 7), maxMessages, maxBytes, replicas,
  retryAttempts (slider 1-10, default 3), retryDelaySeconds, deadLetterQueue (optional,
  references another queue in the same project).
- **`/dashboard/projects/:id/queues/:q`** — queue detail.
  - **Header strip**: queue name, type pill, status badge, depth (live), pending, failed,
    deadLettered, "Publish test message" inline button.
  - **Tabs**: Messages / Stats / Config.
  - **Messages tab**:
    - **Filter**: by status (pending | delivered | acknowledged | failed | deadLettered).
      Default: pending + delivered (in-flight).
    - **List** of `QueueMessage` rows. Each: id, status badge, body (truncated; click to
      expand), attempts, scheduledAt, deliveredAt, acknowledgedAt, errorMessage, kebab.
    - **Kebab actions**: Ack (QUEUE-10), Retry (QUEUE-11), Dead-letter (QUEUE-12).
    - **Live tail** auto-scrolls; pauseable.
  - **Stats tab**: 7 stat cards (jsDepth, pending, delivered, acknowledged, failed,
    deadLettered, total) + sparklines for depth + failed.
  - **Config tab**: editable fields (retentionDays, maxMessages, maxBytes, retryAttempts,
    retryDelaySeconds, deadLetterQueue). "Delete queue" in Danger Zone (type-to-confirm
    with queue name).

### Scheduler
- **`/dashboard/projects/:id/scheduler`** — jobs list.
  - **Per-job card**: name, cron expression (human + raw), lastRunAt (relative), nextRunAt
    (relative), status badge (enabled | disabled), kebab.
  - **Empty state**: "No cron jobs yet — schedule anything that runs on a timer." + CTA
    "Create job" + hint "Tip: most teams start with a nightly cleanup + a 5-minute health
    check."
  - **Tabs**: Jobs (default).
- **Create job modal** — focused modal. Fields:
  - name (required)
  - cron expression (with a human hint that shows "every 5 minutes" or "every day at 9am"
    as the user types)
  - timezone (select, default UTC)
  - target (radio: function picker | endpoint URL). If function: dropdown of the project's
    `Function` rows. If endpoint: URL field (https:// enforced).
  - payload (JSON, optional)
  - retryAttempts, retryDelaySeconds, timeoutSeconds
  - enabled (toggle, default true)
- **`/dashboard/projects/:id/scheduler/jobs/:j`** — job detail.
  - **Header strip**: job name, cron expression (human), lastRunAt, nextRunAt (live
    countdown), status, "Trigger now" button.
  - **Tabs**: Config / Runs / Next run.
  - **Config tab**: editable fields. "Trigger now" button → POST CRON-06 with optional
    payload override → optimistic "Running…" badge. "Delete job" in Danger Zone
    (type-to-confirm).
  - **Runs tab**: history of `CronJobRun` (from CRON-08). Filter by status. Each row: id,
    status badge, startedAt, completedAt, durationMs, errorMessage. Click a row → modal
    with full request payload + response output.
  - **Next run tab**: shows nextRunAt with a live countdown (HH:MM:SS); the next 5 runs
    derived from the cron expression; "Skip next run" button — **this endpoint does not
    exist yet** (see `docs/backend-prerequisites.md` → `SCHED-1`). For now the button is
    greyed with tooltip "coming soon"; it does not perform a placeholder action. When
    `SCHED-1` lands it becomes `POST /cron/:jobId/skip-next` (inventory ID assigned at
    build time, recorded in `docs/backend-prerequisites.md`).

## 7. Component Specifications
- `<DataTable>` ✅ — messages list, runs list, presence list.
- `<EntityCard>` ✅ — channels/queues/jobs cards.
- `<HealthBadge>` ✅ — status badges.
- `<CronExpressionInput>` ✅ (_todo) — the cron input with human hint; reusable.
- `<FunctionPicker>` ✅ (_todo) — the target function dropdown.
- `<KeyValueTable>`, `<CodeBlock>`, `<Modal>`, `<ConfirmDialog>`, `<Toast>`, `<EmptyState>`,
  `<Skeleton>`, `<ErrorState>`, `<Button>`, `<Toggle>`, `<Select>`, `<Slider>`.
- `<LiveTail>` ✅ (_todo) — the auto-scroll + pause + jump-to-latest component; shared across
  Realtime messages, Queue messages, Function logs, Deployment logs, Log stream viewer.
- `<Sparkline>`, `<TimeSeriesChart>`, `<NewChannelModal>`, `<NewQueueModal>`, `<NewCronJobModal>`,
  `<TestPublishForm>`, `<CronCountdown>` — spec'd here.

## 8. API Mapping

### Realtime
| Screen/Action | Endpoint | Inventory ID | Notes |
|---|---|---|---|
| List channels | `GET /api/v1/projects/:id/realtime/channels` | `RT-02` | first paint |
| Create channel | `POST /api/v1/projects/:id/realtime/channels` | `RT-01` | one-time token if isPrivate |
| Get channel | `GET /api/v1/realtime/channels/:channelId` | `RT-03` | detail page |
| Delete channel | `DELETE /api/v1/realtime/channels/:channelId` | `RT-04` | confirm |
| Get messages | `GET /api/v1/realtime/channels/:channelId/messages` | `RT-05` | cursor pagination |
| Update presence | `POST /api/v1/realtime/presence` | `RT-06` | per-user |
| Get presence | `GET /api/v1/realtime/channels/:channelId/presence` | `RT-07` | presence tab |
| Issue access token | `POST /api/v1/realtime/channels/:channelId/token` | `RT-08` | one-time |

### Queues
| Screen/Action | Endpoint | Inventory ID | Notes |
|---|---|---|---|
| List queues | `GET /api/v1/projects/:id/queues` | `QUEUE-02` | first paint |
| Create queue | `POST /api/v1/projects/:id/queues` | `QUEUE-01` | modal submit |
| Get queue | `GET /api/v1/queues/:queueId` | `QUEUE-03` | detail page |
| Update queue | `PATCH /api/v1/queues/:queueId` | `QUEUE-04` | Config tab |
| Delete queue | `DELETE /api/v1/queues/:queueId` | `QUEUE-05` | Danger Zone |
| Stats | `GET /api/v1/queues/:queueId/stats` | `QUEUE-06` | Stats tab |
| Publish | `POST /api/v1/queues/:queueId/messages` | `QUEUE-07` | test publish |
| Batch publish | `POST /api/v1/queues/:queueId/messages/batch` | `QUEUE-08` | for future bulk UI |
| Consume | `POST /api/v1/queues/:queueId/consume` | `QUEUE-09` | server-driven; no UI |
| Ack | `POST /api/v1/queues/:queueId/ack` | `QUEUE-10` | per-row kebab |
| Retry | `POST /api/v1/queues/:queueId/retry` | `QUEUE-11` | per-row kebab |
| Dead-letter | `POST /api/v1/queues/:queueId/dead-letter` | `QUEUE-12` | per-row kebab |
| List messages | `GET /api/v1/queues/:queueId/messages` | `QUEUE-13` | Messages tab |

### Scheduler
| Screen/Action | Endpoint | Inventory ID | Notes |
|---|---|---|---|
| List jobs | `GET /api/v1/projects/:id/cron` | `CRON-02` | first paint |
| Create job | `POST /api/v1/projects/:id/cron` | `CRON-01` | modal submit |
| Get job | `GET /api/v1/cron/:jobId` | `CRON-03` | detail page |
| Update job | `PATCH /api/v1/cron/:jobId` | `CRON-04` | Config tab |
| Delete job | `DELETE /api/v1/cron/:jobId` | `CRON-05` | Danger Zone |
| Trigger now | `POST /api/v1/cron/:jobId/trigger` | `CRON-06` | Config tab |
| Next run | `GET /api/v1/cron/:jobId/next-run` | `CRON-07` | Next run tab |
| Run history | `GET /api/v1/cron/:jobId/runs` | `CRON-08` | Runs tab |

## 9. Backend Integration Map
```
Realtime channels → sdk.realtime.channels.list(projectId)
  → WS subscribe to project:<id> events
    → realtime.channel_created/deleted → list updates
  → channel detail subscribes to channel:<id> events for live tail
  → presence tab polls RT-07 every 10s (presence changes are not a high-rate event)

Queues list → sdk.queues.list(projectId)
  → WS subscribe to project:<id> events
    → queues.created/deleted → list updates
  → queue detail subscribes to queue:<id> events
    → queues.message.published → row appears
    → queues.message.acknowledged/retried/dead_lettered → status updates
  → stats tab polls QUEUE-06 every 10s for live depth

Scheduler list → sdk.cron.list(projectId)
  → WS subscribe to project:<id> events
    → cron.job_created/updated/deleted → list updates
  → job detail subscribes to job:<id> events
    → cron.job_run_started/completed/failed → status + Runs tab updates
```

## 10. User Experience Specification
- **Realtime**: live tail is the home of the channel detail. Pause is one click; "Jump to
  latest" appears when scrolled away. The presence tab is the "who's here" view — the user
  opens it to verify a connection.
- **Queues**: the Messages tab is the home; the filter by status is the primary navigation
  (pending is the most common filter). Ack/Retry/DLQ are per-row actions — the user
  intervenes on stuck messages without leaving the list.
- **Scheduler**: the live countdown on Next run is the home — the user opens a job to see
  when it runs next. "Trigger now" is the most common action; the optimistic badge shows
  "Running…" until the realtime event confirms.
- **Greying unimplemented pieces** is the honest path. (Today: nothing greyed; all three
  sections are fully implemented per the audit.)
- **Realtime is ambient.** Every list updates without page reload; the user sees teammates'
  publishes appear in the same browser.
- **The "Skip next run" is a placeholder** — the UI shows the button but the canonical skip
  endpoint is a P1 follow-up; the button currently triggers a manual run with a placeholder
  payload. The button is **not** greyed (the action is a no-op-valid trigger), but the spec
  flags the gap.

## 11. Design Philosophy
- **Configure once.** The user does not configure the realtime gateway or the NATS cluster;
  the platform provides them. The user configures the channel/queue/cron, not the runtime.
- **Beginner first.** The empty state for each is the create button + a one-sentence
  orientation ("Tip: realtime is for ephemeral events — for durable messages, use Queues.").
  The user knows which to pick without reading docs.
- **Production-ready by default.** Retries with exponential backoff, DLQ for failed messages,
  timezone-aware cron expressions, presence tracking — all on by default.
- **Everything observable.** Live tail for messages, sparklines for queue depth, countdowns
  for cron next runs — the user can always answer "is my async work progressing?".
- **One dashboard.** Realtime + Queues + Scheduler live next to each other in the sidebar;
  the user can jump between them in one click. The shared LiveTail component makes the three
  feel like one tool.

## 12. Configuration Philosophy
- **Realtime**: user-tunable at create — name, isPrivate, metadata. User-tunable after — none
  (the channel is immutable; if you need different settings, create a new channel).
- **Queues**: user-tunable at create — name, type, retention, maxMessages, maxBytes,
  replicas, retries, DLQ. User-tunable after — retention, maxMessages, maxBytes, retries, DLQ
  (Config tab).
- **Scheduler**: user-tunable at create — name, cron, timezone, target, payload, retries,
  timeout, enabled. User-tunable after — same set (Config tab).
- **User does not touch**: the runtime workers, the NATS cluster internals, the cron
  scheduler internals.

## 13. Automation Rules
- **Channel one-time token** — the `accessToken` is shown once in the toast; the server does
  not re-display it.
- **Queue worker auto-start** — `QUEUE-01` triggers a background worker; the user sees the
  queue become "active" via the realtime event.
- **Cron live countdown** — ticks every second; the "Next run" tab updates the countdown
  without polling the server.
- **Live tail behavior** — auto-scrolls unless the user is reading history; "Jump to latest"
  appears when scrolled away; the "Pause" button stops the WS subscription for the
  active tab.
- **Filter persistence** — the active status filter on the Queues Messages tab is persisted
  per-queue in `localStorage`.
- **Greying rule** — for now, nothing is greyed (all three are fully implemented). When
  a feature is added that has a gap, it joins the `SUPPORTED_*` constants pattern.

## 14. Endpoint Documentation
Full `RT-*`, `QUEUE-*`, `CRON-*` inventories in `docs/phases/frontend/backend/compute.md`.
Notable specifics for F10:

- **`RT-01` returns `accessToken` once** if `isPrivate=true`. The UI shows it in a toast
  with "Copy" and then never again.
- **`QUEUE-01` triggers a server-side worker** — the queue becomes active via
  `queues.created`; the user doesn't need to start it.
- **`QUEUE-07` accepts `delaySeconds`** — for scheduled messages (e.g. "send this in 5
  minutes"). The UI exposes this as a slider in the test-publish form.
- **`CRON-01` `cronExpression` is validated server-side**; invalid expressions return 400
  with a structured error. The UI validates locally first to surface the error inline
  before the request.
- **`CRON-07` `next-run` is computed** by the backend (the next 5 runs are derivable
  client-side from the cron expression; the endpoint is for the server's authoritative
  answer).

Backend gaps the UI must work around:
- The **`CRON` "skip next run"** endpoint does not exist yet (`docs/backend-prerequisites.md`
  → `SCHED-1`). The UI button is greyed with "coming soon"; it does not perform a
  placeholder action. When `SCHED-1` lands it becomes `POST /cron/:id/skip-next`.
- **`QUEUE-06` does not currently emit realtime events for stats changes** — the UI polls
  every 10s. (Future: `queue.<id>.stats_updated` event; the UI is built to consume it.)

## 15. Feature Dependency Graph
- **Hard**: F00, F02, F05.
- **Hard backend**: `RT-01..08`, `QUEUE-01..13`, `CRON-01..08`, the realtime event families,
  the NATS cluster, the cron scheduler.
- **Gated by F10**: nothing.
- **Backend gaps that affect this screen**:
  - `CRON` "skip next run" is a P1 follow-up; the button is present but uses a placeholder
    action today.
  - `QUEUE-06` does not push realtime; the UI polls every 10s.

## 16. Acceptance Criteria
1. `/dashboard/projects/:id/realtime` opens with the **Channels** tab preselected; the
   empty state is "No channels yet — create one to broadcast events to connected clients."
2. The create-channel modal accepts name, isPrivate, metadata; if isPrivate, the toast
   shows the one-time `accessToken` with a "Copy" button.
3. Channel detail's Messages tab is a live tail of `RealtimeMessage` (last 100, paginated);
   pauseable; "Jump to latest" appears when scrolled away.
4. Presence tab shows `RealtimePresence` rows; the current user can set their own status
   inline; their row is highlighted.
5. Test publish form posts a message; the row appears in Messages.
6. `/dashboard/projects/:id/queues` opens with the **Queues** tab preselected; the empty
   state is "No queues yet — durable background work, with retries and DLQ."
7. The create-queue modal submits POST `QUEUE-01`; the server starts the worker; the card
   becomes "active" via the realtime event.
8. Queue detail's Messages tab is filterable by status; per-row kebab has Ack / Retry /
   Dead-letter; each opens a confirm dialog and POSTs the corresponding endpoint.
9. Queue Stats tab shows 7 stat cards + sparklines for depth and failed.
10. Queue Config tab is editable; "Delete queue" in Danger Zone (type-to-confirm).
11. Test publish form publishes a message; the row appears in pending.
12. `/dashboard/projects/:id/scheduler` opens with the **Jobs** tab preselected; the empty
    state is "No cron jobs yet — schedule anything that runs on a timer."
13. The create-job modal validates the cron expression locally; "Create" POSTs `CRON-01`.
14. Job detail's Config tab has "Trigger now" (optimistic "Running…" badge); Runs tab
    shows history with status, duration, errorMessage; Next run tab has a live countdown
    + the next 5 derived runs.
15. Realtime updates: channel/queue/job list updates on create/delete without page reload;
    message/run status updates stream in via WS.
16. `pnpm --filter @fidscript/dashboard build` clean; this spec updated to match shipped
    behavior.

## Change log
- 2026-06-20 — Initial full 16-section spec. Documents 2 backend gaps: (1) `CRON` "skip next
  run" does not exist yet (`SCHED-1` in `docs/backend-prerequisites.md`); button is greyed; (2) `QUEUE-06`
  does not push realtime (UI polls every 10s).
