# Component Spec — `MagicCodeInput`

> 6-digit OTP input for magic-code login and MFA challenge. Auto-advances between digits;
  pastes the full code; submits on complete.

## 1. Purpose
The user enters a 6-digit code. The principle: **the input is forgiving — paste the
whole code; auto-submit when complete.**

## 2. Props
```ts
type MagicCodeInputProps = {
  length: 6; // fixed for now; extensible
  value: string;
  onChange: (v: string) => void;
  onComplete: (v: string) => void;
  autoFocus?: boolean;
  errorMessage?: string;
  disabled?: boolean;
};
```

## 3. Visual anatomy
```
Enter the 6-digit code
┌───┐ ┌───┐ ┌───┐ ┌───┐ ┌───┐ ┌───┐
│ 4 │ │ 2 │ │   │ │   │ │   │ │   │
└───┘ └───┘ └───┘ └───┘ └───┘ └───┘
```

## 4. States
- **Empty**: 6 empty boxes.
- **Partial**: some boxes filled; the rest empty.
- **Complete**: all 6 boxes filled; auto-submits.
- **Error**: red border; error message below.
- **Resending**: a "Resend code" button with a countdown.
- **Disabled**: greys; not focusable.

## 5. Variants
- **Length**: 6 (fixed for now).
- **Theme**: dark/light.

## 6. Interactions
- **Type digit**: auto-advances to the next box.
- **Backspace**: clears the current box; if empty, goes back.
- **Paste**: fills all 6 boxes from the pasted text.
- **Arrow keys**: navigate between boxes.
- **Auto-submit**: on 6 digits.

## 7. Accessibility
- **Each box**: `<input>` with `inputMode="numeric"`, `maxLength="1"`, `aria-label="Digit <n>"`.
- **Auto-focus**: the first box on mount.
- **Error**: `aria-invalid="true"` + `aria-errormessage`.

## 8. Telemetry / events
- `magic_code_input.changed` → `{ length }`.
- `magic_code_input.completed` → `{ length }`.
- `magic_code_input.pasted` → `{ length }`.

## 9. Cross-references
- **Screens**: Login (magic tab), MFA challenge.

## 10. Acceptance criteria
- Auto-advances between digits.
- Pastes the full code from clipboard.
- Auto-submits on 6 digits.
- Backspace navigates back.
- Error state is clear.
- Keyboard navigation works.
- Theme-aware.