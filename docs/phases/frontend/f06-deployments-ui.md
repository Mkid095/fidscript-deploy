# F06 — Deployments UI (full spec)

> **Status:** ⏳ Spec complete — pending approval.
> **Connects to:** backend `DEPL-*` inventory (`docs/phases/frontend/backend/projects-deployments-domains.md`).
> Cross-references F05 (the shell that wraps this screen) and the `deployments.*` event family.
> Renders the **`Deployment`** + **`Release`** + **`BuildConfig`** Prisma entities.

## 1. Purpose
The operator's console for the deployment state machine. The user sees the live state of every
deployment for the project, can create a new deployment, watch it build, inspect logs, stop,
restart, and roll back. This is the **most-used screen in the dashboard** — the one the user
opens every morning.

## 2. Business Goal
Match the deployment console of Vercel + Railway: every deployment is one row in a list, with
its state-machine status front and center, a live URL the moment it succeeds, and a one-click
rollback. The principle: **the user should never wonder "is it deploying?"** — the UI tells them.

## 3. Personas
- **Solo dev** — clicks "Deploy" 10× a day, watches the spinner, opens logs on failure, rolls back.
- **Team lead** — watches the deployments list for the team's output; rolls back a bad release.
- **On-call** — gets paged → opens the most recent failing deployment → reads logs → either
  fixes the code (redeploy) or rolls back.

## 4. Complete User Journey
```
Open /dashboard/projects/:id (F05) → defaults to Deployments.
  → Active tab: list of in-flight deployments (BUILDING, DEPLOYING, PENDING) + the most recent SUCCESS.
  → All tab: full history.
  → Logs tab: a unified log stream for the project (links to F11 Logs).
  → Build Config tab: opens settings?tab=build-config.
  → empty state: "No deployments yet — paste a git URL to deploy." inline paste box → submit.
  → "New deployment" button → modal:
      source = git (url + branch + optional dockerfilePath) or archive (zip upload)
      branch auto-filled from project.sourceBranch
      commitSha optional
      strategy override? (Advanced disclosure)
      envVars preview (informational; writes happen via F11 Settings)
    → "Deploy" → POST DEPL-02 → modal closes, card animates in at top of list.
  → click a deployment card → /deployments/:id (detail):
      state-machine timeline (PENDING → QUEUED → BUILDING → DEPLOYING → SUCCESS/FAILED/STOPPED)
      imageTag, sourceUrl, commitSha, buildLogs (collapsible, terminal-styled)
      live URL (Copy · Open)
      actions: Stop (DEPL-05) · Restart (DEPL-06) · Rollback (DEPL-08 — lists prior SUCCESS) · Delete (DEPL-07)
  → click "Logs" on a deployment → /deployments/:id/logs (DEPL-04, streaming)
  → realtime: the card state animates as the state-machine progresses
    (PENDING gray → QUEUED blue → BUILDING yellow-spinner → DEPLOYING yellow-spinner → SUCCESS green or FAILED red)
```

## 5. Information Architecture
- `/dashboard/projects/:id/deployments` — the deployments section root. Default tab: **Active**.
  Tabs: Active / All / Build Config.
- `/dashboard/projects/:id/deployments/:id` — the deployment detail.
- `/dashboard/projects/:id/deployments/:id/logs` — the build/runtime logs viewer.
- `/dashboard/projects/:id/deployments/new` — the new-deployment modal (overlay).
- The `Build Config` tab is a thin redirect to Settings → Build Config
  (`/dashboard/projects/:id/settings?tab=build-config`); the inline editor here is a
  shortcut, the canonical editor lives in Settings.

## 6. Screen Specifications
- **`/dashboard/projects/:id/deployments`** — the list. Per-deployment card row (or table row):
  - **State badge** — color-coded by `DeploymentStatus`:
    PENDING gray · QUEUED blue · BUILDING yellow-spinner · DEPLOYING yellow-spinner ·
    SUCCESS green · FAILED red · STOPPED gray · BLOCKED orange · ROLLED_BACK purple.
  - **Image tag** — `fidscript/<slug>:<version>` from `Release.imageTag`.
  - **Branch + commit** — `branch` + short SHA from `Release.commitSha` (link to git).
  - **Started / duration** — `Deployment.createdAt` + `Deployment.completedAt - createdAt`.
  - **Live URL** — `Deployment.deploymentUrl` (Copy + Open), shown green when `status=SUCCESS`.
  - **Logs button** → `/deployments/:id/logs`.
  - **Kebab menu**: Stop · Restart · Rollback (lists prior SUCCESS) · Delete (ConfirmDialog).
  - **Empty state** (active tab, no deployments): "No deployments yet — paste a git URL to
    deploy" + inline paste box (the only screen that does the action inline; everywhere else
    uses a modal). "New deployment" button opens the modal for the full form.
  - **Empty state** (active tab, only SUCCESS deployments): "No active deployments — last
    successful deploy was 2h ago." with a "Redeploy" button.
  - **Tabs**: Active (default), All (paginated table), Build Config.
- **New deployment modal** — focused modal. Fields: source type (radio: git | archive).
  - **git**: URL (required), branch (default `main` from `project.sourceBranch`), credentials
    (private repos), dockerfilePath (optional, Advanced).
  - **archive**: file dropzone (zip/tar.gz, max 500MB), outputDirectory (optional).
  - **commitSha** (optional, Advanced) — pin to a specific commit.
  - **strategy** (optional, Advanced) — override the project's default build strategy.
  - **envVars preview** — informational: lists the project's env keys (no values) so the user
    knows what's available at build time.
  - **"What will build"** — a small live preview showing "Source: git@github.com/acme/app @ main
    → Dockerfile at ./Dockerfile → Build with: dockerfile → Image: fidscript/app:2026-...".
  - Primary CTA "Deploy" → POST DEPL-02.
- **`/dashboard/projects/:id/deployments/:id`** — the detail.
  - **Header strip** — image tag (mono), state badge, branch + commit, live URL, "Open" + "Copy".
  - **State-machine timeline** — `<StateMachineTimeline>` (reusable component). Renders the full
    state machine with the active step highlighted; failed steps turn red. Shows timestamps
    for each transition.
  - **Metadata panel** — `Release` fields: sourceUrl, commitSha, imageTag, buildDurationMs,
    createdBy, createdAt. Click `createdBy` → Profile (if a user) or "system" pill.
  - **Build logs** — collapsible panel, terminal-styled. "Show logs" reveals `Release.buildLogs`;
    collapsed by default for SUCCESS, expanded by default for FAILED. "Copy logs" button.
  - **Actions bar** (right-aligned, sticky):
    - **Stop** (`DEPL-05`) — visible when status ∈ {PENDING, QUEUED, BUILDING, DEPLOYING};
      ConfirmDialog "Stop this deployment? In-flight changes will be discarded."
    - **Restart** (`DEPL-06`) — visible when status ∈ {FAILED, STOPPED}; ConfirmDialog
      "Restart will re-run the same release."
    - **Rollback** (`DEPL-08`) — visible when there's at least one prior SUCCESS deployment;
      opens a picker listing prior SUCCESS deployments; user picks one → confirm.
    - **Delete** (`DEPL-07`) — visible when status ∈ {STOPPED, FAILED, SUCCESS}; ConfirmDialog
      type-to-confirm with the deployment ID.
  - **Live region** — `aria-live="polite"` announces state changes to screen readers.
- **`/dashboard/projects/:id/deployments/:id/logs`** — the logs viewer.
  - **Stream selector** — if the deployment has runtime logs (not just build logs), a tab strip
    picks Build / Runtime.
  - **Terminal-styled log lines** — line numbers, timestamp, severity icon (or color), body.
  - **Filter bar** — by severity (info/warn/error), by regex (regex input with live count).
  - **Live tail** — auto-scrolls to the bottom unless the user scrolls up; "Jump to latest" button
    appears when scrolled away.
  - **"Wrap lines" toggle**, **"Copy all"** button, **"Download .log"** button.
  - **Pause/resume** — the live stream is pauseable; resuming jumps to the latest.
- **`Build Config` tab** — inline editor (strategy, buildCommand, outputDirectory,
  healthCheckPath, healthCheckPort, startupTimeoutSeconds). The same fields as Settings →
  Build Config; changes here write through the same DEPL-10 endpoint (the canonical form is in
  Settings, this is a shortcut).

## 7. Component Specifications
- `<DataTable>` ✅ (`docs/product/components/data-table.md`) — the All tab.
- `<EntityCard>` ✅ (_todo) — the deployment card row in the Active tab.
- `<StateMachineTimeline>` ✅ (_todo) — the state-machine progress indicator; reusable across
  Deployments, Functions, Databases (provisioning), Email Domains (verifying).
- `<HealthBadge>` ✅ (_todo) — the state badge; colors driven by the state-machine status.
- `<Button>`, `<Modal>`, `<ConfirmDialog>`, `<Toast>`, `<EmptyState>`, `<Skeleton>`, `<ErrorState>`,
  `<CodeBlock>` ✅ (_todo), `<KeyValueTable>` ✅ (_todo), `<Drawer>` ✅ (_todo).
- `<NewDeploymentModal>` — spec'd here (one form, git or archive, one CTA).
- `<RollbackPicker>` — spec'd here (lists prior SUCCESS deployments, pick + confirm).
- `<LogViewer>` ✅ (_todo, in F11 Logs) — the terminal-styled log viewer; the deployment logs
  screen reuses this component with the deployment as the log source.

## 8. API Mapping
| Screen/Action | Endpoint | Inventory ID | Notes |
|---|---|---|---|
| List active deployments | `GET /api/v1/projects/:id/deployments?status=in_flight` | `DEPL-01` (filtered) | first paint |
| List all deployments (paginated) | `GET /api/v1/projects/:id/deployments?page=N&limit=25` | `DEPL-01` | the All tab |
| Create deployment | `POST /api/v1/projects/:id/deployments` | `DEPL-02` | optimistic; realtime will reconcile |
| Get deployment | `GET /api/v1/deployments/:id` | `DEPL-03` | detail page |
| Get build logs | `GET /api/v1/deployments/:id/logs` | `DEPL-04` | the logs screen |
| Stop | `POST /api/v1/deployments/:id/stop` | `DEPL-05` | optimistic state |
| Restart | `POST /api/v1/deployments/:id/restart` | `DEPL-06` | creates a new Deployment row linked to the same Release |
| Delete | `DELETE /api/v1/deployments/:id` | `DEPL-07` | ConfirmDialog type-to-confirm |
| Rollback | `POST /api/v1/deployments/:id/rollback` | `DEPL-08` | picks a prior SUCCESS, creates a new Deployment linked to that Release |
| Get build config | `GET /api/v1/projects/:id/build-config` | `DEPL-09` | inline editor + Settings shortcut |
| Update build config | `PATCH /api/v1/projects/:id/build-config` | `DEPL-10` | admin/owner only; UI greys for others |

All mutations are optimistic; reconciliation rolls back on failure with a toast.

## 9. Backend Integration Map
```
Deployments list → sdk.deployments.list(projectId, { status?, page? })
  → realtime subscribe to project:<id> events
    → deployments.deployment.created → card animates in
    → deployments.deployment.queued/building/deploying → state badge updates
    → deployments.deployment.succeeded → green badge, URL becomes clickable
    → deployments.deployment.failed → red badge, "View logs" CTA appears
    → deployments.deployment.stopped → gray badge
    → deployments.deployment.rolled_back → purple badge
    → deployments.deployment.log_appended (if exists) → logs viewer appends
Rollback flow:
  → GET deployments?status=success&limit=20 → RollbackPicker
  → POST /deployments/:id/rollback with targetId → optimistic + realtime reconcile
Build config inline editor → DEPL-09/10
  → writes also fire platform.events (audit) — visible in the project activity feed (F05)
```

## 10. User Experience Specification
- **The Active tab is the home of this section.** It's the first thing the user sees; it
  answers "is it deploying right now?" in one glance.
- **State badges carry the meaning.** Color + label + icon (not color alone). State changes
  are **animated** (the badge fades from yellow-spinner to green) — the user sees the deploy
  finish without staring at the page.
- **Logs are one click away.** Every deployment row has a Logs button; the detail page has an
  inline logs panel. The user never hunts for logs.
- **Rollback is one click + one confirm.** No wizard, no multi-step. The picker shows the last
  few SUCCESS deployments; the user picks one; "Roll back to this" → confirm → done.
- **Empty state is the action.** No deployments yet? The empty state **is** the deploy box
  (paste a git URL). The user is never more than one click from their first deployment.
- **Live region announces state changes** for screen readers.
- **The "What will build" preview** turns the modal from a form into a contract — the user
  sees what they're about to ship before they ship it.
- **Optimistic mutations** — the card state updates immediately, the toast says "Deploying…",
  and the realtime event either confirms (badge stays green) or rolls back (toast: "Deploy
  failed — see logs").
- **Realtime is the source of truth** for the list — the UI never re-polls to check status;
  the WS gateway pushes state-machine transitions.

## 11. Design Philosophy
- **Configure once.** The user does not configure deployments. They click "Deploy" or
  "Rollback." The build strategy defaults to "dockerfile"; the user only touches the Advanced
  disclosure if they need to.
- **Beginner first.** The empty state is the deploy box. The "What will build" preview is the
  one-sentence "what is this doing?" answer. The state machine timeline is the visual "is it
  done?" — no log-reading required for the common case.
- **Production-ready by default.** Every state has a clear visual; every failure has a clear
  CTA. The state machine is enforced server-side; the UI cannot show a state the backend
  hasn't emitted.
- **Everything observable.** The state-machine timeline shows every transition with a
  timestamp. The logs viewer shows the raw build output. The activity feed (F05) shows every
  deploy. The user can always answer "what happened?".
- **One dashboard.** The state machine + the logs + the rollback are all here. The user
  doesn't go to a separate "Deployments Pro" page.

## 12. Configuration Philosophy
- **User-tunable at deploy time**: git URL, branch, archive, commitSha (Advanced), strategy
  override (Advanced), envVars (informational preview only).
- **User-tunable at project level** (in Settings → Build Config): strategy, buildCommand,
  outputDirectory, healthCheckPath, healthCheckPort, startupTimeoutSeconds.
- **User does not touch**: imageTag (auto-generated), version (auto-generated), buildDurationMs
  (measured), state transitions (machine-driven), secret env values (never shown).
- **The "What will build" preview** is the contract: it shows the user exactly what fields
  will be sent to DEPL-02, with the defaults filled in.

## 13. Automation Rules
- **Slug auto-generation** — from project name (one-time, in F04).
- **Version auto-generation** — `<YYYY>-<short-SHA>` at release time.
- **Default BuildConfig** — auto-created on project create (per F04 §13).
- **Optimistic mutation** — every list mutation updates the local cache immediately; the
  realtime event confirms or rolls back.
- **State-machine guard** — the UI cannot show a state the backend hasn't emitted; the
  state badge is derived from the latest `deployments.deployment.*` event for that ID.
- **Logs streaming** — the viewer subscribes to `deployment:<id>:logs` (or polls DEPL-04 every
  2s if no WS topic exists); auto-scrolls unless user is reading history.
- **Rollback picker** — pre-fetches the last 20 SUCCESS deployments on mount; sorted by
  `createdAt` desc.

## 14. Endpoint Documentation
Full `DEPL-*` inventory in `docs/phases/frontend/backend/projects-deployments-domains.md`.
Notable specifics for F06:

- **`DEPL-02 CreateDeploymentDto`** — `{ source?: { type: 'git'|'archive', git?: { url, credentials?, branch?, dockerfilePath? }, archive?: { … } }, branch?, commitSha?, strategy?, envVars? }`. The UI validates
  locally (per F04 §14 — backend DTO is loose; the UI constrains).
- **`DEPL-08 Rollback`** — `{ targetDeploymentId: uuid }`. Must be SUCCESS. The backend creates a
  new Deployment row linked to the **target's** `Release`, so rollbacks re-deploy the same image.
- **`DEPL-04 Logs`** — returns `{ logs: release.buildLogs }` (full build log as one string). The
  UI splits on `\n` for the line-by-line view. Runtime logs (if any) live in F11 Logs and are
  joined by `deploymentId`.
- **`deployments.deployment.*` event family** — `created`, `queued`, `building`, `deploying`,
  `succeeded`, `failed`, `stopped`, `rolled_back`. Every transition emits one event; the WS
  gateway routes to the project room.

Backend gaps the UI must work around:
- The build logs endpoint returns the full log as one string, not as a stream. The viewer
  presents it line-by-line client-side; the "live tail" feel during build is a poll-every-2s
  on the build-logs endpoint until status leaves `BUILDING`. (A push-based `logs.appended`
  event would be a follow-up; the UI is built to consume it when it lands.)
- The `deployments.deployment.queued/building/deploying` events are emitted server-side but
  not currently a single source-of-truth state-machine column — the UI derives the state from
  the latest event for the ID. (Document the gap; the UI's state machine is the operator's
  contract; backend hardening is a separate follow-up.)

## 15. Feature Dependency Graph
- **Hard**: F00 (design system), F02 (auth), F05 (project shell — every URL lives under it).
- **Hard backend**: `DEPL-01..10`, the `deployments.*` event family, the WS gateway, the
  realtime `platform.events` rows.
- **Gated by F06**: nothing (it's a leaf screen).
- **Backend gaps that affect this screen**:
  - `deployments.deployment.queued/building/deploying` events exist but the `Deployment.status`
    column is the source of truth — they're consistent at the moment of write, but the
    realtime stream is what the UI trusts. Document the gap.
  - The build logs endpoint returns one string, not a stream. The "live tail" UX is a
    poll-every-2s. (Future: `logs.appended` event; the UI is built to consume it.)
  - The DTO for `DEPL-02` is loose; the UI must validate locally (matches the F04 §14 audit
    pattern).

## 16. Acceptance Criteria
1. `/dashboard/projects/:id/deployments` opens with the **Active** tab preselected.
2. The empty state is an inline paste-a-git-URL box; submitting POSTs `DEPL-02`; the card
   animates in.
3. The "New deployment" modal has git | archive source types, branch auto-filled from
   `project.sourceBranch`, a "What will build" preview, and a single "Deploy" CTA.
4. Each card row shows state badge (color + label + icon), imageTag, branch + commit, started
   + duration, live URL, Logs button, kebab menu.
5. The state badge transitions visually as realtime events arrive: PENDING → QUEUED → BUILDING
   → DEPLOYING → SUCCESS (green) or FAILED (red).
6. Clicking a card opens the detail with a state-machine timeline, metadata panel, build logs
   (collapsed by default for SUCCESS, expanded for FAILED), and an actions bar.
7. The actions bar shows Stop when in-flight, Restart when STOPPED/FAILED, Rollback when
   ≥1 prior SUCCESS exists, Delete when STOPPED/FAILED/SUCCESS. Each opens a ConfirmDialog.
8. Rollback opens a picker listing prior SUCCESS deployments; selecting one + confirming
   POSTs `DEPL-08`; a new Deployment row appears with status `ROLLED_BACK`, imageTag from
   the target Release.
9. The logs viewer streams build logs (poll-every-2s while BUILDING; static when terminal);
   supports filter by severity, regex search, copy-all, download.
10. The "What will build" preview shows source, branch, Dockerfile path, build strategy, and
    the auto-generated imageTag.
11. The state-machine timeline is a11y-correct (`aria-live="polite"` announces transitions;
    each step is a labeled button with a tooltip explaining the state).
12. Optimistic mutations: Stop/Restart/Delete update the local state immediately; the
    realtime event confirms or rolls back with a toast.
13. Viewer role sees no Deploy/Stop/Restart/Rollback/Delete buttons; the deploy list is
    read-only.
14. The deployment list updates in real time without page reload when a deployment is
    created by another team member (realtime subscription on the project room).
15. `pnpm --filter @fidscript/dashboard build` clean; this spec updated to match shipped
    behavior.

## Change log
- 2026-06-20 — Initial full 16-section spec. Documents 2 backend gaps: (1) the build-logs
  endpoint returns one string, not a stream — the live-tail UX is a 2s poll until the
  deployment leaves BUILDING; (2) `DEPL-02` DTO is loose — the UI validates locally.
