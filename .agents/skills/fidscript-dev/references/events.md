# Event System — @fidscript-deploy/events

## Source
`packages/events/src/event-emitter.ts`

## Key APIs

### validatePayload(type, payload, version?) → payload
Validates a payload against the registered schema for the given event type.
- Warns (does not throw) for unknown event types — developers should add schema
- If a `migrate()` function exists for the schema, runs migration automatically
- Returns payload unchanged (or migrated)

### resolveEventType(type) → string
Resolves a possibly-legacy event type string to its canonical name.
Returns input unchanged if already canonical.

### isKnownEventType(type) → boolean
Returns true if a schema is registered for this event type.

### buildPlatformEvent(type, projectId, payload, context?) → PlatformEvent
Builds a typed `PlatformEvent` with trace context attached.
```typescript
{
  id: '',        // Set by EventService
  version: '1.0',
  type: string,
  timestamp: Date,
  projectId: string | undefined,
  metadata: T,
  actorId?: string,
  actorType?: 'user' | 'system' | 'api_key',
  resourceType?: string,
  resourceId?: string,
  ipAddress?: string,
  userAgent?: string,
  traceId?: string,
}
```

## Schema Registry
Lives in `@fidscript-deploy/types/src/events/event-registry.ts`.
Every new event type requires a schema entry before emission.

Schema shape:
```typescript
interface EventSchema {
  eventType: string;
  currentVersion: string;
  fields: Record<string, { type: string; required: boolean }>;
  migrate?: (payload: unknown, fromVersion: string) => unknown;
}
```

## Legacy Aliases
`LEGACY_EVENT_ALIASES` map in `@fidscript-deploy/types` resolves old event names
to canonical names. The `resolveEventType()` function uses this map.

## Event Emission Flow
1. Code calls `EventService.emit(type, payload)`
2. `validatePayload()` checks schema, migrates if needed
3. Event emitted via NATS
4. Consumers receive and process

## Prisma PlatformEvent Model
```
id (String, not auto UUID), type, timestamp, actorId?, actorType?,
resourceType, resourceId, projectId?, metadata (Json), ipAddress?, userAgent?
```
The `id` is set by the event itself (matches the event's UUID), not auto-generated
by Prisma.
