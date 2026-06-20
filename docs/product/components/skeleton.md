# Component Spec — `Skeleton`

> The canonical load placeholder. Pulse animation; respects reduced-motion. Used by
> every list/card during initial load.

## 1. Purpose
The user sees that content is loading. The principle: **a skeleton is a promise —
the content is coming.**

## 2. Props
```ts
type SkeletonProps = {
  /** Shape variants. */
  variant: 'text' | 'circle' | 'rect' | 'card' | 'row';
  /** Width (for text/rect). */
  width?: string | number;
  /** Height (for text/rect). */
  height?: string | number;
  /** Count (for text: number of lines). */
  count?: number;
};
```

## 3. Visual anatomy
```
┌────────────────────────────────────────────────────┐
│ ████████████  ████  ████████                       │
│ ████████████  ████  ████████                       │
│ ████                                            │
└────────────────────────────────────────────────────┘
```

## 4. States
- **Idle**: pulse animation.
- **Reduced motion**: static (no pulse); layout still updates.

## 5. Variants
- **text**: rounded rectangles (lines of text).
- **circle**: for avatars.
- **rect**: for images.
- **card**: a full card skeleton.
- **row**: a list row skeleton.

## 6. Interactions
- None (passive).

## 7. Accessibility
- **Role**: `role="status"` with `aria-label="Loading…"`.
- **Live region**: `aria-live="polite"`.

## 8. Telemetry / events
- (none).

## 9. Cross-references
- **Screens**: every list/card during initial load.

## 10. Acceptance criteria
- Pulse animation by default; static under reduced-motion.
- Variants render the right shape.
- Screen-reader announces "Loading…".
- Theme-aware.