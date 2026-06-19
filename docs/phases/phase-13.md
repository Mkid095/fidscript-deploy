# Phase 13: Realtime Platform

> **Status:** Verified (2026-06-19)  |  **Track:** Observability/Sync  |  **Depends on:** Phase 02, Phase 03

## Objective

A live channel between the platform and connected clients: **a platform event reaches a connected socket client in real time** (e.g. a deployment goes `LIVE` and the dashboard updates instantly).

## Current State

**Verified 2026-06-19.** The AUDIT §C defects are closed. The audit's "PARTIAL" was already half-right — JWT handshake auth, bcrypt `validateChannelToken`, and Redis-backed presence were already wired; the real gap was **event fan-out to clients** plus two latent bugs that fan-out exposed. Proven on the VPS (a host-side socket.io-client against the API bridge IP, plus a container restart):

- **Gateway instantiates + subscribes.** `@nestjs/websockets` / `socket.io` deps were already present; the gateway boots, registers `join_channel`/`leave_channel`/`message`/`set_presence`/`get_presence` and the new `subscribe_project`/`unsubscribe_project` handlers, and resolves cleanly (no DI errors).
- **Live fan-out (the core deliverable).** A new `RealtimeBridgeService` subscribes to every platform event via `@OnEvent('**')`, extracts the owning project, and broadcasts to `project:<id>` rooms on the event's dotted type. Prove-it: a client subscribed to project A receives `projects.project.updated` live (<1s) when that project is PATCHed; it does **not** receive events for project B.
- **Project-room authorization.** `subscribe_project` verifies owner-or-member (mirrors `ProjectAccessService`: `Project.ownerId === userId || ProjectMember` exists) before joining the `project:<id>` room. Non-members/non-existent projects are rejected (`{success:false}`). Authorization is structural — the bridge only ever emits to members-only rooms.
- **Redis adapter.** `@socket.io/redis-adapter` attached via a `RedisIoAdapter` (`app.useWebSocketAdapter`) so `server.to(room).emit` reaches sockets on any API instance and state is shared. Attaching on the `@WebSocketServer` object does NOT work in NestJS (it's the Namespace, not the root Server) — see ADR. Best-effort: degrades to single-instance if Redis is down, never blocks bootstrap (ADR-023).
- **Restart resilience.** Presence is Redis-backed (`presence:<userId>` + `presence:channel:<id>:user:<id>` with TTL — verified keys present). After `docker compose restart api`, the gateway re-inits, the adapter re-attaches, and the full 9/9 prove-it passes again.
- **JWT auth.** Handshake verifies the real JWT (`sub` claim) and rejects invalid tokens (connection refused, no `connected` ack).

**Latent bugs fixed along the way (Phase 13 surfaced them):**

- `TokenService.validateJwt` read `decoded.userId`, but the platform JWT carries the id in `sub` → every socket action operated on `undefined` userId. Fixed to read `sub`.
- `EventEmitterModule.forRoot()` was called **without `{ wildcard: true }`** → `@OnEvent('**')` matched nothing, so **no wildcard event consumer ever fired** (AuditEventConsumer wrote 0 rows; the bridge received nothing). Fixed; audit-event recording now works as a side benefit. See AUDIT §B.

**Honest gaps (open, non-blocking for the exit criterion):**

- **Coverage is complete for project-scoped events.** The bridge's extractor handles all three projectId conventions used in the codebase: flat `payload.projectId` (queues/cron/functions/email/databases/monitoring/templates/ai), audit-wrapped `resourceType:'project'`→`resourceId` (projects.*, env-var.*), and `payload.metadata.projectId` (deployments, domains, storage, **projects.member.\***, **projects.invitation.\***). Verified by scanning every `eventService.emit` call site; the one gap found (`database.backup_completed` was missing `projectId`) is fixed. So **every project-scoped platform event fans out live** with no per-service wiring. Events that are *not* project-scoped (identity/session login/logout, platform API keys, marketplace) correctly do not route to project rooms.
- The `join_channel` path keys its channel lookup off `client.data.projectId`, which platform JWTs don't carry → websocket channel joins don't resolve for platform-JWT clients. (The REST channel API works; the project-event bridge — this phase's deliverable — is unaffected.) Pre-existing; out of scope here.
- The bus design splits local emit (EventService's private emitter) from consumer delivery (NestJS emitter, fed by the NATS durable consumer). Local events therefore reach `@OnEvent` consumers only after a NATS round-trip. Correct and durable while NATS is up; a unification is a future Phase 02 refinement.

## Dependencies

- **Phase 02** (the event bus — realtime is a consumer that fans platform events out to sockets).
- **Phase 03** (JWT verification on socket connection).

## Deliverables

- [x] **Dependencies + working instantiation.** `@nestjs/websockets`, `@nestjs/platform-socket.io`, `socket.io` were already present; `@socket.io/redis-adapter` added. The gateway boots without DI errors (verified in logs).
- [x] **Real connection auth.** The JWT is verified during the handshake (reads the `sub` claim — fix applied); invalid/expired tokens are refused (no `connected` ack). No anonymous sockets.
- [x] **Event fan-out.** `RealtimeBridgeService` bridges the Phase 02 bus → authorized clients on the relevant project room. A project update pushes live to the right clients (<1s, verified).
- [x] **Channel model + real authorization.** Project rooms (`project:<id>`); joining requires owner-or-member. `validateChannelToken` does a real bcrypt compare.
- [x] **Redis-backed presence + broadcast.** `@socket.io/redis-adapter` attached (via `RedisIoAdapter`); presence persisted to Redis with TTL (verified keys survive API restart).
- [~] **Pub/sub API.** Channel pub/sub exists (join/leave/message); project-event feed is push-only (subscribe/unsubscribe). Client-originated messages broadcast within a channel.
- [x] **Reconnect/backpressure.** Standard Socket.IO reconnection (verified: client reconnects after `restart api` and re-subscribes); send paths use socket.io's built-in buffering.

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

- `apps/api/src/modules/realtime/services/realtime-bridge.service.ts` (NEW) — the `@OnEvent('**')` consumer that fans platform events out to authorized project rooms. The core Phase 13 deliverable.
- `apps/api/src/modules/realtime/services/realtime-subscription.service.ts` (NEW) — owner-or-member authorization for `subscribe_project`.
- `apps/api/src/modules/realtime/services/realtime-rooms.ts` (NEW) — canonical `project:<id>` room name.
- `apps/api/src/modules/realtime/gateways/realtime.gateway.ts` — added `subscribe_project`/`unsubscribe_project` handlers + `broadcastToProject` (emits on the `/realtime` namespace).
- `apps/api/src/adapters/redis-io.adapter.ts` (NEW) + `apps/api/src/main.ts` — `IoAdapter` subclass wiring `@socket.io/redis-adapter` via `app.useWebSocketAdapter`.
- `apps/api/src/modules/realtime/services/token.service.ts` — bugfix: read the JWT `sub` claim (was `userId`).
- `apps/api/src/modules/events/events.module.ts` — bugfix: `EventEmitterModule.forRoot({ wildcard: true })` (was without options → `@OnEvent('**')` never matched).
- Prisma (unchanged, already present): `RealtimeChannel`, `RealtimeMessage`, `RealtimePresence`.

## Next Phase

[Phase 14: Monitoring Platform](./phase-14.md)
