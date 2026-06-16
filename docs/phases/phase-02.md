# Phase 02: Event Bus & Service Registry

> **Status:** Planned  |  **Track:** Foundation (the linchpin)  |  **Depends on:** Phase 01

## Objective

A real, **two-way** event bus — an in-process backbone (always works) plus a NATS JetStream outbox (durable, cross-service) — with at least one real consumer and a service registry. Every later phase emits and reacts to events through this bus. This is intentionally early: Realtime, Queues, Monitoring, Audit, and AI all consume the same stream; building them first would force a rewrite.

## Current State

**STUB, and deceptive.** See `docs/AUDIT.md` §B. Specific defects:

- `event.service.ts` imports `nats.ws` — the **browser WebSocket client** — not the Node `nats` package. Will not behave as a durable JetStream publisher.
- **Zero subscribers/consumers anywhere** in `apps/api/src`. Events are write-only. The "Event Driven" rule is satisfied only in the publish direction.
- With `NATS_URL` unset (every fresh VPS), `emit()` silently degrades to `logger.debug` → events vanish with no record.
- No JetStream stream is ever created → even with the right package, `publish('events.<type>')` returns `NoStreamResponse`.
- `packages/events` defines a rich `PlatformEvent` + `EventType` union that `event.service.ts` ignores (it defines its own local `{type,payload,timestamp}`). The catalog and the code have diverged.
- `docs/EVENT_CATALOG.md` documents subject schemes (`identity.user.*`) that match nothing the code publishes (`events.user.created`).

## Dependencies

- **Phase 01** (NATS must be running in the stack, and `NATS_URL` wired).

## Deliverables

- [ ] **In-process backbone first.** Add `@nestjs/event-emitter` (`EventEmitter2`). `EventService.emit()` **always dispatches locally** via `eventEmitter2.emit(...)` — so same-process handlers (`@OnEvent`) react even with zero infra. This single change makes the platform actually reactive and removes the silent-loss failure mode.
- [ ] **Correct NATS client.** Replace `nats.ws` with the server `nats` package. Connect to `NATS_URL`; tolerate absence gracefully (in-process path still works).
- [ ] **JetStream stream created on boot.** On startup, ensure the `EVENTS` stream exists (`jsm.streams.add` / `jetstream.addStream`) bound to `events.>` subjects. Publishing then durably persists.
- [ ] **Two-way proof: a real consumer.** Add an audit/event-persistence consumer (`@OnEvent('**')` locally + a JetStream durable consumer) that writes every event to a `PlatformEvent` table (and/or `AuditLog`). This is the first entity in the codebase that *reacts* to an event, proving the bus is two-way.
- [ ] **Single schema.** Reconcile `packages/events` with `event.service.ts` — one `PlatformEvent` type + one `EventType` union, used everywhere. Delete the divergent local copy.
- [ ] **Subject scheme, decided and documented.** Adopt `<domain>.<entity>.<verb>` (e.g. `identity.user.created`, `projects.deployment.succeeded`). Update `EVENT_CATALOG.md` to match the code exactly; every existing `emit(...)` call is migrated to the new scheme.
- [ ] **Service registry.** A `ServiceRegistry` where each module registers on boot `{ name, version, status, events: [...] }` (the events it emits). Expose via `GET /api/v1/services` (and feed the health endpoint). Later phases (MCP, Monitoring, Dashboard) use it for discovery instead of hardcoding.
- [ ] **At-least-once semantics noted.** Document that local dispatch is synchronous/in-order and JetStream is at-least-once; consumers must be idempotent.

## Technical Design

- **Dual-path emit:** `emit(type, payload)` → (1) `eventEmitter2.emit(type, payload)` (local, immediate, always); (2) if NATS available, `jetstream.publish('events.' + type, JSON)` (durable). Local handlers run via `@OnEvent`. The JetStream durable consumer re-feeds a second handler set for cross-restart/cross-service durability.
- **Why both:** local dispatch gives instant, dependency-free reactivity (audit logs, webhooks, realtime fan-out) for the common single-process case; JetStream gives durability and future multi-process fan-out. Neither alone is sufficient.
- **Typed events:** the `EventType` union is the contract. `emit()` accepts only known types (compile-time checked), killing the current string free-for-all.
- **Idempotent consumer:** the audit persister keys on `event.id` (a generated UUID per event) so re-delivery doesn't double-write.

## Integration Points

- **This phase IS the integration spine.** Every later phase:
  - emits its lifecycle events through `EventService.emit()` using typed `EventType`s;
  - may register a consumer via `@OnEvent` (e.g., Realtime fan-out in Phase 13, alert dispatch in Phase 14);
  - registers itself in the `ServiceRegistry` with the events it emits.
- **Service registry** is consumed by: MCP (Phase 17, to advertise tools), Monitoring (Phase 14, health), Dashboard (Phase 19, status page).

## Verification (VPS)

```bash
# With NATS running (Phase 01):
# 1) Emit an event via an API action (e.g. POST /auth/login) and confirm a local consumer fired:
docker compose exec api node -e "require('./dist').something" # or watch logs for the audit write
docker compose exec postgres psql ... -c "select * from platform_events order by created_at desc limit 5;"

# 2) Confirm NATS carries it:
docker compose exec nats nats sub 'events.>' &   # then trigger an action; the message appears

# 3) Resilience: stop NATS, trigger an action, confirm the local consumer STILL ran
#    (no silent loss). Restart NATS and confirm no crash.
```

**Exit criterion:** an event emitted in the API (1) reaches a `@OnEvent` handler and writes a `PlatformEvent` row, (2) appears on `nats sub 'events.>'`, and (3) still works locally when NATS is stopped. The service registry lists every registered module.

## Out of Scope / Future

- Domain-specific consumers (realtime fan-out, alert dispatch, email-on-event) belong to their own phases.
- Event sourcing / replay UI (future).
- Multi-region JetStream (future).

## Risks

- Dual-write consistency between local and JetStream (acceptable: local is source of truth for reactivity, JetStream is the durable record).
- Migrating every existing `emit()` string to the typed scheme is a broad sweep — gate it behind `typecheck`.

## Next Phase

[Phase 03: Identity & Access](./phase-03.md)
