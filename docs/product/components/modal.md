# Component Spec — `Modal`

> Centered modal overlay. Used by every "create" flow + reset-password + force-change
> + confirm.

## 1. Purpose
The user focuses on one task. The principle: **the modal is a contract — it tells the
user what they're about to do, and they can back out.**

## 2. Props
```ts
type ModalProps = {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  size?: 'sm' | 'md' | 'lg'; // 384 / 512 / 768
  /** Confirm if dirty when closing. */
  confirmOnClose?: boolean;
  /** Primary CTA. */
  primaryAction?: {
    label: string;
    onClick: () => void;
    loading?: boolean;
    disabled?: boolean;
  };
  /** Secondary CTA. */
  secondaryAction?: {
    label: string;
    onClick: () => void;
  };
  children: ReactNode;
};
```

## 3. Visual anatomy
```
┌────────────────────────────────────────────┐
│ Title                                  [X] │
├────────────────────────────────────────────┤
│ Description (optional)                      │
│                                             │
│  ... form fields ...                        │
│                                             │
├────────────────────────────────────────────┤
│              [Cancel]  [Primary action]    │
└────────────────────────────────────────────┘
```

## 4. States
- **Closed**: not rendered.
- **Opening**: fade + scale-in (disabled under reduced-motion).
- **Open**: full modal; backdrop is dimmed.
- **Loading**: primary CTA shows spinner; form fields are greys.
- **Error**: form-level error message at the top.
- **Dirty close**: confirm dialog if `confirmOnClose` + dirty.

## 5. Variants
- **Size**: sm (384) · md (512) · lg (768).
- **Theme**: dark/light.

## 6. Interactions
- **Click backdrop** → close (with confirm if dirty).
- **Esc** → close (with confirm if dirty).
- **Click [X]** → close.
- **Click Cancel** → close.
- **Click Primary**: triggers `primaryAction.onClick`.

## 7. Accessibility
- **ARIA**: `role="dialog"`, `aria-modal="true"`, `aria-labelledby` to title,
  `aria-describedby` to description.
- **Focus management**: initial focus on the first focusable element; trap inside;
  previous focus restored on close.
- **Live region**: `aria-live="polite"` on the form-level error.

## 8. Telemetry / events
- `modal.opened` / `modal.closed` → `{ id, size }`.
- `modal.primary_clicked` → `{ id }`.

## 9. Cross-references
- **Screens**: every create flow + reset-password + force-change.

## 10. Acceptance criteria
- Centered overlay; backdrop is dimmed.
- Click backdrop / Esc / [X] / Cancel close.
- Confirm on close if dirty.
- Focus is trapped; previous focus restored.
- Reduced-motion preference is respected.
- Theme-aware.