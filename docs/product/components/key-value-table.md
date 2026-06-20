# Component Spec — `KeyValueTable`

> Read-mostly key-value table. Used by Connection info (Database), Deployment metadata,
> Function config, Project Env (editable variant).

## 1. Purpose
The user sees structured metadata at a glance. The principle: **the table is the
canonical "what are the fields and their values" view.**

## 2. Props
```ts
type KeyValueTableProps = {
  /** The rows. */
  rows: Array<{
    key: string;
    value: ReactNode;
    /** Optional copy action. */
    copyValue?: string;
    /** Optional mask toggle (for secrets). */
    masked?: boolean;
  }>;
  /** Optional edit mode (for Project Env, Function envVars). */
  editable?: boolean;
  /** Add-row callback (when editable). */
  onAdd?: () => void;
  /** Row-change callback. */
  onChange?: (rows: ...) => void;
};
```

## 3. Visual anatomy
```
┌─────────────────────────────────────────────────────────────┐
│ Source URL          git@github.com:acme/app                 │
│ Commit SHA          abc1234                [Copy]           │
│ Image tag           fidscript/my-app:2026-abc123             │
│ Build duration      1m 52s                                   │
└─────────────────────────────────────────────────────────────┘
```

## 4. States
- **Idle**: read-only table.
- **Hover row**: subtle highlight.
- **Editable**: each value is an input; an `+` row adds a new row.
- **Masked**: value shows `••••••••••` with a "Reveal" button.
- **Loading**: skeleton.
- **Empty**: "No values."

## 5. Variants
- **Density**: comfortable (default); compact.
- **Editable**: with input fields + add/remove.
- **Masked**: with reveal toggle (for secrets).

## 6. Interactions
- **Click Copy**: copies the value to the clipboard.
- **Click Reveal**: shows the masked value (session-scoped).
- **Editable**: type to change; Enter to commit; Backspace on empty row removes it.

## 7. Accessibility
- **Table**: `<table>` with `<thead>` (key, value) and `<tbody>`.
- **Masked**: `aria-label="Masked value; click Reveal to show"`.
- **Copy**: `aria-label="Copy <key>"`.

## 8. Telemetry / events
- `key_value_table.copy_clicked` → `{ key }`.
- `key_value_table.reveal_clicked` → `{ key }` (audit-logged).

## 9. Cross-references
- **Screens**: Deployment detail, Database connection, Function config, Project Env.

## 10. Acceptance criteria
- Renders key-value rows.
- Copy + Reveal work.
- Editable variant supports add/remove/change.
- Masked variant shows a reveal toggle.
- Keyboard navigation works.
- Theme-aware.