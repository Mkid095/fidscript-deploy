# Screen Spec — `NewDeploymentModal`

> Modal overlay on `/dashboard/projects/:id/deployments` (F06). Triggered by the "New
> deployment" CTA on the deployments list.

## 1. Purpose
The user creates a new deployment — picks a git URL (or drops an archive), previews what
will build, and ships. The principle: **a deployment is one form; the "What will build"
preview turns the form into a contract.**

## 2. Route + access
- **Route:** overlay on `/dashboard/projects/:id/deployments`. No dedicated URL.
- **Permission:** any project member (`O/A/D/V`); viewer sees the modal but the Deploy
  button is greyed.
- **Project scope:** creates a `Deployment` + `Release` row in the current project.

## 3. Layout
```
┌──────────────────────────────────────────────────────────────────────┐
│ New deployment                                                  [X] │
├──────────────────────────────────────────────────────────────────────┤
│ Source *                                                            │
│ ┌────────────────┐  ┌────────────────┐                              │
│ │ ● Git          │  │ ○ Archive      │                              │
│ └────────────────┘  └────────────────┘                              │
│                                                                      │
│ Git URL *                                                            │
│ ┌──────────────────────────────────────────────────────────────────┐│
│ │ git@github.com:acme/app.git                                       ││
│ └──────────────────────────────────────────────────────────────────┘│
│                                                                      │
│ Branch                                                               │
│ ┌──────────────────────────────────────────────────────────────────┐│
│ │ main (from project default)                                       ││
│ └──────────────────────────────────────────────────────────────────┘│
│                                                                      │
│ ▼ Advanced                                                           │
│   Dockerfile path: [ ./Dockerfile ]                                  │
│   Pin to commit:  [ ]                                                │
│   Strategy override: [ Use project default ▼ ]                       │
│                                                                      │
│ What will build:                                                     │
│ ┌──────────────────────────────────────────────────────────────────┐│
│ │ Source: git@github.com:acme/app @ main                            ││
│ │ Dockerfile: ./Dockerfile                                          ││
│ │ Build with: dockerfile (project default)                          ││
│ │ Image: fidscript/my-app:2026-abc123 (auto)                        ││
│ │ Env vars: 12 project vars available                               ││
│ └──────────────────────────────────────────────────────────────────┘│
│                                                                      │
│                                [Cancel]  [ Deploy ]                  │
└──────────────────────────────────────────────────────────────────────┘
```

## 4. Sections + states
- **Source type**:
  - *Idle*: 2 radio cards (Git | Archive). Default: Git.
  - *Selected*: card highlighted.
- **Git URL**:
  - *Idle*: empty.
  - *Valid*: green check; "What will build" preview updates.
  - *Invalid*: red; "Must be a valid git URL (https:// or git@)."
  - *Private repo*: shows a credentials field (SSH key or https token).
- **Branch**:
  - *Idle*: auto-filled from `project.sourceBranch` (default `main`).
  - *Editable*: the user can override.
- **Archive** (when selected):
  - *Idle*: dropzone "Drop a .zip or .tar.gz (max 500MB) or click to browse."
  - *Selected*: file name + size + a "Replace" button.
  - *Error*: "Max 500MB" / "Must be .zip or .tar.gz."
- **Advanced** (collapsible):
  - Dockerfile path (default `./Dockerfile`).
  - Pin to commit (toggle + SHA input).
  - Strategy override (select: dockerfile | buildpack | docker; default = project default).
- **What will build** preview:
  - *Live*: updates as the user changes fields.
  - *Shows*: source, branch, Dockerfile path, build strategy, auto-generated imageTag,
    env var count (no values).
- **Submit**:
  - *Disabled*: URL is empty (git) or no file (archive).
  - *Loading*: spinner; "Deploying…".
  - *Error*: modal stays open with inline error.
- **Optimistic close**: modal closes; card animates in at the top of the list with
  status `PENDING` (transitioning via realtime).

## 5. Primary + secondary actions
- **Primary**: "Deploy" — POST DEPL-02.
- **Secondary**: "Cancel" / `[X]` — close (no confirm if not dirty; confirm if a file is
  staged or fields are filled).

## 6. API mapping
- **Create** — `POST /api/v1/projects/:id/deployments` (`DEPL-02`). Payload:
  `{ source: { type: 'git'|'archive', git?: {...}, archive?: {...} }, branch?, commitSha?,
  strategy?, envVars? }`. Returns `{id, projectId, status: 'pending', ...}`.
- **Realtime** — `deployments.deployment.created` event confirms; the card transitions
  via `deployments.deployment.queued/building/deploying/succeeded/failed`.

## 7. Forms + validation
- **Source type**: required, `git|archive`.
- **Git URL**: required when source=git; valid URL format.
- **Branch**: optional, defaults to `project.sourceBranch`.
- **Dockerfile path**: optional, defaults to project's `BuildConfig.dockerfilePath`.
- **Commit SHA**: optional; if provided, must be valid hex.
- **Strategy**: optional; if provided, must be in the allowed enum.
- **Archive**: required when source=archive; .zip or .tar.gz; ≤500MB.
- **Server error mapping**:
  - `400 Bad Request` on invalid source → inline field error.
  - `409 Conflict` on concurrent deployment (ProjectSettings.activeDeploymentId is set) →
    "Another deployment is in progress — please wait for it to finish."

## 8. Accessibility
- **Focus order**: source type → URL → branch → advanced disclosure → what will build →
  cancel → deploy.
- **ARIA**: `role="dialog"`, `aria-modal="true"`, `aria-labelledby` to title, `aria-describedby`
  to the "What will build" helper copy.
- **Live preview**: `aria-live="polite"` on the "What will build" panel — announces
  changes as the user types.
- **Advanced disclosure**: `aria-expanded` toggles.

## 9. Cross-references
- **Phase**: F06 Deployments UI §6.
- **Service spec**: `docs/product/services/deployments.md`.
- **Journey**: every persona's first deploy.
- **Navigation**: Deployments section's "New deployment" CTA; ⌘K → "Deploy this branch".
- **Related screens**: Deployments list (the parent), Deployment detail (target after create).

## 10. Acceptance criteria
1. The modal opens from the Deployments list's "New deployment" CTA or the ⌘K palette.
2. Source type is a radio (Git | Archive); default is Git.
3. Git URL field accepts `https://…` and `git@…`; branch auto-fills from the project.
4. Archive dropzone accepts .zip/.tar.gz ≤500MB.
5. Advanced disclosure reveals Dockerfile path, pin-to-commit, strategy override.
6. "What will build" preview updates live as the user changes fields.
7. Submit is disabled when required fields are empty.
8. On submit, the modal closes optimistically; the new card appears with `PENDING` status.
9. On 409, the modal re-opens with the concurrent-deployment error.
10. Esc / Cancel / [X] close the modal.
