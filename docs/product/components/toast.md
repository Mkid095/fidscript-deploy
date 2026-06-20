# Component: Toast

Transient confirmation or error of a single action. The "yes, it worked" or "no, here's why" of the
operator's console.

## 1. Purpose
Confirm a mutation succeeded (success) or surface an error with a recovery action. Stacked,
auto-dismiss, non-blocking. **Never** the carrier of long-lived state.

## 2. Props
| Prop | Type | Default | Notes |
|---|---|---|---|
| `variant` | `'success' \| 'error' \| 'info' \| 'warn'` | `'success'` | color + icon |
| `title` | `string` | — | one short line (≤ 60 chars) |
| `description` | `string` | — | one line of context (optional) |
| `action` | `{ label: string; onClick: () => void }` | — | e.g. "Undo", "View", "Copy" |
| `duration` | `number` | 4000 (success) / 0 (error — sticky) | ms; 0 = sticky until dismissed |
| `errorId` | `string` | — | for error toasts; surfaces in the "Copy error ID" action |
| `dismissible` | `boolean` | `true` | × button |

## 3. Visual anatomy
```
┌──────────────────────────────────────────────────────────────┐
│  ✓  Deployment succeeded                          [View]  ×  │
│     my-app v3 → https://my-app.apps.example.com             │
└──────────────────────────────────────────────────────────────┘
```

## 4. States
| State | Visual | Behavior |
|---|---|---|
| Enter | slide-up + fade-in 200ms | `prefers-reduced-motion`: instant |
| Idle | — | auto-dismiss after `duration`; pause on hover |
| With action | `[View]` etc. rendered | click → action + dismiss |
| Error (sticky) | red border; no auto-dismiss; × required | persists until × or until the page is left |
| Stacking | max 4 visible, older ones collapse to "+ N more" | click → expand |
| Dismissing | fade-out 150ms | — |

## 5. Variants
- **success** — green check, auto-dismiss 4s.
- **error** — red ×, sticky, has `errorId` + "Copy error ID" action.
- **info** — blue info, 4s.
- **warn** — amber, 6s.

## 6. Interactions
Click action → run + dismiss. Click × → dismiss. Hover pauses the dismiss timer. Tab moves
focus to the action (if any) and to ×.

## 7. Accessibility
`role="status"` (success) or `role="alert"` (error). `aria-live="polite"` (success/info) /
`aria-live="assertive"` (error). The action is a real `<button>`. The × is a real `<button aria-label="Dismiss">`.

## 8. Telemetry
Every toast `shown` → `*.toast.shown`; `dismissed` (after duration or ×) and `action_clicked`.

## 9. Cross-references
Emitted by every mutation handler (create/update/delete/deploy/rotate). Optimistic UI reconciles
into either a success or error toast.

## 10. Acceptance
Success auto-dismisses 4s; error stays until ×. Reduced-motion = no slide. Tab order is sane. Error
toast never disappears silently (always ×). "Copy error ID" actually copies.
