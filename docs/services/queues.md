# Queues Service

> **⚠ Aspirational target spec — not current reality.** Written before the hardening reset; describes the *intended* design. For what actually builds/runs today read [`START_HERE`](../START_HERE.md), [`AUDIT`](../AUDIT.md), and [`AGENT_STATUS`](../../AGENT_STATUS.md). Phase docs (`docs/phases/`) are the source of truth for current state and next work.

Background job processing with NATS JetStream.

---

## Purpose

Provides reliable message queuing for background job processing with retry logic and dead letter handling.

---

## Responsibilities

- Queue creation and management
- Message publishing
- Message consumption
- Retry configuration
- Dead letter queue handling
- Consumer group management

---

## Dependencies

- NATS (JetStream)

---

## Database Tables

### queues.queues

```sql
CREATE TABLE queues.queues (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects.projects(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  type VARCHAR(50) DEFAULT 'work',
  max_retries INTEGER DEFAULT 3,
  visibility_timeout_secs INTEGER DEFAULT 30,
  retention_hours INTEGER DEFAULT 72,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### queues.messages

```sql
CREATE TABLE queues.messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  queue_id UUID REFERENCES queues.queues(id) ON DELETE CASCADE,
  message_id VARCHAR(255) NOT NULL,
  payload JSONB NOT NULL,
  status VARCHAR(50) DEFAULT 'pending',
  retry_count INTEGER DEFAULT 0,
  last_error TEXT,
  process_after TIMESTAMPTZ,
  processed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

## Queue Types

| Type | Description |
|------|-------------|
| work | Competing consumers, one message per consumer |
| stream | All consumers receive all messages |

---

## Message Statuses

| Status | Description |
|--------|-------------|
| pending | Awaiting processing |
| processing | Consumer working on it |
| completed | Successfully processed |
| failed | Processing failed, retries exhausted |
| dead_lettered | Moved to DLQ |

---

## Events Produced

| Event | Trigger |
|-------|---------|
| queue.created | Queue created |
| queue.message_published | Message sent to queue |
| queue.message_consumed | Message processed |
| queue.message_failed | Processing failed |
| queue.message_retried | Message requeued |
| queue.dead_lettered | Moved to DLQ |
| queue.flushed | Queue cleared |

---

## API Endpoints

```
GET /api/v1/projects/:projectId/queues
  Headers: Authorization: Bearer <token>
  Response: { queues: [...] }
  Errors: 401, 404

POST /api/v1/projects/:projectId/queues
  Headers: Authorization: Bearer <token>
  Body: {
    name: string,
    type?: 'work' | 'stream',
    maxRetries?: number,
    visibilityTimeoutSecs?: number
  }
  Response: { queue }
  Errors: 401, 404

GET /api/v1/projects/:projectId/queues/:id
  Headers: Authorization: Bearer <token>
  Response: { queue }
  Errors: 401, 404

DELETE /api/v1/projects/:projectId/queues/:id
  Headers: Authorization: Bearer <token>
  Response: { success: true }
  Errors: 401, 404

POST /api/v1/projects/:projectId/queues/:id/messages
  Headers: Authorization: Bearer <token>
  Body: { payload: object, delayMs?: number }
  Response: { message }
  Errors: 401, 404

GET /api/v1/projects/:projectId/queues/:id/messages
  Headers: Authorization: Bearer <token>
  Query: ?status=&limit=50
  Response: { messages: [...] }
  Errors: 401, 404

DELETE /api/v1/projects/:projectId/queues/:id/messages/:messageId
  Headers: Authorization: Bearer <token>
  Response: { success: true }
  Errors: 401, 404

POST /api/v1/projects/:projectId/queues/:id/flush
  Headers: Authorization: Bearer <token>
  Response: { success: true }
  Errors: 401, 404
```

---

## SDK Methods

```typescript
interface Queue {
  id: string;
  projectId: string;
  name: string;
  type: 'work' | 'stream';
  maxRetries: number;
  visibilityTimeoutSecs: number;
  createdAt: string;
}

interface QueueMessage {
  id: string;
  queueId: string;
  messageId: string;
  payload: Record<string, unknown>;
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'dead_lettered';
  retryCount: number;
  lastError: string | null;
  processAfter: string | null;
  processedAt: string | null;
  createdAt: string;
}

platform.queues.list(projectId: string): Promise<Queue[]>

platform.queues.create(projectId: string, data: {
  name: string;
  type?: 'work' | 'stream';
  maxRetries?: number;
  visibilityTimeoutSecs?: number;
}): Promise<Queue>

platform.queues.get(projectId: string, queueId: string): Promise<Queue>

platform.queues.delete(projectId: string, queueId: string): Promise<void>

platform.queues.publish(projectId: string, queueId: string, payload: unknown, options?: {
  delayMs?: number;
}): Promise<QueueMessage>

platform.queues.consume(projectId: string, queueId: string, handler: (message: QueueMessage) => Promise<void>): () => void

platform.queues.getMessages(projectId: string, queueId: string, options?: {
  status?: string;
  limit?: number;
}): Promise<QueueMessage[]>

platform.queues.deleteMessage(projectId: string, queueId: string, messageId: string): Promise<void>

platform.queues.flush(projectId: string, queueId: string): Promise<void>
```

---

## MCP Tools

```json
{
  "name": "create_queue",
  "description": "Create a message queue",
  "inputSchema": {
    "type": "object",
    "properties": {
      "projectId": { "type": "string" },
      "name": { "type": "string" },
      "type": { "type": "string" },
      "maxRetries": { "type": "number" }
    },
    "required": ["projectId", "name"]
  }
}

{
  "name": "delete_queue",
  "description": "Delete a queue",
  "inputSchema": {
    "type": "object",
    "properties": {
      "projectId": { "type": "string" },
      "queueId": { "type": "string" }
    },
    "required": ["projectId", "queueId"]
  }
}

{
  "name": "publish_message",
  "description": "Publish a message to a queue",
  "inputSchema": {
    "type": "object",
    "properties": {
      "projectId": { "type": "string" },
      "queueId": { "type": "string" },
      "payload": { "type": "object" },
      "delayMs": { "type": "number" }
    },
    "required": ["projectId", "queueId", "payload"]
  }
}

{
  "name": "list_messages",
  "description": "List queue messages",
  "inputSchema": {
    "type": "object",
    "properties": {
      "projectId": { "type": "string" },
      "queueId": { "type": "string" },
      "status": { "type": "string" }
    },
    "required": ["projectId", "queueId"]
  }
}

{
  "name": "flush_queue",
  "description": "Flush all messages from a queue",
  "inputSchema": {
    "type": "object",
    "properties": {
      "projectId": { "type": "string" },
      "queueId": { "type": "string" }
    },
    "required": ["projectId", "queueId"]
  }
}
```

---

## Dashboard Screens

- `/projects/:id/queues` - Queue list
- `/projects/:id/queues/new` - Create queue
- `/projects/:id/queues/:id` - Queue detail with messages
- `/projects/:id/settings/queues` - Queue settings

---

## Security Considerations

1. **Queue access control** - Project-level isolation
2. **Message validation** - JSON schema validation
3. **Rate limiting** - Publish rate limits
4. **Consumer authentication** - Token-based consumer auth

---

## Failure Recovery

| Scenario | Recovery |
|----------|----------|
| Consumer crash | Message returns to queue after visibility timeout |
| Repeated failures | Move to dead letter queue after max retries |
| Queue overflow | Retention policy cleanup |

---

## Future Extensions

- Scheduled messages (delay queues)
- Message persistence beyond retention
- Queue mirroring
- Cross-region replication
