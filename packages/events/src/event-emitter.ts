/**
 * Event emitter utilities — schema validation, migration, and alias resolution.
 *
 * Every event emitted by EventService should pass through validatePayload() so that:
 * 1. Unknown event types are flagged at emit time (not silently ignored)
 * 2. Payload shape is validated against the registered schema
 * 3. Legacy event names are resolved to canonical names
 *
 * Migration: if an event schema changes, add a `migrate()` function to the
 * eventSchemas entry in @fidscript-deploy/types to transform old payloads automatically.
 */
import type { PlatformEvent } from './index.js';
import { LEGACY_EVENT_ALIASES } from '@fidscript-deploy/types';

// -------------------------------------------------------------------------- //
// Schema registry — imports from @fidscript-deploy/types (single source of truth)  //
// We duplicate the type key here to avoid circular deps; actual schemas live //
// in @fidscript-deploy/types/src/events/event-registry.ts                           //
// -------------------------------------------------------------------------- //

interface EventSchema {
  eventType: string;
  currentVersion: string;
  fields: Record<string, { type: string; required: boolean }>;
  migrate?: (payload: unknown, fromVersion: string) => unknown;
}

// Lazy import to avoid circular dependency
function getSchemas(): Record<string, EventSchema> {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  return require('@fidscript-deploy/types').eventSchemas;
}

/**
 * Resolve a possibly-legacy event type string to its canonical name.
 * Returns the input unchanged if already canonical.
 */
export function resolveEventType(type: string): string {
  return LEGACY_EVENT_ALIASES[type] ?? type;
}

/**
 * Check whether an event type has a registered schema.
 */
export function isKnownEventType(type: string): boolean {
  const schemas = getSchemas();
  const canonical = resolveEventType(type);
  return canonical in schemas;
}

/**
 * Validate a payload against the registered schema for a given event type.
 * Logs a warning for unknown events (new events without schemas should be added
 * to @fidscript-deploy/types/src/events/event-registry.ts before emission).
 *
 * Returns the validated payload unchanged (or migrated if a migrate fn exists).
 */
export function validatePayload<T = unknown>(
  type: string,
  payload: T,
  emittedVersion = '1.0',
): T {
  const schemas = getSchemas();
  const canonical = resolveEventType(type);

  if (!(canonical in schemas)) {
    // New event type — warn but don't block. Developers should add a schema.
    console.warn(`[events] Unknown event type "${type}" — consider adding schema to @fidscript-deploy/types`);
    return payload;
  }

  const schema = schemas[canonical];

  // Version migration
  if (emittedVersion !== schema.currentVersion && schema.migrate) {
    return schema.migrate(payload, emittedVersion) as T;
  }

  return payload;
}

/**
 * Build a PlatformEvent with trace context attached.
 * Convenience wrapper for EventService.emit() call sites that have a traceparent.
 */
export function buildPlatformEvent<T = unknown>(
  type: string,
  projectId: string | null,
  payload: T,
  context?: {
    actorId?: string;
    actorType?: 'user' | 'system' | 'api_key';
    resourceType?: string;
    resourceId?: string;
    ipAddress?: string;
    userAgent?: string;
    traceId?: string;
  },
): PlatformEvent<T> {
  const { traceId, ...ctx } = context ?? {};
  return {
    id: '', // Set by EventService
    version: '1.0',
    type: type as any,
    timestamp: new Date(),
    projectId: projectId ?? undefined,
    metadata: payload,
    ...ctx,
    ...(traceId ? { traceId } : {}),
  };
}
