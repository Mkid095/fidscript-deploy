# Screen Spec — `NewFunctionModal`

> Modal overlay on `/dashboard/projects/:id/functions` (F07). Triggered by the "Create
> function" CTA on the functions list.

## 1. Purpose
The user creates a new edge function — picks a runtime, sets memory + timeout, and starts
writing code. The principle: **a function is one form; the editor is the next step.**

## 2. Route + access
- **Route:** overlay on `/dashboard/projects/:id/functions`.
- **Permission:** any member (`O/A/D/V`); viewer sees the modal but Create is greys.
- **Project scope:** creates a `Function` row in the current project.

## 3. Layout
```
┌──────────────────────────────────────────────────────────────────────┐
│ New function                                                    [X] │
├──────────────────────────────────────────────────────────────────────┤
│ Name *                                                              │
│ ┌──────────────────────────────────────────────────────────────────┐│
│ │ webhook-receiver                                                  ││
│ └──────────────────────────────────────────────────────────────────┘│
│                                                                      │
│ Runtime *                                                            │
│ ┌──────────────────────┐  ┌──────────────────────┐                  │
│ │ ● Node.js (default)  │  │ ○ Python             │                  │
│ └──────────────────────┘  └──────────────────────┘                  │
│ ┌──────────────────────┐  ┌──────────────────────┐                  │
│ │ ⊘ PHP (coming soon)  │  │ ⊘ Go (coming soon)   │                  │
│ └──────────────────────┘  └──────────────────────┘                  │
│ ┌──────────────────────┐                                            │
│ │ ⊘ Rust (coming soon) │                                            │
│ └──────────────────────┘                                            │
│                                                                      │
│ Entry point: [ handler ]                                             │
│ Memory:      [────●──────] 256 MB                                    │
│ Timeout:     [──●────────] 30 s                                      │
│                                                                      │
│ Env vars (optional)                                                  │
│ ┌──────────────────────────────────────────────────────────────────┐│
│ │ LOG_LEVEL = info                                       [Remove]   ││
│ │ [+] Add row                                                       ││
│ └──────────────────────────────────────────────────────────────────┘│
│                                                                      │
│                                [Cancel]  [ Create function ]         │
└──────────────────────────────────────────────────────────────────────┘
```

## 4. Sections + states
- **Name**: required, slug-style (lowercase, dashes), unique per project. Async uniqueness
  check on blur.
- **Runtime**: 5 radio cards. Implemented (enabled): `Node.js`, `Python`. Greys with
  "not yet available" + tooltip: `PHP`, `Go`, `Rust` (per the audit).
- **Entry point**: text input, default `handler` (per runtime).
- **Memory**: slider 128–1024 MB, default 256.
- **Timeout**: slider 1–300 s, default 30.
- **Env vars**: key-value editor (optional); key regex `^[A-Z_][A-Z0-9_]*$`.
- **Submit**:
  - *Disabled*: name empty or invalid, or runtime is greyed (cannot select).
  - *Loading*: spinner.
  - *Error*: modal stays open with inline error.

## 5. Primary + secondary actions
- **Primary**: "Create function" — POST FN-01.
- **Secondary**: "Cancel" / `[X]`.

## 6. API mapping
- **Create** — `POST /api/v1/projects/:id/functions` (`FN-01`). Payload:
  `{name, runtime, entryPoint?, memoryMb?, timeoutSeconds?, envVars?}`. Returns the
  `Function` row (status: `created`).
- **Realtime** — `function.created` event confirms; the card animates in.

## 7. Forms + validation
- **Name**: required, slug-style, unique per project.
- **Runtime**: required, must be in `['nodejs', 'python']` (the UI constrains; the
  backend's DTO is loose per the audit).
- **Entry point**: optional, defaults to `handler`.
- **Memory**: integer 128–1024.
- **Timeout**: integer 1–300.
- **Env vars**: optional; keys match `^[A-Z_][A-Z0-9_]*$`.

## 8. Accessibility
- **Focus order**: name → runtime → entry point → memory → timeout → env vars → cancel →
  create.
- **ARIA**: `role="dialog"`, `aria-modal="true"`, `aria-labelledby` to title.
- **Greying**: `aria-disabled="true"` on the greyed runtime cards; tooltip explains
  "not yet available."
- **Sliders**: `role="slider"` with `aria-valuemin/max/now`; the value is also displayed
  numerically for screen readers.

## 9. Cross-references
- **Phase**: F07 Functions UI §6.
- **Service spec**: `docs/product/services/functions.md`.
- **Journey**: backend dev's first function.
- **Navigation**: Functions section's "Create function" CTA; ⌘K.
- **Related screens**: Function detail (target after create).

## 10. Acceptance criteria
1. The modal opens from the Functions list's "Create function" CTA.
2. Name is required, slug-style; async uniqueness check on blur.
3. Runtime picker shows `Node.js` + `Python` enabled and `PHP`/`Go`/`Rust` greys with
   "not yet available" + tooltip.
4. Sliders for memory (128–1024) and timeout (1–300) work; defaults are 256 and 30.
5. Env vars key-value editor; `+` adds a row; `Remove` deletes a row.
6. Submit is disabled when name is empty/invalid or runtime is greyed.
7. On submit, the modal closes optimistically; the new card animates in with `created`
   status.
8. On 409 (duplicate name), the modal re-opens with an inline error.
9. Esc / Cancel / [X] close the modal.
10. Greying unimplemented runtimes is the honest path — they appear in the picker with
    "not yet available" and a tooltip, never faked.
