# Component Spec — `ConfirmDialog`

> Destructive confirmation with **type-to-confirm** for the most dangerous actions
> (Delete project, Delete deployment, Rotate creds, Drop DB, Force-delete mailbox, Cancel
> active deploy, Danger Zone actions).

## 1. Purpose
The user must consciously destroy data. The principle: **destructive actions are loud —
the user types the resource's name to confirm.**

## 2. Props
```ts
type ConfirmDialogProps = {
  open: boolean;
  onClose: () => void;
  title: string;
  description: string;
  /** The text the user must type to confirm. */
  confirmText: string;
  /** The primary action's label. */
  actionLabel: string;
  /** The primary action's callback. */
  onConfirm: () => void;
  /** The variant (drives the color). */
  variant: 'destructive' | 'warning' | 'info';
  /** Optional secondary action. */
  secondaryLabel?: string;
  onSecondary?: () => void;
};
```

## 3. Visual anatomy
```
┌────────────────────────────────────────────────────┐
│ Delete project?                               [X] │
├────────────────────────────────────────────────────┤
│ This will permanently delete the project and all   │
│ of its deployments, functions, databases, and     │
│ data. This action cannot be undone.                │
│                                                    │
│ Type the project name to confirm:                  │
│ ┌────────────────────────────────────────────────┐│
│ │ my-app                                         ││
│ └────────────────────────────────────────────────┘│
│                                                    │
│                       [Cancel]  [ Delete project ]│
└────────────────────────────────────────────────────┘
```

## 4. States
- **Closed**: not rendered.
- **Open**: full dialog; the input is focused.
- **Type-to-confirm**: button is disabled until the user types `confirmText` exactly.
- **Loading**: button shows spinner.
- **Error**: server error message below the input.
- **Match**: button enables; fire-red background (for destructive).

## 5. Variants
- **destructive** (default): red accent (Delete, Rotate, Drop).
- **warning**: yellow accent (Suspend, Archive, Stop).
- **info**: blue accent (Skip, Reset, less dangerous).

## 6. Interactions
- **Type**: enables the primary button when the input matches `confirmText`.
- **Enter**: triggers the primary action.
- **Esc**: closes.
- **Click Cancel / [X]**: closes.

## 7. Accessibility
- **ARIA**: `role="alertdialog"`, `aria-labelledby` to title, `aria-describedby` to
  description.
- **Input**: `<label>` linked; `aria-invalid` on mismatch.
- **Live region**: `aria-live="polite"` on the match indicator.
- **Focus**: initial focus on the input.

## 8. Telemetry / events
- `confirm_dialog.opened` → `{ action, variant }`.
- `confirm_dialog.confirmed` → `{ action }`.
- `confirm_dialog.cancelled` → `{ action }`.

## 9. Cross-references
- **Screens**: Delete project, Delete deployment, Rotate creds, Drop DB, Danger Zone.

## 10. Acceptance criteria
- The primary button is disabled until the user types `confirmText` exactly.
- The destructive variant has a red accent.
- Loading state shows a spinner.
- Server error surfaces inline.
- Esc / Cancel / [X] close.
- Focus is trapped; initial focus on the input.
- Reduced-motion preference is respected.
- Theme-aware.