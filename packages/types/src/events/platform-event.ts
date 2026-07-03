/**
 * Platform event types — shared across API, SDK, and MCP contracts.
 */

export type EventType = string; // Full EventType union defined in @fidscript/events

export interface EventMetadata {
  messageId?: string;
  to?: string;
  from?: string;
  subject?: string;
  [key: string]: unknown;
}

/** Platform event envelope — the shape emitted by EventService.emit(). */
export interface PlatformEvent<T = unknown> {
  id: string;
  version: string;
  type: EventType;
  timestamp: Date;
  actorId?: string;
  actorType?: 'user' | 'system' | 'api_key';
  resourceType?: string;
  resourceId?: string;
  metadata?: T;
  ipAddress?: string;
  userAgent?: string;
  traceId?: string;
}
