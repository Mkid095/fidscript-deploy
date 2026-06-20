# Screen Spec — `QueueDetail`

> Per-queue detail at `/dashboard/projects/:id/queues/:q` (F10). The operator's console for
> one queue: messages, stats, config.

## 1. Purpose
The user watches a queue's traffic, intervenes on stuck messages, and tunes the config. The
principle: **a queue is a stream of work; the UI shows the in-flight state and lets the
user intervene per row.**

## 2. Route + access
- **Route:** `/dashboard/projects/:id/queues/:q`.
- **Permission:** any member (`O/A/D/V`); viewer greys the kebab actions.
- **Project scope:** the queue belongs to the current project.

## 3. Layout
```
┌──────────────────────────────────────────────────────────────────────┐
│ Project › my-app › Queues › email-outbound                           │
├──────────────────────────────────────────────────────────────────────┤
│ email-outbound  [Stream] [● active]  3 pending · 0 failed · 0 DLQ    │
│ [Publish test message]                                                │
├──────────────────────────────────────────────────────────────────────┤
│ [Messages] [Stats] [Config]                                          │
├──────────────────────────────────────────────────────────────────────┤
│ Status: [● Pending] [○ Delivered] [○ Acked] [○ Failed] [○ Dead-letter]│
├──────────────────────────────────────────────────────────────────────┤
│ ☐  msg-abc123  ● pending   attempt 1   body: {"to":"a@b.c"...}   [⋮]│
│ ☐  msg-def456  ● delivered attempt 1   body: {"to":"d@e.f"...}   [⋮]│
│ ☐  msg-ghi789  ● failed    attempt 3   err: connection refused   [⋮]│
│                                                                      │
│ [Ack] [Retry] [Dead-letter]                                          │
└──────────────────────────────────────────────────────────────────────┘
```

## 4. Sections + states
- **Header strip**: queue name, type pill, status badge, stats summary (pending, failed,
  DLQ), "Publish test message" inline.
- **Tabs**:
  - **Messages** (default): live tail of `QueueMessage` by status.
  - **Stats**: 7 stat cards + sparklines for depth + failed.
  - **Config**: editable fields; Danger Zone.
- **Messages tab**:
  - **Filter**: status (pending | delivered | acknowledged | failed | deadLettered);
    default pending + delivered.
  - **List**: per-row: id, status badge, body (truncated), attempts, scheduledAt,
    deliveredAt, acknowledgedAt, errorMessage, kebab.
  - **Selection**: checkboxes; bulk actions (Ack / Retry / Dead-letter).
  - **Per-row actions** (kebab): Ack, Retry, Dead-letter (each with confirm).
  - **Live tail**: auto-scrolls; pauseable; "Jump to latest" button.
- **Stats tab**:
  - **7 cards**: jsDepth, pending, delivered, acknowledged, failed, deadLettered, total.
  - **Sparklines**: depth + failed (last 1h).
  - **Polled** every 10s (until realtime stats event is added).
- **Config tab**:
  - Editable: retentionDays, maxMessages, maxBytes, retryAttempts, retryDelaySeconds,
    deadLetterQueue.
  - "Delete queue" in Danger Zone; type-to-confirm.

## 5. Primary + secondary actions
- **Primary (per tab)**:
  - *Messages*: bulk Ack / Retry / Dead-letter.
  - *Config*: "Save" (optimistic PATCH QUEUE-04).
- **Secondary**:
  - "Publish test message" (inline, top of Messages tab).
  - Per-row: Ack / Retry / Dead-letter (kebab).

## 6. API mapping
- **Get queue** — `GET /api/v1/queues/:queueId` (`QUEUE-03`).
- **List messages** — `GET /api/v1/queues/:queueId/messages?status=&limit=&cursor=` (`QUEUE-13`).
- **Stats** — `GET /api/v1/queues/:queueId/stats` (`QUEUE-06`); polled every 10s.
- **Publish** — `POST /api/v1/queues/:queueId/messages` (`QUEUE-07`).
- **Ack** — `POST /api/v1/queues/:queueId/ack` (`QUEUE-10`).
- **Retry** — `POST /api/v1/queues/:queueId/retry` (`QUEUE-11`).
- **Dead-letter** — `POST /api/v1/queues/:queueId/dead-letter` (`QUEUE-12`).
- **Update** — `PATCH /api/v1/queues/:queueId` (`QUEUE-04`).
- **Delete** — `DELETE /api/v1/queues/:queueId` (`QUEUE-05`).
- **Realtime** — `queues.message.published`, `queues.message.acknowledged`,
  `queues.message.retried`, `queues.message.dead_lettered`.

## 7. Forms + validation
- **Publish test**: body (textarea), delaySeconds (slider 0–300).
- **Bulk actions**: confirm dialog with the count.
- **Config**: per F10 §6.
- **Delete**: type-to-confirm with the queue name.

## 8. Accessibility
- **Focus order**: header → tabs → filter → messages → actions.
- **Status filter**: `role="tablist"` with `role="tab"` per status.
- **Selection**: `aria-selected` on selected rows; the bulk-actions bar appears when ≥1
  row is selected.
- **Live region**: `aria-live="polite"` on the messages list; "New message" announced.

## 9. Cross-references
- **Phase**: F10 Queues UI §6.
- **Service spec**: `docs/product/services/queues.md`.
- **Journey**: backend dev's "why is this stuck?" flow.
- **Navigation**: Queues list → click a queue.
- **Related screens**: New queue modal (sibling), Logs (filtered to queue:<id>).

## 10. Acceptance criteria
1. The detail page opens at `/dashboard/projects/:id/queues/:q`; the **Messages** tab is
   preselected.
2. The status filter is a 5-chip group; default is pending + delivered.
3. Per-row kebab has Ack / Retry / Dead-letter; each opens a confirm dialog.
4. Bulk actions (Ack / Retry / Dead-letter) work on selected rows; the count is in the
   confirm dialog.
5. "Publish test message" opens a dialog with body + delaySeconds; POSTs `QUEUE-07`;
   the row appears in pending.
6. The Stats tab shows 7 stat cards + sparklines for depth + failed.
7. The Config tab is editable; "Delete queue" in Danger Zone (type-to-confirm).
8. The messages list is realtime-synchronized via `queues.message.*` events.
9. Live tail is pauseable; "Jump to latest" button when scrolled away.
10. The 10s stats polling is documented as a backend gap; the UI is built to consume
    realtime stats when the event lands.
