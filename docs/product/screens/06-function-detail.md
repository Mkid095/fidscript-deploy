# Screen Spec — `FunctionDetail`

> Per-function detail at `/dashboard/projects/:id/functions/:fn` (F07). The operator's
> console for a single function: editor, deploy, invoke, logs, versions, settings.

## 1. Purpose
The user writes code, deploys it, invokes it, and inspects logs — all in one screen. The
principle: **a function is code, a deploy, an invocation, a log; the UI shows all four.**

## 2. Route + access
- **Route:** `/dashboard/projects/:id/functions/:fn`.
- **Permission:** any member (`O/A/D/V`); viewer's editor is read-only + Deploy/Invoke
  buttons are greys.
- **Project scope:** the function belongs to the current project.

## 3. Layout
```
┌──────────────────────────────────────────────────────────────────────┐
│ Project › my-app › Functions › webhook-receiver                      │
├──────────────────────────────────────────────────────────────────────┤
│ webhook-receiver  [Node.js] [v3 — deployed 5m ago]   [Save] [Deploy] │
├──────────────────────────────────────────────────────────────────────┤
│ [Code] [Deploy] [Invoke] [Logs] [Versions] [Settings]                │
├──────────────────────────────────────────────────────────────────────┤
│ 1  export const handler = async (req) => {                           │
│ 2    const body = await req.json();                                  │
│ 3    console.log('received', body);                                  │
│ 4    return new Response(JSON.stringify({ ok: true }), {             │
│ 5      headers: { 'content-type': 'application/json' }               │
│ 6    });                                                             │
│ 7  };                                                                │
│ 8                                                                    │
│ 9                                                                   │
│ 10                                                                   │
│ ...                                                                  │
└──────────────────────────────────────────────────────────────────────┘
```

## 4. Sections + states
- **Header strip**: function name, runtime pill, currentVersion, last invoked (relative).
- **Tabs**:
  - **Code** (default) — Monaco editor with the runtime's language; line numbers; minimap;
    dark/light theme matches the dashboard preference. Top-right: Save (saves draft to
    localStorage), Format (Prettier for nodejs, Black for python), Deploy.
  - **Deploy** — paste area + version label + description + "Build & deploy" CTA. Build
    progress renders inline.
  - **Invoke** — payload editor (JSON or text) + Sync toggle + Invoke button. Response
    panel. Invocation history (last 20).
  - **Logs** — shared `<LogViewer>` scoped to this function.
  - **Versions** — per-function version table + Diff + Promote to current.
  - **Settings** — entryPoint, memoryMb, timeoutSeconds, envVars, Danger Zone.
- **Per-tab states**:
  - **Code**:
    - *Idle*: editor shows the function's `currentVersion` code (loaded once on mount).
    - *Editing*: draft state in `localStorage`; "Save" persists draft (no deploy).
    - *Deploying*: editor greys + "Deploying…" badge in the header.
    - *Deployed*: editor re-enables; `function.deployed` event confirms; currentVersion
      updates.
    - *Failed*: error toast + "Revert to deployed" button.
  - **Invoke**:
    - *Idle*: empty payload editor.
    - *Invoking (sync)*: spinner; response panel shows the result.
    - *Invoking (async)*: returns invocationId; the result streams in via `function.invoked`.
    - *Failed*: error in the response panel.
  - **Logs**:
    - *Idle*: empty state "No invocations yet — try the Invoke tab."
    - *Live*: LogViewer with live tail.
  - **Versions**:
    - *Empty*: "No versions yet — Deploy to create v1."

## 5. Primary + secondary actions
- **Primary (per tab)**:
  - *Code*: "Deploy" — opens the deploy dialog.
  - *Deploy*: "Build & deploy" — POST FN-06.
  - *Invoke*: "Invoke" — POST FN-07.
  - *Settings*: "Save" — PATCH FN-04.
- **Secondary**:
  - *Code*: "Save" (draft), "Format", "Reset" (revert to deployed).

## 6. API mapping
- **Get function** — `GET /api/v1/functions/:functionId` (`FN-03`).
- **Deploy** — `POST /api/v1/functions/:functionId/deploy` (`FN-06`) with
  `{code, version?, description?}`.
- **Invoke** — `POST /api/v1/functions/:functionId/invoke` (`FN-07`) with
  `{payload?, sync?}`.
- **Logs** — `GET /api/v1/functions/:functionId/logs` (`FN-08`).
- **Versions** — `GET /api/v1/functions/:functionId/versions` (`FN-09`).
- **Update settings** — `PATCH /api/v1/functions/:functionId` (`FN-04`).
- **Delete** — `DELETE /api/v1/functions/:functionId` (`FN-05`).
- **Realtime** — `function.deployed`, `function.invoked`, `function.error`, `function.deleted`.

## 7. Forms + validation
- **Editor**: Monaco handles syntax + formatting; client-side validation only.
- **Deploy dialog**: version label (auto-filled, editable), description (optional).
- **Invoke**: payload (JSON or text); Sync toggle.
- **Settings**: per F07 §6.

## 8. Accessibility
- **Editor**: Monaco has full a11y support (screen reader, keyboard nav).
- **Tab order**: tabs → editor → Save → Format → Deploy.
- **Tab semantics**: `role="tablist"` with `role="tab"` per tab; the active tab has
  `aria-selected="true"` and `tabindex="0"`; inactive tabs are `tabindex="-1"`.
- **Live region**: `aria-live="polite"` on the header's currentVersion badge — announces
  version changes.

## 9. Cross-references
- **Phase**: F07 Functions UI §6.
- **Service spec**: `docs/product/services/functions.md`.
- **Journey**: backend dev's day-to-day.
- **Navigation**: Functions list → click a card.
- **Related screens**: New function modal (sibling), Logs (shared component).

## 10. Acceptance criteria
1. The detail page opens at `/dashboard/projects/:id/functions/:fn`; the **Code** tab is
   preselected; the editor renders the current version's code.
2. The editor's language matches the runtime (Node.js → TS/JS, Python → py).
3. The editor's draft persists in `localStorage`; "Save" persists without deploying;
   "Reset" reverts.
4. "Deploy" opens a dialog with version label (auto-filled) + description; submitting
   POSTs `FN-06`; the editor shows "Deploying…" until `function.deployed` confirms.
5. The Invoke tab accepts a JSON or text payload; "Invoke" POSTs `FN-07`; the response
   is shown in a code block (green for success, red for error).
6. Async invoke returns an invocationId; the response streams in via WS `function.invoked`.
7. Invocation history shows the last 20 invocations with status, durationMs, memoryUsedMb.
8. The Logs tab uses the shared `<LogViewer>` with filters by status, version, time range.
9. The Versions tab lists every deployed version; "Promote to current" sets
   `currentVersion`; "Diff" opens a side-by-side diff.
10. Greying unimplemented runtimes is the honest path — the runtime picker shows
    `nodejs` + `python` as enabled; `php` + `go` + `rust` are greys with "not yet
    available" + tooltip.
