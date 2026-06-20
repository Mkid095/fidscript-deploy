# Screen Spec — `DeploymentDetail`

> Per-deployment detail at `/dashboard/projects/:id/deployments/:id` (F06). The operator's
> console for a single deployment: state-machine timeline, metadata, build logs, actions.

## 1. Purpose
The user inspects one deployment — sees its current state, reads the build logs, stops /
restarts / rolls back. The principle: **a deployment is a state machine, not a black box;
the UI surfaces every transition.**

## 2. Route + access
- **Route:** `/dashboard/projects/:id/deployments/:id`.
- **Permission:** any member (`O/A/D/V`); viewer's kebab is greys for Stop / Restart /
  Rollback / Delete.
- **Project scope:** the deployment belongs to the current project; cross-project access
  is blocked server-side.

## 3. Layout
```
┌──────────────────────────────────────────────────────────────────────┐
│ Project › my-app › Deployments › deploy-abc123                        │
├──────────────────────────────────────────────────────────────────────┤
│ fidscript/my-app:2026-abc123                  [●] SUCCEEDED   [kebab]│
│ git@github.com:acme/app @ main · abc1234 · 2m 14s · 12m ago          │
│ ┌────────────────────────┐  ┌──────────────────────────────────────┐│
│ │ Open URL · https://... │  │ [ Restart ] [ Rollback ] [ Delete ]  ││
│ └────────────────────────┘  └──────────────────────────────────────┘│
├──────────────────────────────────────────────────────────────────────┤
│ State machine                                                       │
│ ●───●───●───●───●  PENDING QUEUED BUILDING DEPLOYING SUCCESS          │
│ 0s   2s   18s  1m54s  2m14s                                          │
├──────────────────────────────────────────────────────────────────────┤
│ Metadata                                                            │
│ Source URL     git@github.com:acme/app                               │
│ Commit SHA     abc1234                                               │
│ Image tag      fidscript/my-app:2026-abc123                           │
│ Build duration 1m 52s                                                │
│ Created by     Kennedy · 12m ago                                      │
├──────────────────────────────────────────────────────────────────────┤
│ ▼ Build logs (collapsed for SUCCESS, expanded for FAILED)            │
│ [ Copy logs ]                                                       │
│ ┌──────────────────────────────────────────────────────────────────┐│
│ │ #1 [builder 1/3] Starting...                                      ││
│ │ #2 [builder 1/3] Resolving dependencies...                        ││
│ │ ...                                                               ││
│ └──────────────────────────────────────────────────────────────────┘│
└──────────────────────────────────────────────────────────────────────┘
```

## 4. Sections + states
- **Header strip**:
  - Image tag (mono) + state badge + kebab.
  - Branch + commit + duration + created-at.
  - Live URL (if status=SUCCESS): Copy + Open.
  - Actions bar (right): Stop / Restart / Rollback / Delete (visibility per status).
- **State machine timeline**:
  - 5 steps: PENDING → QUEUED → BUILDING → DEPLOYING → SUCCESS (or → FAILED / STOPPED).
  - Active step: fire-red dot + spinner.
  - Completed step: green check.
  - Failed step: red X.
  - Each step has a tooltip with the absolute timestamp.
- **Metadata panel**: per `Release` fields (key/value rows).
- **Build logs** (collapsible):
  - *SUCCESS*: collapsed by default; "Show logs" reveals.
  - *FAILED*: expanded by default.
  - *BUILDING*: expanded + auto-refreshes every 2s.
  - "Copy logs" button.
  - The logs come from `DEPL-04` as a single string; the UI splits on `\n` for the
    line-by-line view.
- **Actions bar**:
  - **Stop** (DEPL-05) — visible when status ∈ {PENDING, QUEUED, BUILDING, DEPLOYING};
    ConfirmDialog.
  - **Restart** (DEPL-06) — visible when status ∈ {FAILED, STOPPED}; ConfirmDialog.
  - **Rollback** (DEPL-08) — visible when ≥1 prior SUCCESS exists; opens the Rollback
    Picker.
  - **Delete** (DEPL-07) — visible when status ∈ {STOPPED, FAILED, SUCCESS};
    ConfirmDialog type-to-confirm with the deployment ID.

## 5. Primary + secondary actions
- **Primary** (top-right): none (the actions are state-conditional).
- **Per-state primary** (the most-useful next action):
  - *In-flight*: Stop.
  - *FAILED / STOPPED*: Restart.
  - *SUCCESS (with prior SUCCESS)*: Rollback.
- **Secondary**: Open URL, Copy URL, Copy logs.

## 6. API mapping
- **Get deployment** — `GET /api/v1/deployments/:id` (`DEPL-03`).
- **Get build logs** — `GET /api/v1/deployments/:id/logs` (`DEPL-04`); single string,
  UI splits on `\n`.
- **Stop** — `POST /api/v1/deployments/:id/stop` (`DEPL-05`).
- **Restart** — `POST /api/v1/deployments/:id/restart` (`DEPL-06`).
- **Delete** — `DELETE /api/v1/deployments/:id` (`DEPL-07`).
- **Rollback** — `POST /api/v1/deployments/:id/rollback` (`DEPL-08`) with `{targetDeploymentId}`.
- **List prior SUCCESS** — `GET /api/v1/projects/:id/deployments?status=success&limit=20`
  (for the Rollback Picker).
- **Realtime** — `deployments.deployment.*` events reconcile the state machine + the
  metadata.

## 7. Forms + validation
- No forms. The screen is read-mostly; the only input is the Rollback Picker (target
  selection from a list).

## 8. Accessibility
- **Focus order**: header strip → state machine → metadata → build logs → actions.
- **State machine**: each step is a labeled button with a tooltip; the active step has
  `aria-current="step"`.
- **Live region**: `aria-live="polite"` on the state badge — announces state changes
  ("Deploying now", "Succeeded").
- **Kebab**: standard pattern (button + menu, `aria-haspopup="menu"`, `aria-expanded`).
- **Logs**: the lines are a `<pre>` with `role="log"`; long lines are `tabindex="0"` for
  horizontal scroll via keyboard.

## 9. Cross-references
- **Phase**: F06 Deployments UI §6.
- **Service spec**: `docs/product/services/deployments.md`.
- **Journey**: every persona's "what just deployed?" + "why did it fail?" flows.
- **Navigation**: Deployments list → click a row.
- **Related screens**: New deployment modal (sibling), Deployment logs (sub-route).

## 10. Acceptance criteria
1. The detail page opens at `/dashboard/projects/:id/deployments/:id`; the header strip,
   state machine, metadata, and logs are visible.
2. The state badge color matches the current status (PENDING gray · QUEUED blue ·
   BUILDING yellow-spinner · DEPLOYING yellow-spinner · SUCCESS green · FAILED red ·
   STOPPED gray · ROLLED_BACK purple).
3. The state machine timeline shows the 5 steps with the active step highlighted; each
   step has a timestamp tooltip.
4. The metadata panel shows the `Release` fields.
5. Build logs are collapsed for SUCCESS, expanded for FAILED. "Copy logs" works.
6. The actions bar shows Stop when in-flight, Restart when STOPPED/FAILED, Rollback when
   ≥1 prior SUCCESS exists, Delete when STOPPED/FAILED/SUCCESS.
7. Each action opens a ConfirmDialog (type-to-confirm for Delete); the action POSTs the
   corresponding endpoint.
8. Rollback opens a picker listing prior SUCCESS deployments; selecting one + confirming
   POSTs `DEPL-08`.
9. The state badge updates in real time as `deployments.deployment.*` events arrive.
10. Live region announces state changes to screen readers.
