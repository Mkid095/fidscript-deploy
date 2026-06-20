# Service: Queues

Durable background queues with retries, dead-lettering, and an autonomous server-side worker that
survives restarts.

## 1. Purpose
Background work that must not be lost — webhook fan-out, batch processing, image transforms — with
visibility timeouts and DLQ semantics out of the box.

## 2. Screens
- **Queues** (sidebar §7): list of queues with depth/pending/delivered stats.
- **Queue detail**: tabs *Messages / Stats / Config*. The Messages tab is the live tail of the
  queue (acknowledge / retry / dead-letter inline).

## 3. Data model
- `Queue` — id, projectId, name, type (`stream|queue|workqueue`), retentionDays, maxMessages,
  maxBytes, replicas, retryAttempts, retryDelaySeconds, deadLetterQueue, status (`active|inactive`).
- `QueueMessage` — id, queueId, body, headers, attempts, status (`pending|delivered|acknowledged|
  failed|dead_lettered`), jsSeq (JetStream sequence; stashed in `errorMessage` as `js_seq:<n>`),
  scheduledAt, deliveredAt, acknowledgedAt.

## 4. API mapping
- CRUD: `QUEUE-01..05`. Stats: `QUEUE-06`. Publish (single + batch): `QUEUE-07/08`. Consume (manual
  pull): `QUEUE-09`. Acknowledge / retry / dead-letter: `QUEUE-10..12`. List messages:
  `QUEUE-13`.

## 5. Realtime events
`queues.{created,deleted,consumer.setup.degraded}` (provider degraded mode),
`queues.message.{published,acknowledged,retried,dead_lettered,publish.degraded}`,
`queues.function.dispatch` (when target = `function`).

## 6. Settings
- **Create:** name, type (presets: stream, queue, workqueue — choose the right one; UI explains),
  retentionDays, maxMessages, maxBytes, replicas, retryAttempts, retryDelaySeconds, deadLetterQueue.
- **Worker config:** target type (`http|function|internal`) + the target reference (endpoint URL,
  function id, or "internal log only"). Not directly mutable in this audit — re-create to change.

## 7. Automation
- **Autonomous server-side worker** starts on app boot (`QueueWorkerService.start(nc)`); every
  active queue gets a pull-loop. **Survives restart** (`bootAllQueues` re-registers). Poison
  tracking → after `maxDeliver`, move to DLQ.
- **Delayed publish** via the `Nats-Delay` header (`delaySeconds`).
- **DLQ auto-create** on first dead-letter (`<queueName>_dlq`); messages copied with
  `x-original-queue` / `x-dlq-reason` headers.
- **Graceful degradation:** if NATS is down, publish + consume still work via Prisma only; the UI
  shows a "degraded" badge + the events `*.degraded` fire.

## 8. Dependencies
- **Hard:** NATS JetStream container (`nats`), Redis (for distributed locks on consumer
  coordination).
- **Backend gaps** (from the audit):
  - `jsSeq` is stashed in `errorMessage` (workaround). UI should not rely on that field.
  - Worker config (target) is not editable — would require a `PATCH /queues/:id` field.
  - Prisma is the audit/UI trail even though JetStream is the source of truth.

## 9. Phase
**F10 (Realtime/Queues/Scheduler UI)** — pending spec.
