# Component Spec — `RealtimePresenceList`

> Avatar + status list for the Realtime channel detail → Presence tab.

## 1. Purpose
The user sees who's online. The principle: **presence is a constant — the list updates
without the user refreshing.**

## 2. Props
```ts
type RealtimePresenceListProps = {
  /** The current presence rows. */
  presence: Array<{
    userId: string;
    status: 'online' | 'away' | 'busy' | 'offline';
    updatedAt: string;
  }>;
  /** The current user's ID (highlighted). */
  currentUserId: string;
  /** The set-my-status callback. */
  onSetMyStatus: (status: 'online' | 'away' | 'busy' | 'offline') => void;
};
```

## 3. Visual anatomy
```
┌────────────────────────────────────────────────────────────┐
│ 👤 Kennedy      ● online     2m ago          [you]         │
│ 👤 8a3f...      ◐ away       1m ago                       │
│ 👤 2b1c...      ● busy       30s ago                      │
│                                                            │
│ Set my status: [online ▼]                                  │
└────────────────────────────────────────────────────────────┘
```

## 4. States (per row)
- **online**: green dot; "online" label.
- **away**: yellow dot; "away" label.
- **busy**: red dot; "busy" label.
- **offline**: gray dot; "offline" label.
- **Current user**: row highlighted; status select is inline.

## 5. Variants
- **Density**: comfortable (default); compact.

## 6. Interactions
- **Click status select** (current user): change status.
- **Realtime updates**: presence changes animate in.

## 7. Accessibility
- **List**: `role="list"`; each row `role="listitem"`.
- **Status select**: `role="combobox"`.
- **Live region**: `aria-live="polite"`; "New presence" announced.

## 8. Telemetry / events
- `realtime_presence_list.status_changed` → `{ status }`.

## 9. Cross-references
- **Screens**: Realtime channel detail → Presence.

## 10. Acceptance criteria
- Renders presence rows.
- Current user's row is highlighted.
- Set my status works.
- Realtime updates animate in.
- Live region announces changes.
- Theme-aware.