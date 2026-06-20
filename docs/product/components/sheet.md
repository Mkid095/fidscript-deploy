# Component Spec — `Sheet`

> Bottom-anchored sheet for mobile. Slides up from the bottom; closes on swipe-down or
> backdrop click.

## 1. Purpose
The user gets a mobile-friendly overlay. The principle: **the sheet is a modal on
small screens; never a desktop pattern.**

## 2. Props
```ts
type SheetProps = {
  open: boolean;
  onClose: () => void;
  title?: string;
  height?: 'auto' | 'half' | 'full';
  children: ReactNode;
};
```

## 3. Visual anatomy
```
              ┌────────────────────────────┐
              │ ────                       │
              │ Title (optional)           │
              ├────────────────────────────┤
              │                            │
              │  ... content ...           │
              │                            │
              └────────────────────────────┘
```

## 4. States
- **Closed**: not rendered.
- **Opening**: slide-up animation.
- **Open**: full sheet; backdrop is dimmed.
- **Closing**: slide-down animation.
- **Loading**: skeleton body.

## 5. Variants
- **Height**: auto · half · full.

## 6. Interactions
- **Swipe down** → close.
- **Click backdrop** → close.
- **Esc** → close (on `lg:`).

## 7. Accessibility
- **ARIA**: `role="dialog"`, `aria-modal="true"`.
- **Focus trap**: focus is trapped inside.
- **Reduced motion**: animations disabled.

## 8. Telemetry / events
- `sheet.opened` / `sheet.closed` → `{ id, height }`.

## 9. Cross-references
- **Screens**: mobile tab nav (More sheet), mobile modals.

## 10. Acceptance criteria
- Slides up from the bottom.
- Height is configurable.
- Swipe down / backdrop / Esc closes.
- Focus is trapped; previous focus restored.
- Reduced-motion preference is respected.
- Theme-aware.