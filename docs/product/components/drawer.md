# Component Spec — `Drawer`

> Right-rail drawer for entity detail side panels. Slides in from the right; closes on
> Esc or backdrop click.

## 1. Purpose
The user opens a side panel for a related resource without leaving the current screen.
The principle: **the drawer is a sibling, not a navigation.**

## 2. Props
```ts
type DrawerProps = {
  open: boolean;
  onClose: () => void;
  title: string;
  width?: 'sm' | 'md' | 'lg'; // 320 / 480 / 640
  children: ReactNode;
  /** Optional footer with actions. */
  footer?: ReactNode;
};
```

## 3. Visual anatomy
```
              ┌────────────────────────────────────┐
              │ Title                         [X] │
              ├────────────────────────────────────┤
              │                                     │
              │  ... content ...                    │
              │                                     │
              ├────────────────────────────────────┤
              │  [Cancel]  [Save]                   │
              └────────────────────────────────────┘
```

## 4. States
- **Closed**: not rendered (or hidden).
- **Opening**: slide-in animation (disabled under reduced-motion).
- **Open**: full drawer; backdrop is dimmed.
- **Closing**: slide-out animation.
- **Loading**: skeleton body.

## 5. Variants
- **Width**: sm (320) · md (480) · lg (640).
- **Anchor**: right (default). Left / top / bottom are P1 follow-ups.

## 6. Interactions
- **Click backdrop** → close.
- **Esc** → close.
- **Click [X]** → close.
- **Focus trap**: focus is trapped inside the drawer.

## 7. Accessibility
- **ARIA**: `role="dialog"`, `aria-modal="true"`, `aria-labelledby` to title.
- **Focus management**: initial focus on the first focusable element; previous focus
  restored on close.
- **Reduced motion**: animations disabled.

## 8. Telemetry / events
- `drawer.opened` / `drawer.closed` → `{ id, width }`.

## 9. Cross-references
- **Screens**: entity detail side panels (P1 follow-up; for now, detail uses full-page).

## 10. Acceptance criteria
- Slides in from the right.
- Width is configurable.
- Click backdrop / Esc / [X] closes.
- Focus is trapped; previous focus restored.
- Reduced-motion preference is respected.
- Theme-aware.