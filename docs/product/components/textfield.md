# Component Spec — `TextField`

> The canonical text input. Used by every form in the dashboard.

## 1. Purpose
The user types text. The principle: **the field is honest — it tells you what's wrong
before you submit.**

## 2. Props
```ts
type TextFieldProps = {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  helperText?: string;
  errorMessage?: string;
  required?: boolean;
  disabled?: boolean;
  readOnly?: boolean;
  type?: 'text' | 'email' | 'password' | 'url' | 'search' | 'number';
  autoComplete?: string;
  maxLength?: number;
  pattern?: string;
  prefix?: ReactNode; // e.g. https://
  suffix?: ReactNode; // e.g. .apps.example.com
  monospace?: boolean; // for slugs, IDs, etc.
  inlineAdornment?: ReactNode; // copy button, reveal, etc.
};
```

## 3. Visual anatomy
```
Name *
┌─────────────────────────────────────────────────────────────┐
│ my-app                                                      │
└─────────────────────────────────────────────────────────────┘
A slug-style identifier; auto-generated from the name.
```

## 4. States
- **Idle**: empty; the label + helper text are visible.
- **Focused**: fire-red ring; the label stays above.
- **Filled**: the value is shown; the helper text is below.
- **Error**: red border + error message replaces the helper text.
- **Disabled**: greyed; not focusable.
- **Read-only**: same look; the value is selectable.
- **Loading**: not applicable (the field is a leaf).

## 5. Variants
- **Type**: text | email | password | url | search | number.
- **Density**: comfortable (default); compact.
- **Theme**: dark/light.

## 6. Interactions
- **Focus**: shows the ring.
- **Type**: debounced for async validation (300ms).
- **Enter**: submits the parent form (when inside one).
- **Tab**: moves focus to the next field.

## 7. Accessibility
- **Label**: `<label>` linked to the input via `htmlFor`/`id`.
- **Helper text**: linked via `aria-describedby`.
- **Error**: `aria-invalid="true"` + `aria-errormessage`.
- **Required**: `aria-required="true"`.

## 8. Telemetry / events
- `text_field.changed` → `{ fieldId, valueLength }` (debounced).

## 9. Cross-references
- **Screens**: every form.

## 10. Acceptance criteria
- Renders label + input + helper text.
- Validation errors replace the helper text.
- Focus ring is visible.
- Keyboard navigation works.
- Screen-reader announcements are correct.
- Theme-aware.