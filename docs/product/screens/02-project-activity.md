# Screen Spec — `Project Activity`

> Per-project activity feed at `/dashboard/projects/:id/activity`. A reverse-chronological
> stream of every event for the project, realtime-subscribed.

## 1. Purpose
The user sees every meaningful event for the project — deployments, function invocations,
queue messages, cron runs, settings changes — in one reverse-chronological stream. The
principle: **the project's history is a stream, not a list of reports.**

## 2. Route + access
- **Route:** `/dashboard/projects/:id/activity`.
- **Sidebar/header:** not in the sidebar (per F05 §6, the 14 sidebar items don't include
  Activity — it's reached via the header notifications bell, the ⌘K palette, or the URL
  directly).
- **Permission:** `O/A/D/V` — every member can see the activity feed.
- **Project scope:** events for the project only.

## 3. Layout
```
┌─────────────────────────────────────────────────────────────────┐
│ Project › my-app › Activity                                     │
├─────────────────────────────────────────────────────────────────┤
│ Filter: [All] [Deployments] [Functions] [Queues] [Cron] [Set..]│
├─────────────────────────────────────────────────────────────────┤
│ Just now                                                      ●│
│  Deployments › deploy-abc123 succeeded                          │
│  by Kennedy · image fidscript/my-app:2026-abc123                 │
├─────────────────────────────────────────────────────────────────┤
│ 2m ago                                                         │
│  Functions › fn-handler invoked (234ms, 18MB)                   │
│  by 8a3f... (anonymous user)                                    │
├─────────────────────────────────────────────────────────────────┤
│ 5m ago                                                         │
│  Settings › Environment: DATABASE_URL rotated                   │
│  by Kennedy                                                     │
├─────────────────────────────────────────────────────────────────┤
│ ...                                                              │
│                                                                 │
│                              [ Load more ]                      │
└─────────────────────────────────────────────────────────────────┘
```

## 4. Sections + states
- **Filter bar**:
  - *Idle*: 6 chips (All, Deployments, Functions, Queues, Cron, Settings). Default: All.
  - *Active*: selected chip has fire-red background.
  - *Click*: filters the list client-side (the underlying events are already fetched).
- **Event rows**:
  - *Idle (no events)*: empty state "No activity yet — deploy something or invite a teammate."
  - *Live*: the WS gateway pushes new events; the new row animates in at the top with a
    subtle "new" indicator that fades after 3s.
  - *Historical*: rows are paginated; "Load more" at the bottom.
  - *Loading (initial)*: 10 skeleton rows.
  - *Error*: top-of-page error state with "Retry" button.
- **Each row**:
  - **Timestamp** — relative (e.g. "Just now", "2m ago"); tooltip with the absolute time.
  - **Event type pill** — `deployments` / `functions` / `queues` / `cron` / `settings` / etc.
    Color-coded by category.
  - **One-line summary** — human-readable: "Deployments › deploy-abc123 succeeded".
  - **Actor** — name (or "system" / "anonymous user" for non-user events).
  - **Resource link** — click the summary → navigate to the resource (deployment detail,
    function detail, etc.).
  - **Metadata (collapsible)** — click the row → expands to show the event's metadata JSON
    (e.g. the build duration, the channel target, the env var name).

## 5. Primary + secondary actions
- **Primary**: scroll back in time (default behavior).
- **Secondary** (top-right):
  - "Filter by type" — opens the filter chips if collapsed.
  - "Subscribe to RSS" — P1 follow-up (gives the user a feed for external monitoring).
- **Per-row**: click → expand metadata; click the summary → navigate.

## 6. API mapping
- **List events** — `GET /api/v1/projects/:id/events?limit=50&cursor=…` (new endpoint, F05 §14
  backend prereq; or derive from `platform.events` rows). Returns `{ events, nextCursor }`.
- **Realtime** — `WS /realtime?room=project:<id>` — the shell subscribes once on mount;
  this screen consumes events from the same subscription.
- **Filter** — client-side; the underlying data is already loaded.

## 7. Forms + validation
- No forms. The screen is read-only.

## 8. Accessibility
- **Focus order**: filter chips → event rows (each row is focusable) → Load more.
- **Live region**: `aria-live="polite"` on the activity list; new events announced to
  screen readers ("New activity: deploy-abc123 succeeded").
- **Row semantics**: each row is `role="article"`; the timestamp is `time` element with
  `datetime` attribute.
- **Color is not the only carrier**: each event type has a label + a category icon (not just
  a color).

## 9. Cross-references
- **Phase**: F04 §6 (activity feed mentioned in F04); F05 §6 (shell events).
- **Service spec**: every per-service spec (the activity is a cross-cutting view).
- **Journey**: every persona's "what happened?" question.
- **Navigation**: ⌘K → "Go to Activity"; notifications bell → click an event.
- **Related screens**: the notification bell, every per-service detail screen.

## 10. Acceptance criteria
1. The activity feed opens at `/dashboard/projects/:id/activity`; the filter chips are at
   the top; the events are reverse-chronological.
2. New events arrive via WS and animate in at the top with a brief "new" indicator.
3. Clicking an event's summary navigates to the resource (deployment detail, function
   detail, etc.).
4. Clicking an event's row expands the metadata JSON.
5. The filter chips filter client-side; the active chip is highlighted.
6. "Load more" paginates backward in time.
7. The empty state is "No activity yet — deploy something or invite a teammate."
8. Live region announces new events to screen readers.
9. Each event type has a label + icon (not just a color).
10. The feed is realtime-synchronized: opening the feed on two devices shows the same
    events at the same time.
