# Deployments Components

UI for the per-deployment operator console: header (status, actions, URL), progress timeline, logs (stream + history), metadata, and the live preview iframe. All actions call real inventory endpoints (`DEPL-*`).

## Header

| File | Purpose |
|------|---------|
| `deployment-header.tsx` | Card with status badge, action buttons, timestamp, URL. |
| `deployment-url.tsx` | Public URL with copy button. |
| `status-badge.tsx` | Pill + spinner + streaming dot. |
| `status-utils.ts` | Status → label/variant mapping + duration helpers + `IN_FLIGHT`/`TERMINAL` sets. |
| `action-buttons.tsx` | Stop / restart / rollback / delete buttons. |

## Progress Timelines

| File | Purpose |
|------|---------|
| `progress-timeline.tsx` | Linear step list. |
| `vertical-timeline.tsx` | Vertical (mobile-friendly) timeline. |
| `horizontal-timeline.tsx` | Horizontal stepper. |
| `roadmap-timeline.tsx` | Roadmap view (planned / in-progress / done). |
| `progress-types.ts` | `DeploymentStep` re-export of `STEPS`. |
| `step-icon.tsx` | Icon for each step. |
| `terminal-state.tsx` | Terminal-state row (success / failed / blocked / rolled-back). |

## Logs

| File | Purpose |
|------|---------|
| `log-viewer.tsx` | Stream + history viewer (toggle + scroll). |
| `log-viewer-hooks.ts` | Orchestrates stream (`useLogStream`) + buffered history (`useLogBuffer`) + filter (`useLogFilter`). |
| `log-content.tsx` | Renders the parsed lines. |
| `log-toolbar.tsx` | Filter + level + download. |
| `log-toggle.tsx` | Stream vs history switch. |
| `log-stream-indicator.tsx` | Live indicator dot. |
| `log-types.ts` | `LogLine`, `LogLevel`, `parseLogLines`. |

## Modals & Pickers

| File | Purpose |
|------|---------|
| `new-deployment-modal.tsx` | Trigger a new deployment. |
| `rollback-picker.tsx` | Choose target release to roll back to. |
| `confirm-dialog.tsx` | Generic confirm; danger variant requires typing `"delete"`. |

## Misc

| File | Purpose |
|------|---------|
| `metadata-panel.tsx` | Build/deploy metadata card. |
| `metadata-row.tsx` | Single row in the metadata panel. |
| `live-preview.tsx` | Iframe with the deployment's URL. |
| `index.ts` | Barrel export for the directory. |

## Conventions

- Status helpers (`status-utils.ts`) are pure and re-used by hooks. Components import from there.
- Logs are parsed once via `parseLogLines`; the buffer hook keeps renders cheap.
- Modals expose `onClose`/`onCancel` so the parent owns open state.

## Files
- 28 files (all under `src/components/deployments/`)