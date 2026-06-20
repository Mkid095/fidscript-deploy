# Component Spec — `NotificationBell`

> The bell icon + unread count + dropdown of the last 20 events for the current project.

## 1. Purpose
The user sees what's happened in the project at a glance. The principle: **the bell is a
constant nudge; the dropdown is the log.**

## 2. Props
```ts
type NotificationBellProps = {
  /** The current project ID (filters the events). */
  projectId: string;
  /** Initial unread count (from realtime subscription). */
  unreadCount: number;
};
```

## 3. Visual anatomy
```
       🔔 3       ← badge with count
       ─────
       Last 20 events
       ─────
       2m ago  deploy-abc123 succeeded
              by Kennedy · image fidscript/my-app:2026-...
       ─────
       5m ago  fn-handler invoked
              ...
       ─────
       See all → /dashboard/projects/:id/activity
```

## 4. States
- **Idle**: bell + grey dot (or hidden if 0).
- **Unread**: red badge with count.
- **Dropdown open**: list of last 20 events; click → navigate.
- **Empty** (no events): "No recent activity."
- **Loading**: skeleton (3 rows).
- **Error**: "Couldn't load events. [Retry]"

## 5. Variants
- **Density**: comfortable.
- **Theme**: dark (default), light.

## 6. Interactions
- **Click bell** → open dropdown; clears the unread badge.
- **Click event** → navigate to the resource (and close the dropdown).
- **"See all"** → navigate to `/dashboard/projects/:id/activity`.
- **Keyboard**: Tab through events; Enter activates; Esc closes.

## 7. Accessibility
- **Button**: `aria-haspopup="menu"`, `aria-expanded`.
- **Badge**: `aria-label="<count> unread notifications"`.
- **Menu**: `role="menu"`; each item `role="menuitem"`.
- **Live region**: `aria-live="polite"` on the count badge — announces new events.

## 8. Telemetry / events
- `notification_bell.opened` → `{ userId, projectId }`.
- `notification_bell.event_clicked` → `{ userId, eventId, type }`.
- `notification_bell.see_all_clicked` → `{ userId }`.

## 9. Cross-references
- **Screens**: every authenticated screen.
- **Service**: `docs/product/services/projects.md` (the project activity feed).
- **Journey**: every persona's "what happened?" flow.

## 10. Acceptance criteria
- The bell renders in the header; the unread count shows when >0.
- Click opens a dropdown with the last 20 events.
- Click an event navigates to the resource.
- "See all" navigates to the activity feed.
- Realtime events update the count live.
- Live region announces new events.
- Keyboard navigation works.