# Service: Realtime (channels + socket.io)

Realtime channels per project — broadcast events to connected clients, with presence + per-channel
private tokens.

## 1. Purpose
The same pattern Convex/Supabase Realtime gives: a "subscribe to a channel from your client and
receive events." Built on socket.io with multi-instance broadcast via a Redis adapter, so the
fan-out works across the platform.

## 2. Screens
- **Realtime** (sidebar §6): channel list.
- **Channel detail**: members, presence (who's online now), recent messages, "Test publish" action.

## 3. Data model
- `RealtimeChannel` — id, projectId, name, isPrivate, metadata, `accessToken` (bcrypt-hashed; raw
  token returned once on create).
- `RealtimeMessage` — id, channelId, userId, content, event (custom name), timestamp.
- `RealtimePresence` — channelId, userId, status (`online|away|busy|offline`), lastSeenAt; also
  cached in Redis (`presence:channel:<id>:user:<id>`, 24h TTL).

## 4. API mapping
- Channels (CRUD + messages): `RT-01..05`. Presence: `RT-06/07`. Private-channel token:
  `RT-08`. WebSocket gateway at namespace `/realtime`.

## 5. Realtime events
- `realtime.channel_created`, `realtime.channel_deleted` (HTTP CRUD).
- **Socket gateway events** (in): `join_channel`, `leave_channel`, `message`, `set_presence`,
  `get_presence`, `subscribe_project` (the **only** way to subscribe to the canonical
  `project:<id>` room — owner/member gate), `unsubscribe_project`.
- **Socket gateway events** (out): `connected`, `error`, `client_joined`, `client_left`,
  `message`, `presence`, `presence_update`, `channel_deleted`.
- **Platform event fan-out:** `RealtimeBridgeService` subscribes to **every** platform event
  via `@OnEvent('**')` and emits to `project:<id>` rooms. The structural membership gate means
  the bridge doesn't re-check authorization.

## 6. Settings
- **Channel:** name, `isPrivate` (default false), `metadata`.
- **Private channels:** the `accessToken` is shown once on create; joiners must present it
  (bcrypt-compare). The UI surfaces "Share token" and "Rotate token" (the latter issues a new
  token; old token invalidates).

## 7. Automation
- **Project event broadcast** is automatic — every platform event (`deployments.*`,
  `function.*`, `email.*`, …) reaches all members of `project:<id>` (no manual pubsub wiring).
- **Cross-instance broadcast** via Redis adapter (the audit confirms pub/sub clients are wired in
  main.ts).
- **Disconnect → presence offline** is automatic (gateway sets presence on disconnect).

## 8. Dependencies
- **Hard:** the socket.io server, the Redis adapter, `RealtimeBridgeService`.
- **Backend gaps** (from the audit):
  - `subscribe_project` is the only auth gate on the canonical room — UI must communicate this
    clearly so users don't think they need to "invite a socket" manually.

## 9. Phase
**F10 (Realtime/Queues/Scheduler UI group)** — pending spec.
