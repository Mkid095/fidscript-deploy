# Component Spec — `EnvKeyValueEditor`

> The key-value editor for env vars (Project Env, Function envVars). Editable
> `<KeyValueTable>` with add/remove + per-row validate.

## 1. Purpose
The user manages a project's or function's env vars. The principle: **env vars are
typed — keys are constrained, values are masked.**

## 2. Props
```ts
type EnvKeyValueEditorProps = {
  /** The current rows. */
  rows: Array<{ id?: string; key: string; value: string; isNew?: boolean }>;
  /** The change callback. */
  onChange: (rows: ...) => void;
  /** Mask values (default true). */
  masked?: boolean;
  /** Show a "Reveal once" toggle per row. */
  revealable?: boolean;
  /** Rotate-aware warning banner (for DB/MQ creds). */
  showRotateWarning?: boolean;
};
```

## 3. Visual anatomy
```
⚠ Rotating DB/MQ credentials requires restarting the dependent services.
   Use the rotate action in Databases → Connection tab.

┌─────────────────────────────────────────────────────────────┐
│ DATABASE_URL    ●●●●●●●●●●●●●● [Reveal]            [Remove]│
│ LOG_LEVEL       info                                [Remove]│
│ [+] Add row                                               │
└─────────────────────────────────────────────────────────────┘
```

## 4. States
- **Idle**: rows render with key + masked value + Remove.
- **Editing**: a row is in edit mode (key + value inputs).
- **Adding**: an empty row appears with `+`.
- **Invalid**: red border on the row with the invalid key/value.
- **Empty**: "No env vars."
- **With reveal**: "Reveal" button shows the value (session-scoped).

## 5. Variants
- **Project Env** (default): full editor.
- **Function envVars**: same; lives inside the Function Settings tab.

## 6. Interactions
- **Edit**: click a row to edit; Enter to commit; Esc to cancel.
- **Add**: `+` adds an empty row.
- **Remove**: `Remove` deletes the row (confirm if a real key).
- **Reveal**: shows the value; "Re-hide" reverses.

## 7. Accessibility
- **Editor**: `<table>` semantics.
- **Inputs**: each input has a label (key / value).
- **Reveal**: `aria-pressed` indicates state.

## 8. Telemetry / events
- `env_editor.row_changed` → `{ key, valueLength }`.
- `env_editor.row_added` → `{ key }`.
- `env_editor.row_removed` → `{ key }`.
- `env_editor.reveal_clicked` → `{ key }` (audit-logged).

## 9. Cross-references
- **Screens**: Settings → Env, Function detail → Settings.

## 10. Acceptance criteria
- Renders rows + Add + Remove.
- Keys validate `^[A-Z_][A-Z0-9_]*$`.
- Values are masked by default.
- Reveal shows the value; re-hide reverses.
- Rotate warning banner shows when `showRotateWarning`.
- Keyboard navigation works.
- Theme-aware.