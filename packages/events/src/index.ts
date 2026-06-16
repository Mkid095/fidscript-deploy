// Event type definitions for FIDScript platform
// All platform actions generate events for auditing and reactivity

export type EventType =
  // Auth events
  | 'user.created'
  | 'user.updated'
  | 'user.deleted'
  | 'session.created'
  | 'session.revoked'
  | 'api_key.created'
  | 'api_key.revoked'
  // Project events
  | 'project.created'
  | 'project.updated'
  | 'project.deleted'
  | 'project.deployed'
  | 'project.build_started'
  | 'project.build_failed'
  // Deployment events
  | 'deployment.created'
  | 'deployment.started'
  | 'deployment.completed'
  | 'deployment.failed'
  | 'deployment.rolled_back'
  // Database events
  | 'database.created'
  | 'database.started'
  | 'database.stopped'
  | 'database.restarted'
  | 'database.deleted'
  // Domain events
  | 'domain.created'
  | 'domain.updated'
  | 'domain.deleted'
  | 'domain.ssl_issued'
  | 'domain.ssl_failed'
  | 'domain.dns_verified'
  // Function events
  | 'function.created'
  | 'function.deployed'
  | 'function.invoked'
  | 'function.failed'
  // Queue events
  | 'queue.created'
  | 'queue.started'
  | 'queue.stopped'
  | 'queue.message_published'
  // Cron events
  | 'cron.created'
  | 'cron.started'
  | 'cron.stopped'
  | 'cron.executed'
  | 'cron.failed'
  // Storage events
  | 'storage.created'
  | 'storage.uploaded'
  | 'storage.deleted'
  // System events
  | 'system.health_check'
  | 'system.error';

export interface PlatformEvent<T = unknown> {
  id: string;
  type: EventType;
  timestamp: Date;
  actorId?: string;
  actorType?: 'user' | 'system' | 'api_key';
  resourceType: string;
  resourceId: string;
  metadata?: T;
  ipAddress?: string;
  userAgent?: string;
}

// Event schemas for specific resources
export interface ProjectEventMetadata {
  projectId: string;
  projectName: string;
  deploymentId?: string;
  commitHash?: string;
}

export interface DeploymentEventMetadata {
  deploymentId: string;
  projectId: string;
  status: string;
  duration?: number;
  error?: string;
}

export interface AuthEventMetadata {
  userId: string;
  email: string;
  method?: 'password' | 'api_key' | 'mfa' | 'oauth';
  success: boolean;
  failureReason?: string;
}

// Event bus message format for NATS
export interface EventBusMessage {
  subject: string;
  data: PlatformEvent;
  replyTo?: string;
}

// Event subscription filter
export interface EventFilter {
  types?: EventType[];
  resourceTypes?: string[];
  actorIds?: string[];
  fromTimestamp?: Date;
  toTimestamp?: Date;
}
