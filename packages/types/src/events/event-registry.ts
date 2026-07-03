/**
 * Event schema registry — single source of truth for all event schemas.
 *
 * Enables:
 * - Compile-time event type checking (every emitted event must have a schema)
 * - Runtime schema validation
 * - Migration functions for backward compatibility when event shapes change
 *
 * Naming: events follow <domain>.<entity>.<verb> convention.
 */

export type EventTypeKey = string;

export interface EventField {
  type: string;
  required: boolean;
  description?: string;
}

export interface EventSchema<V = unknown> {
  /** Event type this schema describes (e.g. 'email.sent'). */
  eventType: string;
  /** Current schema version for this event type. */
  currentVersion: string;
  /** Field definitions keyed by field name. */
  fields: Record<string, EventField>;
  /** Optional migration function: transforms payload from an older version to current. */
  migrate?: (payload: unknown, fromVersion: string) => V;
}

/** Registry of all event schemas keyed by event type string. */
export const eventSchemas: Record<string, EventSchema> = {
  'email.queued': {
    eventType: 'email.queued',
    currentVersion: '1.0',
    fields: {
      messageId: { type: 'string', required: true, description: 'EmailMessage UUID' },
      projectId: { type: 'string', required: true },
      to: { type: 'string', required: true },
      from: { type: 'string', required: true },
      subject: { type: 'string', required: true },
    },
  },
  'email.sent': {
    eventType: 'email.sent',
    currentVersion: '1.0',
    fields: {
      messageId: { type: 'string', required: true },
      projectId: { type: 'string', required: true },
      to: { type: 'string', required: true },
      from: { type: 'string', required: true },
      subject: { type: 'string', required: true },
      provider: { type: 'string', required: false },
      durationMs: { type: 'number', required: false },
    },
  },
  'email.delivered': {
    eventType: 'email.delivered',
    currentVersion: '1.0',
    fields: {
      messageId: { type: 'string', required: true },
      projectId: { type: 'string', required: true },
      to: { type: 'string', required: true },
    },
  },
  'email.opened': {
    eventType: 'email.opened',
    currentVersion: '1.0',
    fields: {
      messageId: { type: 'string', required: true },
      projectId: { type: 'string', required: true },
      userAgent: { type: 'string', required: false },
      ipAddress: { type: 'string', required: false },
    },
  },
  'email.clicked': {
    eventType: 'email.clicked',
    currentVersion: '1.0',
    fields: {
      messageId: { type: 'string', required: true },
      projectId: { type: 'string', required: true },
      url: { type: 'string', required: true },
      userAgent: { type: 'string', required: false },
      ipAddress: { type: 'string', required: false },
    },
  },
  'email.bounced': {
    eventType: 'email.bounced',
    currentVersion: '1.0',
    fields: {
      messageId: { type: 'string', required: true },
      projectId: { type: 'string', required: true },
      to: { type: 'string', required: true },
      reason: { type: 'string', required: false },
      failureType: { type: 'string', required: false },
      suppressed: { type: 'boolean', required: false },
    },
  },
  'email.complained': {
    eventType: 'email.complained',
    currentVersion: '1.0',
    fields: {
      messageId: { type: 'string', required: true },
      projectId: { type: 'string', required: true },
      to: { type: 'string', required: true },
      feedbackType: { type: 'string', required: false },
    },
  },
  'email.failed': {
    eventType: 'email.failed',
    currentVersion: '1.0',
    fields: {
      messageId: { type: 'string', required: true },
      projectId: { type: 'string', required: true },
      to: { type: 'string', required: true },
      failureType: { type: 'string', required: true },
      error: { type: 'string', required: false },
      attempt: { type: 'number', required: false },
    },
  },
  'email.soft_bounce': {
    eventType: 'email.soft_bounce',
    currentVersion: '1.0',
    fields: {
      messageId: { type: 'string', required: true },
      projectId: { type: 'string', required: true },
      to: { type: 'string', required: true },
      failureType: { type: 'string', required: true },
      retryCount: { type: 'number', required: false },
      nextRetryAt: { type: 'string', required: false },
    },
  },
  'domain.added': {
    eventType: 'domain.added',
    currentVersion: '1.0',
    fields: {
      domainId: { type: 'string', required: true },
      projectId: { type: 'string', required: true },
      domain: { type: 'string', required: true },
    },
  },
  'domain.verified': {
    eventType: 'domain.verified',
    currentVersion: '1.0',
    fields: {
      domainId: { type: 'string', required: true },
      projectId: { type: 'string', required: true },
      domain: { type: 'string', required: true },
    },
  },
  'projects.project.created': {
    eventType: 'projects.project.created',
    currentVersion: '1.0',
    fields: {
      projectId: { type: 'string', required: true },
      name: { type: 'string', required: true },
    },
  },
  'identity.user.registered': {
    eventType: 'identity.user.registered',
    currentVersion: '1.0',
    fields: {
      userId: { type: 'string', required: true },
      email: { type: 'string', required: true },
    },
  },
  'identity.session.created': {
    eventType: 'identity.session.created',
    currentVersion: '1.0',
    fields: {
      sessionId: { type: 'string', required: true },
      userId: { type: 'string', required: true },
    },
  },
};

/** Maps legacy (dotless) event names to canonical EventType names.
 *  Consumers should prefer canonical names; legacy names are deprecated. */
export const LEGACY_EVENT_ALIASES: Record<string, string> = {
  'user.created': 'identity.user.registered',
  'user.login': 'identity.user.logged_in',
  'deployment.started': 'deployments.deployment.created',
  'deployment.building': 'deployments.deployment.building',
  'deployment.succeeded': 'deployments.deployment.succeeded',
  'deployment.failed': 'deployments.deployment.failed',
  'deployment.rolled_back': 'deployments.deployment.rolled_back',
  'project.created': 'projects.project.created',
  'domain.added': 'domain.added',
  'domain.verified': 'domain.verified',
};
