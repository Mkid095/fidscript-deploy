# Screen Spec — `NewQueueModal`

> Modal overlay on `/dashboard/projects/:id/queues` (F10). Triggered by the "Create queue"
> CTA.

## 1. Purpose
The user creates a durable queue — picks a type, sets retention + retries, and ships. The
principle: **a queue is one form; the server starts the worker automatically.**

## 2. Route + access
- **Route:** overlay on `/dashboard/projects/:id/queues`.
- **Permission:** any member (`O/A/D/V`); viewer greys.
- **Project scope:** creates a `Queue` row + server-side worker.

## 3. Layout
```
┌──────────────────────────────────────────────────────────────────────┐
│ New queue                                                        [X] │
├──────────────────────────────────────────────────────────────────────┤
│ Name *                                                              │
│ ┌──────────────────────────────────────────────────────────────────┐│
│ │ email-outbound                                                   ││
│ └──────────────────────────────────────────────────────────────────┘│
│                                                                      │
│ Type                                                                 │
│ ┌──────────────────────┐  ┌──────────────────────┐                  │
│ │ ● Stream (default)   │  │ ○ Queue              │                  │
│ │   Pub/sub + replay   │  │   Classic work queue │                  │
│ └──────────────────────┘  └──────────────────────┘                  │
│ ┌──────────────────────┐                                            │
│ │ ○ Workqueue          │                                            │
│ │   Auto-ack           │                                            │
│ └──────────────────────┘                                            │
│                                                                      │
│ ▼ Advanced                                                           │
│   Retention:        [────●────] 7 days                               │
│   Max messages:     [ 100,000 ]                                      │
│   Max bytes:        [ 1 GB ▼ ]                                       │
│   Replicas:         [ 1 ▼ ]                                          │
│   Retry attempts:   [──●────] 3                                     │
│   Retry delay:      [ 60s ▼ ]                                        │
│   Dead-letter queue: [None ▼]                                        │
│                                                                      │
│                                [Cancel]  [ Create queue ]            │
└──────────────────────────────────────────────────────────────────────┘
```

## 4. Sections + states
- **Name**: required, slug-style, unique per project.
- **Type**: 3 radio cards (Stream | Queue | Workqueue); default Stream.
- **Advanced**: retention (slider 1–30 days), maxMessages, maxBytes, replicas, retryAttempts
  (1–10), retryDelaySeconds, deadLetterQueue (optional, dropdown of existing queues).
- **Submit**:
  - *Disabled*: name empty/invalid.
  - *Loading*: spinner.
  - *Error*: modal stays open with inline error.

## 5. Primary + secondary actions
- **Primary**: "Create queue" — POST QUEUE-01.
- **Secondary**: "Cancel" / `[X]`.

## 6. API mapping
- **Create** — `POST /api/v1/projects/:id/queues` (`QUEUE-01`) with
  `{name, type?, retentionDays?, maxMessages?, maxBytes?, replicas?, retryAttempts?,
  retryDelaySeconds?, deadLetterQueue?}`. Server starts the worker; `queues.created` event
  confirms.

## 7. Forms + validation
- **Name**: required, slug-style, unique per project.
- **Type**: required, enum `stream|queue|workqueue`.
- **Retention**: integer 1–30 days.
- **Max messages**: integer.
- **Max bytes**: integer.
- **Retry attempts**: integer 1–10.
- **Dead-letter queue**: must reference an existing queue in the same project (or null).

## 8. Accessibility
- **Focus order**: name → type → advanced → cancel → create.
- **ARIA**: `role="dialog"`, `aria-modal="true"`, `aria-labelledby` to title.

## 9. Cross-references
- **Phase**: F10 Queues UI §6.
- **Service spec**: `docs/product/services/queues.md`.
- **Journey**: backend dev's first queue.
- **Navigation**: Queues section's "Create queue" CTA; ⌘K.
- **Related screens**: Queue detail (target after create).

## 10. Acceptance criteria
1. The modal opens from the Queues list's "Create queue" CTA.
2. Name is required, slug-style, unique per project.
3. Type is a 3-card radio; default is Stream.
4. Advanced reveals retention, max, replicas, retries, DLQ.
5. Submit is disabled when name is empty/invalid.
6. On submit, the modal closes optimistically; the new card appears with `active` status.
7. On 409 (duplicate name), the modal re-opens with an inline error.
8. Esc / Cancel / [X] close the modal.
