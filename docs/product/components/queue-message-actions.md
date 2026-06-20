# Component Spec — `QueueMessageActions`

> Inline Ack / Retry / Dead-letter actions for the Queue detail → Messages tab. Per-row
> kebab + bulk actions.

## 1. Purpose
The user intervenes on stuck messages. The principle: **a stuck message is a click away
from a fix.**

## 2. Props
```ts
type QueueMessageActionsProps = {
  message: QueueMessage;
  /** Per-action callbacks. */
  onAck: (messageIds: string[]) => void;
  onRetry: (messageIds: string[]) => void;
  onDeadLetter: (messageIds: string[]) => void;
  /** Selection state (for bulk actions). */
  selected?: boolean;
  onSelect?: (selected: boolean) => void;
};
```

## 3. Visual anatomy
```
☑ msg-abc123  ● pending   attempt 1   body: {"to":"a@b.c"...}   [⋮]
                                                        └─ Ack
                                                        └─ Retry
                                                        └─ Dead-letter
```

## 4. States
- **Idle**: kebab hidden until hover.
- **Hover**: kebab visible.
- **Selected**: checkbox checked; bulk action bar appears at the bottom.
- **Per-action loading**: spinner on the action button.
- **Error**: toast on failure.

## 5. Variants
- **Single**: per-row kebab.
- **Bulk**: when ≥1 row is selected, a bar at the bottom shows "Ack 3 · Retry 3 · Dead-letter 3".

## 6. Interactions
- **Click kebab**: open menu.
- **Click action**: confirm dialog + POST.
- **Click checkbox**: toggle selection.

## 7. Accessibility
- **Kebab**: `aria-haspopup="menu"`, `aria-expanded`.
- **Menu**: `role="menu"`; each item `role="menuitem"`.
- **Checkbox**: standard `aria-checked`.

## 8. Telemetry / events
- `queue_message_actions.ack_clicked` → `{ messageId, count }`.
- `queue_message_actions.retry_clicked` → `{ messageId, count }`.
- `queue_message_actions.dead_letter_clicked` → `{ messageId, count }`.

## 9. Cross-references
- **Screens**: Queue detail → Messages.

## 10. Acceptance criteria
- Kebab opens with Ack / Retry / Dead-letter.
- Each action opens a confirm dialog.
- Bulk actions work on selected rows.
- Loading + error states are clear.
- Theme-aware.