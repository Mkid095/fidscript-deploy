# Component Spec — `Select`

> The canonical select. Native or virtualized (for long lists). Used by every form.

## 1. Purpose
The user picks one option from a list. The principle: **the picker is honest — disabled
options are greyed, not hidden.**

## 2. Props
```ts
type SelectOption<V extends string> = {
  value: V;
  label: string;
  description?: string;
  disabled?: boolean;
  disabledReason?: string;
};

type SelectProps<V extends string> = {
  label: string;
  value: V | null;
  onChange: (v: V) => void;
  options: SelectOption<V>[];
  placeholder?: string;
  helperText?: string;
  errorMessage?: string;
  required?: boolean;
  disabled?: boolean;
  /** When true, renders the multi-select variant. */
  multi?: boolean;
  /** When true, renders the radio-card variant. */
  radioCards?: boolean;
};
```

## 3. Visual anatomy (native variant)
```
Runtime *
┌─────────────────────────────────────────────────────────────┐
│ Node.js                                              ▼     │
└─────────────────────────────────────────────────────────────┘
```

## 3b. Visual anatomy (radio-cards variant)
```
Runtime *
┌──────────────────────────┐  ┌──────────────────────────┐
│ ● Node.js (default)      │  │ ○ Python                 │
└──────────────────────────┘  └──────────────────────────┘
┌──────────────────────────┐  ┌──────────────────────────┐
│ ⊘ PHP (coming soon)      │  │ ⊘ Go (coming soon)       │
└──────────────────────────┘  └──────────────────────────┘
```

## 4. States
- **Idle**: placeholder or selected value.
- **Open**: list of options (native or virtualized).
- **Selected**: option highlighted.
- **Disabled option**: greyed with tooltip ("not yet available").
- **Error**: red border + error message.
- **Disabled**: greyed; not focusable.
- **Loading**: skeleton.

## 5. Variants
- **Native** (default): `<select>` for ≤20 options.
- **Virtualized**: for >20 options (logs stream picker, channel picker, etc.).
- **Radio-cards**: for high-attention choices (runtime, environment, type).
- **Multi**: with checkboxes.
- **Theme**: dark/light.

## 6. Interactions
- **Click**: open.
- **Type-ahead**: filter (native) or search (virtualized).
- **Click option**: select + close.
- **Esc**: close.
- **Keyboard**: ↑/↓ navigate; Enter select.

## 7. Accessibility
- **Native**: standard `<select>` semantics.
- **Virtualized**: `role="listbox"`; each option `role="option"` with `aria-selected`.
- **Radio-cards**: `role="radiogroup"`; each card `role="radio"` with `aria-checked`.
- **Disabled option**: `aria-disabled="true"` + tooltip.

## 8. Telemetry / events
- `select.changed` → `{ fieldId, from, to }`.

## 9. Cross-references
- **Screens**: New-project (type), New-deployment (strategy), New-function (runtime),
  New-database (env/type), New-queue (type), New-cron (target), etc.

## 10. Acceptance criteria
- Renders native select for ≤20 options; virtualized for >20.
- Radio-cards variant works for high-attention choices.
- Greys disabled options with a tooltip.
- Multi variant supports checkboxes.
- Keyboard navigation works.
- Theme-aware.