# Phase 11: Queues Platform

> **Status:** Planned  |  **Track:** Data/Compute  |  **Depends on:** Phase 02, Phase 04

## Objective

A real message broker: **publish → autonomous server-side consume → ack**, with a visibility-timeout lease, retry/dead-letter, and scheduled delivery. Today the queue is a Prisma table polled only by clients — messages sit `pending` forever, and a consumer crash silently loses in-flight messages.

## Current State

**PARTIAL.** See `docs/AUDIT.md` §C (Queues). Specific defects:

- Real REST queue logic + DLQ, but it is a **Prisma table, not a broker**.
- **No NATS** behind it despite the stack running NATS.
- **No worker** — messages wait until a client polls; nothing consumes them.
- **No visibility timeout** → a consumer that crashes mid-process loses the message.

## Dependencies

- **Phase 02** (NATS JetStream is the broker; the `EVENTS` stream + connection already exist).
- **Phase 04** (Project scoping; queues belong to a project).

## Deliverables

- [ ] **Real broker backing.** Back queues on **NATS JetStream** (the connection from Phase 02). A shared `queues.>` stream (or per-queue stream) with **durable consumers** providing pull-based delivery, ack, and redelivery.
- [ ] **Server-side workers.** The platform runs consumers that autonomously pull and process messages — not client polling. A worker service subscribes to a queue and dispatches (to a function, an HTTP target, or an internal handler).
- [ ] **Visibility timeout / lease.** An in-flight message is invisible to other consumers for `ackWait` seconds; if not acked, JetStream redelivers it. This fixes the crash-loss defect.
- [ ] **Ack/nack + retry policy.** Explicit ack (success), term/nack (requeue or DLQ), `maxDeliver` cap, and a **dead-letter queue** for poison messages.
- [ ] **At-least-once + idempotency.** Document at-least-once semantics; consumers must be idempotent (guidance + a dedupe-key option).
- [ ] **Scheduled / delayed delivery.** Publish with a `deliverAt`/`delaySeconds` (JetStream delayed delivery or a scheduled re-publish).
- [ ] **Pub/sub + worker model.** SDK can publish; platform workers **and user functions (Phase 10)** can subscribe. Fan-out (multiple subscribers) supported.
- [ ] **Reconcile the table.** Keep a DB record for metadata/audit/stats, but the source of truth for delivery is JetStream. Replace the table-as-broker logic, don't keep both.

## Technical Design

- **JetStream mapping:** `createQueue(name)` → ensure a durable consumer on the `queues.>` stream filtered by subject `queues.<projectId>.<queueName>` (or a dedicated stream). `publish` → `js.publish('queues.<...>', payload, { headers })`. The worker uses `consumer.fetch()` / `pull` with explicit ack.
- **Visibility timeout = `ackWait`** on the consumer; **max redeliveries = `maxDeliver`**, after which the message is moved (by the worker) to a DLQ subject/consumer.
- **Worker dispatch:** a queue can target `{ type: 'function', id }` (Phase 10), `{ type:'http', url }` (Phase 06), or `{ type:'internal' }`. The worker reads the message, invokes the target, acks on success, nacks on failure.
- **Delayed delivery:** JetStream's native delayed delivery (`DeliverSubject`/`-delay`) where supported, else a scheduled re-publish via Phase 12.

## Integration Points

- **Events emitted:** `queues.message.published/acknowledged/redelivered/dead_lettered`. Consumed by audit (02).
- **Events consumed:** none required (it *is* the work pipeline), but inbound email (09) and deployments (06) can publish work.
- **Service registry:** registers `queues`.
- **SDK (16):** `queues.publish`, `queues.subscribe` (long-poll or push webhook), `queues.stats`.
- **CLI (18):** `fidscript queue push/consume`.
- **Dashboard (19):** queues list, depth, DLQ browser, requeue.
- **Consumers:** Functions (10) as subscribers; Scheduler (12) can enqueue; workers are the platform-side runtime.

## Verification (VPS)

```bash
# Publish → auto-consume → ack:
curl -fsS -X POST .../api/v1/projects/$PID/queues -d '{"name":"jobs"}'
curl -fsS -X POST .../queues/jobs/messages -d '{"payload":{"x":1}, "target":{"type":"function","id":"<FID>"}}'
# the worker autonomously invokes the function; queue depth returns to 0:
curl -fsS .../queues/jobs/stats   # depth 0, acked=1

# Crash-loss prove-it: a target that always fails for N attempts:
# - in-flight message invisible to others during ackWait
# - redelivered after ackWait
# - after maxDeliver → lands in the DLQ

# Confirm it's JetStream, not a DB poll:
docker compose exec nats nats consumer info QUEUES ...   # consumer exists, delivers/acks counted
```

**Exit criterion:** a published message is consumed by a server-side worker and acked without any client polling; a crashed consumer's message is redelivered after the visibility timeout; poison messages reach the DLQ after `maxDeliver`. Delivery is JetStream-backed, not a Prisma table.

## Out of Scope / Future

- Exactly-once delivery (at-least-once + idempotency now; exactly-once is a future ADR with transactional outbox).
- FIFO ordering guarantees across shards / global ordering (future).
- Streaming/long-lived consumer connections via NATS (Phases 13/16 can layer this).

## Risks

- Mixing the old table-broker with JetStream → pick one source of truth (JetStream) and demote the table to metadata; otherwise messages double-process.
- Idempotency is the consumer's responsibility — if ignored, redelivery causes duplicate side effects. Make the dedupe-key prominent in the SDK.

## Files you'll touch (precision map)

- Stub lives at: `apps/api/src/modules/queues/queues.service.ts` (a Prisma-table "broker" with DLQ logic — **no NATS, no worker, no visibility timeout**; messages sit `pending`).
- Prisma: `Queue`, `QueueMessage` (keep for metadata/audit; JetStream becomes source of truth).
- Reback on: NATS JetStream from Phase 02 (`queues.>` stream + durable consumers with `ackWait`); create a worker service that autonomously consumes + dispatches to functions (Phase 10) / HTTP (Phase 06).

## Next Phase

[Phase 12: Scheduler Platform](./phase-12.md)
