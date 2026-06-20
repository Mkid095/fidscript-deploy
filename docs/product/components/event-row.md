# Component Spec — `EventRow`

> Per-event row in the project activity feed. Timestamp · event-type pill · summary ·
> actor · expandable metadata.

## 1. Purpose
The user sees one event in the activity feed at a glance. The principle: **every event
is a story; the row is the headline.**

## 2. Props
```ts
type EventRowProps = {
  event: PlatformEvent;
};
```

## 3. Visual anatomy
```
┌────────────────────────────────────────────────────────────────────┐
│ Just now                                                          ●│
│ [deployments]  deploy-abc123 succeeded                            │
│               by Kennedy · image fidscript/my-app:2026-abc123    │
└────────────────────────────────────────────────────────────────────┘
   ↑ click row → expand metadata (JSON)
```

## 4. States
- **Idle**: full row collapsed.
- **Hover**: subtle background highlight.
- **Expanded**: metadata JSON is visible below the summary.
- **New** (realtime): brief highlight pulse (3s).
- **Loading**: skeleton.

## 5. Variants
- **Density**: comfortable.
- **Theme**: dark/light.

## 6. Interactions
- **Click row** → expand metadata.
- **Click summary** → navigate to the resource (deployment, function, etc.).

## 7. Accessibility
- **Row**: `role="article"`.
- **Timestamp**: `<time>` element with `datetime` attribute.
- **Live region**: `aria-live="polite"`; "New event" announced on realtime.

## 8. Telemetry / events
- `event_row.clicked` → `{ userId, eventId, type }`.
- `event_row.resource_clicked` → `{ userId, eventId, resourceId }`.

## 9. Cross-references
- **Screens**: Project Activity, NotificationBell dropdown.

## 10. Acceptance criteria
- Renders timestamp + event-type pill + summary + actor.
- Click expands metadata; click summary navigates.
- Realtime updates pulse briefly.
- Live region announces new events.
- Keyboard navigation works.