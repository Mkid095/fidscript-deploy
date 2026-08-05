# Queues Components

UI for queue list and queue detail: stats, messages, modals, realtime updates.

## Sub-areas

### List
| File | Purpose |
|------|---------|
| `queues-list.tsx` | Container — renders stats header + grid of cards. |
| `queues-list-header.tsx` | Title + create button. |
| `queues-explanation-banner.tsx` | Explainer shown above the list. |
| `queues-list-handlers.ts` | `useQueuesListHandlers` — load / create / delete via SDK. |
| `queue-card.tsx` | One queue card with stats. |
| `queues-create-modal.tsx` | New-queue modal. |
| `queues-delete-confirmation.tsx` | Delete-confirm modal. |

### Detail
| File | Purpose |
|------|---------|
| `queue-detail.tsx` | Container. |
| `queue-detail-header.tsx` | Title + actions toolbar. |
| `queue-detail-actions-toolbar.tsx` | Toolbar (consume / ack / retry / purge). |
| `queue-detail-stats-bar.tsx` | Pending / delivered / dead-lettered counts. |
| `queue-detail-loading.tsx` | Skeleton state. |
| `queue-detail-not-found.tsx` | 404-ish empty state. |
| `queue-detail-modals.tsx` | Mounts create + delete modals. |
| `queue-detail-modal-create.tsx` | Per-detail create flow. |
| `queue-detail-modal-delete.tsx` | Per-detail delete flow. |
| `queue-detail-handlers.ts` | `useQueueDetailHandlers` — tab change / consume / ack / retry / selection. |
| `queue-messages-table.tsx` | Tabular messages with multi-select. |

### Modals (standalone)
| File | Purpose |
|------|---------|
| `publish-message-modal.tsx` | Publish a message to the queue. |
| `purge-queue-modal.tsx` | Purge messages by tab/status. |

### Realtime
| File | Purpose |
|------|---------|
| `use-queues-realtime.ts` | Subscribes to `queues.*` events. Exposes `Queue`, `QueueStats`, `QueueMessage`, `MessageTab`. |

## Conventions
- Business logic in `*-handlers.ts` (action callbacks) and `use-queues-realtime.ts` (event subscription).
- List vs detail modals are split to keep file sizes ≤ 150 lines.
- All modals expose `onClose`; parent owns visibility.

## Files
- 21 files (all under `src/components/queues/`)