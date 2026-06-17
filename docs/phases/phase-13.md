# Phase 13: Realtime Platform

> **Status:** Planned  |  **Track:** Observability/Sync  |  **Depends on:** Phase 02, Phase 03

## Objective

A live channel between the platform and connected clients: **a platform event reaches a connected socket client in real time** (e.g. a deployment goes `LIVE` and the dashboard updates instantly). Today the gateway can't even instantiate.

## Current State

**STUB.** See `docs/AUDIT.md` §C (Realtime). Specific defects:

- A Socket.IO gateway exists with JWT auth and channel handlers — but `@nestjs/websockets` / `socket.io` are **not in dependencies**, so it **cannot instantiate** (DI failure).
- Platform events do **not** flow to clients.
- Presence is **in-memory only** (lost on restart, wrong for multi-instance).
- `validateChannelToken` returns `true` — any token authorizes any channel.

## Dependencies

- **Phase 02** (the event bus — realtime is a consumer that fans platform events out to sockets).
- **Phase 03** (JWT verification on socket connection).

## Deliverables

- [ ] **Dependencies + working instantiation.** Add `@nestjs/websockets`, `@nestjs/platform-socket.io`, `socket.io`. The gateway boots without DI errors.
- [ ] **Real connection auth.** Verify the JWT (Phase 03) during the handshake; reject invalid/expired tokens. No anonymous sockets.
- [ ] **Event fan-out.** A `@OnEvent('**')` (or typed subscriptions) consumer bridges the Phase 02 bus → `server.emit`/`socket.emit` to **authorized** clients on the relevant channel. A deployment status change, a function result, an inbound email, an alert — all push live to the right clients.
- [ ] **Channel model + real authorization.** Channels are project-scoped (e.g. `project:<id>:deployments`); joining requires validated membership (reuse Phase 04 `ProjectGuard` logic). `validateChannelToken` actually validates.
- [ ] **Redis-backed presence + broadcast.** `socket.io-redis`/`@socket.io/redis-adapter` so presence survives restarts and broadcasts work across multiple API instances. No more in-memory-only state.
- [ ] **Pub/sub API.** Clients subscribe/unsubscribe and (where permitted) emit messages; the server validates authorization and broadcasts to authorized subscribers. Private channels enforce access.
- [ ] **Reconnect/backpressure.** Standard Socket.IO reconnection; bounded send queues so a slow client can't unbounded-buffer the server.

## Technical Design

- **Bridge pattern:** the realtime module subscribes to the in-process event bus (Phase 02's `EventEmitter2`) and, for each event, resolves the interested channel(s) from the event's project/entity and emits to members of that channel room. This is the canonical "events → live UI" path; Monitoring (14) and the Dashboard (19) rely on it.
- **Authz:** a `RealtimeGuard`/handshake middleware decodes the JWT, loads the user, and on `joinRoom('project:<id>:*')` checks membership. Non-members get `403`/no join.
- **Adapter:** Redis pub/sub adapter (`redisAdapter({ pubClient, subClient })`) — required the moment there is >1 API process; correct from day one.
- **Token validation:** channel tokens are signed, project-scoped, short-lived — `validateChannelToken` verifies signature, expiry, and project binding.

## Integration Points

- **Events consumed:** deployment/function/queue/email/alert/domain events (02) → pushed to clients.
- **Events emitted:** `realtime.client.connected/disconnected`, `realtime.message.broadcast`.
- **Service registry:** registers `realtime`.
- **SDK (16):** a realtime client (`sdk.realtime.subscribe/on`).
- **Dashboard (19):** live deployment status, build-log tail, live mailbox, alert toasts — all ride this.
- **Consumers:** Realtime is itself a consumer; it does not block others.

## Verification (VPS)

```bash
# 1) Connect with a valid JWT and join a project channel:
# (wscat / socket.io client) → auth ok, joined project:<id>:deployments

# 2) Trigger a platform event (deploy something) → client receives it live (<~1s):
docker compose exec api ...   # e.g. a deployment transitions → client sees 'deployments.deployment.succeeded'

# 3) Authorization:
#    invalid/expired JWT           → connection refused (handshake 401)
#    join channel of project B     → refused (not a member)
#    validateChannelToken tampered → rejected (not 'return true')

# 4) Presence survives restart:
#    connect → restart api → reconnect → presence restored from Redis (not lost)
```

**Exit criterion:** a connected, JWT-authenticated client receives a real platform event live; invalid tokens and non-member channels are rejected; presence is Redis-backed (survives restart). The gateway instantiates (dependencies present).

## Out of Scope / Future

- WebRTC / peer-to-peer data channels — future.
- Offline message queue / replay-on-reconnect beyond standard Socket.IO — future.
- Custom binary protocols — future.

## Risks

- Forgetting to authorize a channel leaks cross-project data — the prove-it (join project B's channel as member of A) is the backstop.
- Without the Redis adapter, multi-instance silently drops broadcasts — adopt it from day one, even single-instance.

## Files you'll touch (precision map)

- Stub at: `apps/api/src/modules/realtime/gateways/realtime.gateway.ts` (Socket.IO gateway — deps `@nestjs/websockets`/`socket.io` installed in Phase 00, so it can now instantiate) and `apps/api/src/modules/realtime/realtime.service.ts` (`validateChannelToken` returns `true`; presence in-memory only).
- Prisma: `RealtimeChannel`, `RealtimeMessage`, `RealtimePresence`.
- Add: `@socket.io/redis-adapter` (survive restarts, multi-instance); a `@OnEvent` bridge fanning the Phase 02 bus to authorized socket rooms; channel authz via project membership.

## Next Phase

[Phase 14: Monitoring Platform](./phase-14.md)
