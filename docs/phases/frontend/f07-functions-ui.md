# F07 — Functions UI (full spec)

> **Status:** ⏳ Spec complete — pending approval.
> **Connects to:** backend `FN-*` inventory (`docs/phases/frontend/backend/compute.md`).
> Cross-references F05 (shell), F11 Logs (the function log viewer is shared). Renders the
> **`Function`** + **`FunctionLog`** Prisma entities.

## 1. Purpose
The operator's console for the sandboxed function runtime. Create, edit, deploy, invoke, and
inspect logs for a function. This is the **edge function** experience — your code, in a
sandboxed, no-network container, invoked by HTTP or queue trigger.

## 2. Business Goal
Match the edge-function console of Cloudflare Workers + Vercel: one editor, one Deploy button,
an Invoke playground, and a live log tail. The principle: **the user writes code, the platform
runs it; the UI never gets in the way.**

## 3. Personas
- **Backend dev** — writes a function, deploys it, invokes it from the dashboard to test.
- **Solo dev** — uses functions for webhook receivers, scheduled tasks, glue code.
- **Team lead** — reviews the team's function inventory, checks log volume.

## 4. Complete User Journey
```
Open /dashboard/projects/:id/functions (F05) → Functions tab preselected.
  → list of functions: name, runtime, status, currentVersion, last invoked, invocations today.
  → empty state: "No functions yet — your code runs in a sandboxed, no-network container."
    CTA "Create function" → modal.
  → "Create function" modal: name, runtime (greys php/go/rust per audit), entryPoint, memoryMb,
    timeoutSeconds → POST FN-01 → card animates in.
  → click a function card → /functions/:fn:
      tabs: Code · Deploy · Invoke · Logs · Versions · Settings.
      default tab: Code.
Code tab:
  → embedded code editor (Monaco via @monaco-editor/react) with syntax highlighting per runtime
    (nodejs → TS/JS, python → py).
  → "Deploy" button at top-right of the editor → POST FN-06 with the editor contents
    (with a version label "v3 — 2026-06-20 14:32").
  → "Save" button (draft only, no deploy).
  → "Format" button (Prettier for nodejs, Black for python).
  → "Reset" reverts to the deployed version.
Deploy tab:
  → paste code (textarea with line numbers), or drop a .zip / .tar.gz.
  → version label + description.
  → "Deploy" → POST FN-06 → progress (sandbox build → status updates).
Invoke tab:
  → payload editor (JSON or raw text) + "Sync" toggle + "Invoke" button.
  → POST FN-07 → response shown in a code block: `{success, output, error, durationMs, memoryUsedMb}`.
  → invocation history (last 20 invocations, with duration + status badge).
Logs tab:
  → shared LogViewer (F11) scoped to this function.
  → filters: by status (success/error), by version, by time range.
  → "Live tail" for in-flight invocations.
Versions tab:
  → list of deployed versions: version, deployed at, by, status.
  → "Promote to current" — sets `Function.currentVersion` (no redeploy; the runtime already has it).
  → "Diff" — shows a side-by-side diff between any two versions.
Settings tab:
  → name (read-only — set at create), entryPoint, memoryMb, timeoutSeconds, envVars.
  → PATCH FN-04 → optimistic.
  → "Delete function" (Danger Zone, ConfirmDialog type-to-confirm) → DELETE FN-05.
```

## 5. Information Architecture
- `/dashboard/projects/:id/functions` — the list. Default tab: **Functions**. Secondary tab:
  **Versions** (a project-wide version history across all functions — useful for "which version
  is currently in production for each function?").
- `/dashboard/projects/:id/functions/new` — the create-function modal (overlay).
- `/dashboard/projects/:id/functions/:fn` — the function detail. Tabs: Code / Deploy / Invoke /
  Logs / Versions / Settings.
- The **Code** tab is the default — it's the screen the user wants to see when they open a
  function.

## 6. Screen Specifications
- **`/dashboard/projects/:id/functions`** — the list.
  - **Per-function row**: name, runtime pill, status badge, currentVersion, last invoked
    (relative time), invocations today (small number, sparkline optional), kebab menu.
  - **State badge** — color: created gray · building yellow · active green · error red.
  - **Empty state**: "No functions yet — your code runs in a sandboxed, no-network container."
    with a "Create function" CTA. Hint: "Tip: try a webhook receiver — takes 30 seconds."
  - **Tabs**: Functions (default) / Versions (project-wide).
- **New function modal** — focused modal. Fields:
  - **name** (required, slug-style, unique per project).
  - **runtime** (select). Implemented: `nodejs` (default), `python`. Greyed with
    "not yet available": `php`, `go`, `rust` (per the audit; honest gap).
  - **entryPoint** (default: `handler` for nodejs, `handler` for python).
  - **memoryMb** (slider: 128–1024, default 256).
  - **timeoutSeconds** (slider: 1–300, default 30).
  - **envVars** (key-value editor; optional).
  - "Create" → POST FN-01 → modal closes, card animates in.
- **`/dashboard/projects/:id/functions/:fn`** — the function detail.
  - **Header strip**: function name, runtime pill, status badge, currentVersion, "last invoked
    Xs ago" from the latest `FunctionLog.createdAt`.
  - **Tabs** (top-aligned, F05 tab styling): Code · Deploy · Invoke · Logs · Versions · Settings.
  - **Code tab**:
    - **Editor** — Monaco with the runtime's language; line numbers; minimap (collapsible);
      theme matches the dashboard's dark/light preference.
    - **Top-right action bar**: "Save draft" (saves to a localStorage draft, no deploy),
      "Format" (Prettier/Black), "Deploy" (POST FN-06 with the editor's current contents).
    - **Deploy dialog** — pops when "Deploy" is clicked: version label (default
      `v<n+1> — <timestamp>`), description (optional, multi-line), "Deploy" CTA. POST FN-06
      with `{ code, version, description }`. Realtime `function.deployed` confirms.
    - **Diff with current** — a small "Show diff with v<n>" toggle in the editor toolbar;
      opens a side-by-side diff panel.
  - **Deploy tab**:
    - **Paste area** — large textarea with line numbers, or drag-and-drop a .zip/.tar.gz.
    - **Version label** + **description** fields.
    - **"Build & deploy"** CTA → POST FN-06.
    - **Build progress** — the state machine renders inline: created → building → deployed/error.
  - **Invoke tab**:
    - **Payload editor** — JSON or text mode (toggle); syntax highlighted.
    - **"Sync" toggle** — when on, waits for the response; when off, returns the invocation ID
      and the response streams in via `function.invoked` event.
    - **"Invoke"** CTA → POST FN-07.
    - **Response panel** — shows the latest response: `{success, output, error, durationMs,
      memoryUsedMb}` as a code block. Color-coded: green for success, red for error.
    - **Invocation history** — last 20 invocations (from `FunctionLog`): timestamp, status,
      durationMs, memoryUsedMb, requestPayload (truncated), responseOutput (truncated). Click a
      row → opens a detail view.
  - **Logs tab**:
    - **Shared `<LogViewer>`** (F11 component) scoped to this function.
    - Filters: by `FunctionLog.status` (success/error), by `FunctionLog.version` (multi-select),
      by time range (Last 1h / 24h / 7d / Custom).
    - **Live tail** — auto-scrolls to the bottom; pauseable; "Jump to latest" button.
  - **Versions tab** (per-function):
    - Table of versions: version, deployed at, by (user), status, invocations count.
    - "Promote to current" sets `Function.currentVersion` (no redeploy; the runtime serves the
      pinned version).
    - "Diff" between any two versions opens a side-by-side diff in a modal.
  - **Settings tab**:
    - **General**: entryPoint (editable), memoryMb (slider), timeoutSeconds (slider).
    - **Env vars** (key-value editor; same UX as project env vars, but per-function).
    - **Danger Zone** — "Delete function" (ConfirmDialog type-to-confirm with function name).

## 7. Component Specifications
- `<DataTable>` ✅ — Versions tab.
- `<EntityCard>` ✅ — the list row.
- `<HealthBadge>` ✅ — runtime status badge.
- `<CodeBlock>` ✅ — invocation response, version diff.
- `<CodeEditor>` ✅ (_todo) — Monaco wrapper with the runtime's language; used here and in any
  future "Edit template" screens.
- `<KeyValueTable>` ✅ — env vars editor.
- `<Modal>`, `<ConfirmDialog>`, `<Toast>`, `<EmptyState>`, `<Skeleton>`, `<ErrorState>`,
  `<Button>`, `<Slider>`, `<Select>`.
- `<LogViewer>` ✅ (F11) — shared with Logs.
- `<RuntimeBadge>` ✅ (_todo) — the runtime pill (nodejs / python / php / go / rust); greys
  unimplemented runtimes with a tooltip.
- `<NewFunctionModal>` — spec'd here.
- `<DeployDialog>` — spec'd here; shared with the editor's Deploy button.
- `<InvocationHistoryRow>` — spec'd here.
- `<DiffPanel>` — spec'd here; reused for Versions.

## 8. API Mapping
| Screen/Action | Endpoint | Inventory ID | Notes |
|---|---|---|---|
| List functions | `GET /api/v1/projects/:id/functions` | `FN-02` | list view |
| Get function | `GET /api/v1/functions/:functionId` | `FN-03` | detail page |
| Create function | `POST /api/v1/projects/:id/functions` | `FN-01` | modal submit |
| Update function settings | `PATCH /api/v1/functions/:functionId` | `FN-04` | Settings tab |
| Delete function | `DELETE /api/v1/functions/:functionId` | `FN-05` | Danger Zone |
| Deploy a version | `POST /api/v1/functions/:functionId/deploy` | `FN-06` | editor + Deploy tab |
| Invoke (sync) | `POST /api/v1/functions/:functionId/invoke?sync=true` | `FN-07` | returns full response |
| Invoke (async) | `POST /api/v1/functions/:functionId/invoke?sync=false` | `FN-07` | returns invocationId; response via WS event |
| Get logs | `GET /api/v1/functions/:functionId/logs?limit=100&cursor=...` | `FN-08` | LogViewer |
| List versions | `GET /api/v1/functions/:functionId/versions` | `FN-09` | Versions tab |

All mutations are optimistic where possible (Settings tab). Deploy + Invoke are not optimistic
(server-driven state machine).

## 9. Backend Integration Map
```
Functions list → sdk.functions.list(projectId)
  → realtime subscribe to project:<id> events
    → function.created → card animates in
    → function.deployed → version increments, currentVersion updates
    → function.invoked → invocation history appends
    → function.error → red badge, error toast on the editor
Function detail (Code tab) → sdk.functions.get(id)
  → editor state = function.currentVersion's code (cached client-side)
  → "Deploy" → FN-06 → optimistic "Deploying…" badge → function.deployed confirms or rolls back
Invoke tab → sdk.functions.invoke(id, {payload, sync})
  → sync=true → response rendered inline
  → sync=false → subscribe to function:<id> events; render response when arrived
Logs tab → sdk.functions.logs(id, {limit, cursor, version?, since?})
  → WS subscribe to function:<id> events for live tail
Versions tab → sdk.functions.versions(id)
  → "Promote to current" → PATCH FN-04 (sets currentVersion) → optimistic
  → "Diff" → fetch both versions' code → client-side diff (Monaco's diff editor)
```

## 10. User Experience Specification
- **Code is the home of this section.** The Code tab is the default; the editor takes 80% of
  the screen; the chrome (header, tabs) is minimal. The user opens a function to **write code**.
- **Deploy is one click + one dialog.** The dialog asks for a version label (auto-filled) +
  description (optional). No multi-step wizard.
- **Invoke is a playground.** The user can paste a JSON payload, click Invoke, and see the
  response in the same screen. The history shows the last 20 invocations — useful for "what did
  my function return the last time?".
- **Logs are unified** — the function's logs are a tab, not a separate screen. The user
  doesn't navigate away to debug.
- **Versions are first-class** — every deploy is a version; the user can promote, diff, and
  roll back. The runtime serves the pinned `currentVersion`; promoting is a no-op for the
  runtime, just a metadata change.
- **Greying unimplemented runtimes** is the honest path. The runtime picker shows
  `nodejs` + `python` as enabled; `php` + `go` + `rust` are greyed with a tooltip "not yet
  available." The audit notes the backend doesn't have these runtimes; the UI doesn't fake them.
- **Editor drafts persist** — the editor's current contents are saved to `localStorage` per
  function (`fidscript.fnDraft.<functionId>`); on reload, the editor re-opens with the draft,
  not the deployed version. "Reset" reverts to the deployed version.
- **Diff with current is always one click away** — the user can see what they're about to
  deploy before they deploy it.

## 11. Design Philosophy
- **Configure once.** The user does not configure the runtime; they pick a runtime, write code,
  click Deploy. The sandbox is platform-defined; the user only touches entryPoint + memoryMb +
  timeoutSeconds if they need to.
- **Beginner first.** The "Your code runs in a sandboxed, no-network container" copy is
  explicit — the user knows the runtime's boundaries without reading docs. The empty state's
  "Tip: try a webhook receiver — takes 30 seconds" is the path-of-least-resistance.
- **Production-ready by default.** Every deployed version is immutable; every version has a
  label + deployer + timestamp; every invocation has a durationMs + memoryUsedMb. The audit
  trail is the Versions tab + the FunctionLog.
- **Everything observable.** Invocation history + logs + versions + the editor's diff = the
  user can always answer "what did my function do?".
- **One dashboard.** The editor + the playground + the logs are all here. The user doesn't
  leave the function to test it.

## 12. Configuration Philosophy
- **User-tunable at create**: name, runtime (nodejs | python), entryPoint, memoryMb,
  timeoutSeconds, envVars.
- **User-tunable after create**: entryPoint, memoryMb, timeoutSeconds, envVars (Settings tab).
- **User-tunable per deploy**: code, version label, description.
- **User does not touch**: sandbox image (platform-defined), network policy (sandbox is
  no-network), the version's invocations count (auto-derived), the runtime's lifecycle.
- **Greying is honest** — `php`/`go`/`rust` runtimes are shown in the picker with
  "not yet available" and a tooltip. They are **not** hidden (the user should know they exist
  in the spec and are coming).

## 13. Automation Rules
- **Default entryPoint** is `handler` for nodejs, `handler` for python.
- **Default memoryMb** is 256; **default timeoutSeconds** is 30.
- **Version label** auto-fills as `v<n+1> — <timestamp>`; the user can override.
- **Draft persistence** — `localStorage` per function (`fidscript.fnDraft.<id>`); "Reset" clears it.
- **Invocation history** — capped at 20 in the UI; the backend's `FunctionLog` is the source of truth.
- **Live tail** — the logs tab subscribes to `function:<id>` events; pauses on scroll-up.
- **Greying rule** — runtime options are loaded from a single constant in the SDK
  (`SUPPORTED_RUNTIMES`); the picker greys anything not in that list. The constant is updated
  when a runtime lands.

## 14. Endpoint Documentation
Full `FN-*` inventory in `docs/phases/frontend/backend/compute.md`. Notable specifics for F07:

- **`FN-01 CreateFunctionDto`** — `{ name, runtime, entryPoint?, memoryMb?, timeoutSeconds?, envVars? }`.
  The audit notes that the backend doesn't restrict `runtime` to an enum (it's a string). The
  UI constrains to `['nodejs', 'python']`; the backend should reject anything else.
- **`FN-06 DeployFunctionDto`** — `{ code, version?, description? }`. The editor's contents
  are sent verbatim; no minification, no transformation.
- **`FN-07 InvokeFunctionDto`** — `{ payload?, sync? }`. When `sync=true`, the response is the
  full result; when `sync=false`, the response is `{ invocationId }` and the result arrives
  via `function.invoked` event.
- **`FN-08 Logs`** — paginated by `cursor`; returns `{ logs, nextCursor }`. The LogViewer uses
  cursor pagination for "load more"; live tail is via WS.
- **`function.*` event family** — `created`, `deployed`, `invoked`, `error`, `deleted`. The
  function card subscribes to `project:<id>`; the function detail subscribes to `function:<id>`.

Backend gaps the UI must work around:
- `php` / `go` / `rust` runtimes are in the spec but not implemented. The picker greys them;
  the audit notes this; the UI does not pretend they work.
- `FunctionLog` does not currently store `version` consistently across invocations (per the
  audit). The Logs tab's "by version" filter is best-effort; the UI surfaces this when the
  filter returns nothing with the explanation "versions not consistently logged — see the
  audit."

## 15. Feature Dependency Graph
- **Hard**: F00 (design system), F02 (auth), F05 (shell).
- **Hard backend**: `FN-01..09`, the `function.*` event family, the WS gateway, the runtime
  sandbox.
- **Gated by F07**: nothing.
- **Backend gaps that affect this screen**:
  - The `runtime` field on `CreateFunctionDto` is unconstrained; the UI must validate locally.
  - `php` / `go` / `rust` are not implemented; the UI greys them.
  - `FunctionLog.version` is not consistently populated; the per-version log filter is
    best-effort.

## 16. Acceptance Criteria
1. `/dashboard/projects/:id/functions` opens with the **Functions** tab preselected.
2. The empty state is "No functions yet — your code runs in a sandboxed, no-network container"
   with a "Create function" CTA.
3. The create-function modal validates locally: `php` / `go` / `rust` are greyed with
   "not yet available"; submitting POSTs `FN-01`; the card animates in.
4. Each card row shows name, runtime pill, status badge, currentVersion, last invoked
   (relative), invocations today.
5. Clicking a card opens the detail with the **Code** tab preselected; the editor renders
   the function's current code in the right language.
6. "Deploy" opens a dialog with a version label (auto-filled) and description; submitting
   POSTs `FN-06`; the editor shows a "Deploying…" badge; `function.deployed` confirms.
7. The editor's draft persists in `localStorage`; "Reset" reverts to the deployed version.
8. The Invoke tab's playground accepts a JSON or text payload, an "Invoke" button, and shows
   the response in a code block (color-coded success/error). The history shows the last 20
   invocations.
9. Async invoke returns an invocationId; the response streams in via WS `function.invoked`.
10. The Logs tab uses the shared `<LogViewer>` with filters by status, version, time range;
    live tail is pauseable; "Jump to latest" button when scrolled away.
11. The Versions tab lists every deployed version with version, deployer, timestamp, status,
    invocations count. "Promote to current" sets `currentVersion` (PATCH `FN-04`).
12. "Diff" between any two versions opens a side-by-side diff in a modal.
13. The Settings tab lets the user change entryPoint, memoryMb, timeoutSeconds, envVars;
    "Delete function" is in the Danger Zone with type-to-confirm.
14. Editor autosaves the draft every 5s; "Reset" clears the draft.
15. Greying unimplemented runtimes is the honest path — they appear in the picker with
    "not yet available" and a tooltip, never faked.
16. `pnpm --filter @fidscript/dashboard build` clean; this spec updated to match shipped
    behavior.

## Change log
- 2026-06-20 — Initial full 16-section spec. Documents 3 backend gaps: (1) `runtime` field is
  unconstrained — UI validates locally; (2) `php` / `go` / `rust` are not implemented — UI
  greys them; (3) `FunctionLog.version` not consistently populated — per-version log filter is
  best-effort with honest disclosure.
