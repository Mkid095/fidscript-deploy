# Component Spec — `ErrorState`

> The canonical error UI for a failed load or failed action. Used by every screen.

## 1. Purpose
The user sees what went wrong and how to recover. The principle: **an error is an
invitation — the user knows what to do next.**

## 2. Props
```ts
type ErrorStateProps = {
  title: string;
  description: string;
  /** The retry callback. */
  onRetry?: () => void;
  /** The "go back" callback. */
  onBack?: () => void;
  /** Optional technical detail (collapsed by default). */
  technicalDetail?: string;
  /** Variant. */
  variant?: 'error' | 'warning' | 'info';
};
```

## 3. Visual anatomy
```
┌────────────────────────────────────────────────────────────┐
│                  ⚠                                         │
│            Couldn't load deployments                       │
│                                                            │
│  We hit a network error. Check your connection and         │
│  try again.                                                │
│                                                            │
│  ▼ Technical detail                                        │
│                                                            │
│                          [Back]  [ Retry ]                 │
└────────────────────────────────────────────────────────────┘
```

## 4. States
- **Idle**: full error; title + description + actions.
- **Retrying**: spinner on the Retry button.
- **With technical detail**: collapsed by default; click to expand.
- **Empty**: not applicable.

## 5. Variants
- **error** (default): red icon.
- **warning**: yellow icon.
- **info**: blue icon.

## 6. Interactions
- **Click Retry**: triggers `onRetry`.
- **Click Back**: triggers `onBack`.
- **Click Technical detail**: expands.

## 7. Accessibility
- **Role**: `role="alert"` for the headline; `aria-live="assertive"` for the
  description.
- **Actions**: standard button semantics.

## 8. Telemetry / events
- `error_state.retry_clicked` → `{ id }`.

## 9. Cross-references
- **Screens**: every screen's error path.

## 10. Acceptance criteria
- Title + description + actions render.
- Retry + Back buttons work.
- Technical detail is collapsed by default; click to expand.
- Variant drives the icon color.
- Screen-reader announcements are correct.
- Theme-aware.