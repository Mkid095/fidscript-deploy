# Realtime Service

WebSocket channels, pub/sub, and presence detection.

---

## Purpose

Provides realtime messaging capabilities using NATS, enabling applications to implement live updates, collaborative features, and event-driven architectures.

---

## Responsibilities

- Channel creation and management
- Message broadcasting
- Presence detection (who's online)
- Channel subscriptions
- Private channel access control
- Connection management

---

## Dependencies

- NATS (JetStream for persistence)

---

## Database Tables

### realtime.channels

```sql
CREATE TABLE realtime.channels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects.projects(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  is_private BOOLEAN DEFAULT false,
  presence_enabled BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### realtime.subscriptions

```sql
CREATE TABLE realtime.subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  channel_id UUID REFERENCES realtime.channels(id) ON DELETE CASCADE,
  connection_id VARCHAR(255) NOT NULL,
  user_id UUID REFERENCES identity.users(id),
  metadata JSONB DEFAULT '{}',
  subscribed_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

## Events Produced

| Event | Trigger |
|-------|---------|
| realtime.channel_created | Channel created |
| realtime.channel_deleted | Channel removed |
| realtime.client_joined | Client subscribes |
| realtime.client_left | Client unsubscribes |
| realtime.message_sent | Message published |

---

## Events Consumed

None (service operates via WebSocket).

---

## API Endpoints

```
GET /api/v1/projects/:projectId/realtime/channels
  Headers: Authorization: Bearer <token>
  Response: { channels: [...] }
  Errors: 401, 404

POST /api/v1/projects/:projectId/realtime/channels
  Headers: Authorization: Bearer <token>
  Body: {
    name: string,
    isPrivate?: boolean,
    presenceEnabled?: boolean
  }
  Response: { channel }
  Errors: 401, 404

GET /api/v1/projects/:projectId/realtime/channels/:id
  Headers: Authorization: Bearer <token>
  Response: { channel }
  Errors: 401, 404

DELETE /api/v1/projects/:projectId/realtime/channels/:id
  Headers: Authorization: Bearer <token>
  Response: { success: true }
  Errors: 401, 404

GET /api/v1/projects/:projectId/realtime/channels/:id/presence
  Headers: Authorization: Bearer <token>
  Response: { clients: [...] }
  Errors: 401, 404

POST /api/v1/projects/:projectId/realtime/channels/:id/publish
  Headers: Authorization: Bearer <token>
  Body: {
    message: object,
    eventType?: string
  }
  Response: { success: true }
  Errors: 401, 404
```

---

## SDK Methods

```typescript
interface RealtimeChannel {
  id: string;
  projectId: string;
  name: string;
  isPrivate: boolean;
  presenceEnabled: boolean;
  createdAt: string;
}

interface PresenceClient {
  connectionId: string;
  userId: string | null;
  metadata: Record<string, unknown>;
  joinedAt: string;
}

// Channel management
platform.realtime.channels.list(projectId: string): Promise<RealtimeChannel[]>

platform.realtime.channels.create(projectId: string, data: {
  name: string;
  isPrivate?: boolean;
  presenceEnabled?: boolean;
}): Promise<RealtimeChannel>

platform.realtime.channels.get(projectId: string, channelId: string): Promise<RealtimeChannel>

platform.realtime.channels.delete(projectId: string, channelId: string): Promise<void>

platform.realtime.channels.getPresence(projectId: string, channelId: string): Promise<PresenceClient[]>

// Realtime connection (client-side)
platform.realtime.connect(projectId: string): RealtimeConnection

interface RealtimeConnection {
  subscribe(channelName: string, handlers: {
    onMessage?: (message: unknown, eventType?: string) => void;
    onJoin?: (client: PresenceClient) => void;
    onLeave?: (client: PresenceClient) => void;
  }): Subscription;

  publish(channelName: string, message: unknown, eventType?: string): Promise<void>;

  disconnect(): void;
}

interface Subscription {
  unsubscribe(): void;
}
```

---

## MCP Tools

```json
{
  "name": "create_channel",
  "description": "Create a realtime channel",
  "inputSchema": {
    "type": "object",
    "properties": {
      "projectId": { "type": "string" },
      "name": { "type": "string" },
      "isPrivate": { "type": "boolean" },
      "presenceEnabled": { "type": "boolean" }
    },
    "required": ["projectId", "name"]
  }
}

{
  "name": "delete_channel",
  "description": "Delete a realtime channel",
  "inputSchema": {
    "type": "object",
    "properties": {
      "projectId": { "type": "string" },
      "channelId": { "type": "string" }
    },
    "required": ["projectId", "channelId"]
  }
}

{
  "name": "list_channels",
  "description": "List realtime channels",
  "inputSchema": {
    "type": "object",
    "properties": {
      "projectId": { "type": "string" }
    },
    "required": ["projectId"]
  }
}

{
  "name": "get_presence",
  "description": "Get channel presence (online clients)",
  "inputSchema": {
    "type": "object",
    "properties": {
      "projectId": { "type": "string" },
      "channelId": { "type": "string" }
    },
    "required": ["projectId", "channelId"]
  }
}

{
  "name": "publish_message",
  "description": "Publish a message to a channel",
  "inputSchema": {
    "type": "object",
    "properties": {
      "projectId": { "type": "string" },
      "channelId": { "type": "string" },
      "message": { "type": "object" },
      "eventType": { "type": "string" }
    },
    "required": ["projectId", "channelId", "message"]
  }
}
```

---

## Dashboard Screens

- `/projects/:id/realtime` - Realtime overview
- `/projects/:id/realtime/channels` - Channel list
- `/projects/:id/realtime/channels/:id` - Channel detail with presence
- `/projects/:id/settings/realtime` - Realtime configuration

---

## Security Considerations

1. **Channel access control** - Private channels require authentication
2. **Message validation** - Schema validation for messages
3. **Rate limiting** - Prevent message flooding
4. **Connection limits** - Per-project connection limits
5. **TLS** - All WebSocket connections over TLS

---

## Failure Recovery

| Scenario | Recovery |
|----------|----------|
| Client disconnect | Automatic cleanup of presence |
| NATS outage | Reconnection with exponential backoff |
| Message loss | JetStream persistence for durability |

---

## Future Extensions

- Channel history retention
- Message search
- Typing indicators
- Read receipts
- Push notifications fallback
