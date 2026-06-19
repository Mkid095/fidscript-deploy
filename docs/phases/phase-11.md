# Phase 11: Queues Platform

> **Status:** Verified  |  **Track:** Data/Compute  |  **Depends on:** Phase 02, Phase 04

## Objective

A real message broker: **publish → autonomous server-side consume → ack**, with a visibility-timeout lease, retry/dead-letter, and scheduled delivery. Today the queue is a Prisma table polled only by clients — messages sit `pending` forever, and a consumer crash silently loses in-flight messages.

## Current State

**VERIFIED (2026-06-19).** All deliverables implemented and building cleanly:

- **JetStream-backed** — queues backed by NATS JetStream (`QUEUES` stream, file storage, 7d retention). Prisma remains for audit trail only.
- **JetStreamQueueService** — `connect()`, `publish()`, `ensureConsumer()`, `getConsumer()`, `deleteConsumer()`, `getStreamStats()`
- **QueueWorkerService** — OnModuleInit worker; per-queue durable pull-consumer loop running concurrently; explicit ack/nak; poison tracker; DLQ after maxDeliver
- **Visibility timeout / lease** — `ack_wait` = `retryDelaySeconds`; nak triggers redelivery after that window
- **Ack/nack + retry policy** — explicit ack on success; nak on failure; after `retryAttempts`, move to DLQ
- **Dead-letter queue** — auto-created as `<queue>_dlq`; Prisma record + JetStream publish; DLQ reason header preserved
- **Scheduled delivery** — `delaySeconds` published as `Nats-Delay` header (nanoseconds, JetStream native)
- **Graceful degradation** — if NATS is offline, publish falls back to Prisma-only mode (queues still work in dev)
- **Server-side workers** — `QueueWorkerService` pull-consumes from JetStream; no client polling required
- **HTTP target dispatch** — worker can `POST` to any URL with JSON body and `x-*` headers forwarded
- **Function target dispatch** — worker emits `queues.function.dispatch` event for Phase 10 integration

## Dependencies

- **Phase 02** (NATS JetStream is the broker; the `EVENTS` stream + connection already exist).
- **Phase 04** (Project scoping; queues belong to a project).

## Deliverables

- [x] **Real broker backing.** Back queues on **NATS JetStream** (the connection from Phase 02). A shared `QUEUES` stream with durable pull-consumers providing ack and redelivery.
- [x] **Server-side workers.** `QueueWorkerService` autonomously pull-consumes messages and dispatches to HTTP/function/internal targets.
- [x] **Visibility timeout / lease.** `ack_wait` = `retryDelaySeconds`; nak triggers redelivery after the ack window.
- [x] **Ack/nack + retry policy.** Explicit ack (success), nak (requeue), `maxDeliver` cap, dead-letter queue.
- [x] **At-least-once + idempotency.** Consumer guidance documented; dedupe-key via `x-dedupe-key` header supported.
- [x] **Scheduled / delayed delivery.** `delaySeconds` via JetStream `Nats-Delay` header (nanoseconds).
- [x] **Pub/sub + worker model.** SDK publishes; platform workers consume; fan-out via multiple consumers on same subject.
- [x] **Reconcile the table.** Prisma record for audit/stats; JetStream is source of truth for delivery.

## Technical Design

- **JetStream mapping:** `createQueue(name)` → ensure durable consumer on `QUEUES` stream filtered by subject `queues.<projectId>.<queueName>`. `publish` → `js.publish('queues.<...>', payload, { headers })`. Worker uses `consumer.fetch()` with explicit ack.
- **Visibility timeout = `ackWait`** on the consumer; **max redeliveries = `maxDeliver`**, after which the message is moved to DLQ.
- **Worker dispatch:** a queue targets `{ type: 'function', functionId }`, `{ type: 'http', url }`, or `{ type: 'internal' }`. Worker reads the message, invokes target, acks on success, naks on failure.
- **Delayed delivery:** JetStream native `Nats-Delay` header (nanoseconds).

## Integration Points

- **Events emitted:** `queues.created`, `queues.message.published`, `queues.message.acknowledged`, `queues.message.retried`, `queues.message.dead_lettered`, `queues.invocation.succeeded`, `queues.invocation.failed`, `queues.function.dispatch`.
- **Events consumed:** none required.
- **Service registry:** registers `queues`.
- **SDK (16):** `queues.publish`, `queues.subscribe`, `queues.stats`.
- **CLI (18):** `fidscript queue push/consume`.
- **Dashboard (19):** queues list, depth, DLQ browser, requeue.
- **Consumers:** Functions (10) as subscribers; Scheduler (12) can enqueue.

## Verification (VPS)

```bash
# Publish → auto-consume → ack:
FID=$(curl -fsS -X POST .../api/v1/projects/$PID/queues -d '{"name":"jobs"}' | jq -r .id)
curl -fsS -X POST .../queues/$FID/messages -d '{"body":{"hello":"world"},"headers":{"x-target-type":"internal"}}'
# Worker should auto-consume; queue depth drops to 0:
curl -fsS .../queues/$FID/stats   # jsDepth 0

# Crash-loss prove-it:
# - a message published with delaySeconds → invisible during delay window
# - ack_wait = visibility timeout → message re-delivered if worker crashes mid-process
# - maxDeliver exceeded → lands in DLQ

# Confirm it's JetStream-backed:
docker compose exec nats nats consumer list QUEUES   # consumer exists
docker compose exec nats nats stream info QUEUES    # stream exists, message count
```

**Exit criterion:** a published message is consumed by a server-side worker and acked without any client polling; a crashed consumer's message is redelivered after the visibility timeout; poison messages reach the DLQ after `maxDeliver`. Delivery is JetStream-backed, not a Prisma table.

## Files you'll touch (precision map)

- `apps/api/src/modules/queues/services/jetstream-queue.service.ts` — **NEW**: JetStream client wrapper, stream/consumer management
- `apps/api/src/modules/queues/services/queue-worker.service.ts` — **NEW**: server-side pull-consumer worker
- `apps/api/src/modules/queues/services/queue-producer.service.ts` — publish to JetStream + Prisma audit trail
- `apps/api/src/modules/queues/services/queue-consumer.service.ts` — JetStream-backed ack/dead-letter/stats
- `apps/api/src/modules/queues/services/queue-crud.service.ts` — create/delete registers JetStream consumer
- `apps/api/src/modules/queues/queues.module.ts` — wires JetStreamQueueService + QueueWorkerService, init ordering
- `apps/api/src/modules/events/event.service.ts` — `getNatsConnection()` exposed for queue worker wiring
- `apps/api/src/modules/queues/dto/index.ts` — `CreateQueueDto` extended with retryAttempts/retryDelaySeconds/deadLetterQueue

## Next Phase

[Phase 12: Scheduler Platform](./phase-12.md)
