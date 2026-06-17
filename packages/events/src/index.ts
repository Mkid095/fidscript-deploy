// Event type definitions for FIDScript platform
// All platform actions generate events for auditing and reactivity.
//
// Naming scheme: <domain>.<entity>.<verb>
// Every string emitted by EventService.emit() must be a valid EventType.
// Add new types here — never emit strings outside this union (gate behind typecheck).

export type EventType =
  // Auth / Identity events
  | 'user.created'
  | 'user.updated'
  | 'user.deleted'
  | 'user.login'
  | 'session.created'
  | 'session.revoked'
  | 'api_key.created'
  | 'api_key.revoked'
  | 'auth.user_created'
  | 'auth.login_succeeded'
  | 'auth.login_failed'
  // Project events
  | 'project.created'
  | 'project.updated'
  | 'project.deleted'
  | 'project.suspended'
  | 'project.archived'
  | 'project.restored'
  | 'project.cloned'
  // Deployment events
  | 'deployment.started'
  | 'deployment.building'
  | 'deployment.succeeded'
  | 'deployment.failed'
  | 'deployment.rolled_back'
  // Database events
  | 'database.provisioned'
  | 'database.updated'
  | 'database.deleted'
  | 'database.backup_started'
  | 'database.backup_completed'
  | 'database.restored'
  // Domain events
  | 'domain.added'
  | 'domain.verified'
  | 'domain.failed'
  | 'domain.deleted'
  // Function events
  | 'function.created'
  | 'function.deployed'
  | 'function.invoked'
  | 'function.error'
  | 'function.deleted'
  | 'function.dead_lettered'
  // Queue events
  | 'queue.created'
  | 'queue.message_published'
  | 'queue.message_retried'
  | 'queue.dead_lettered'
  // Cron events
  | 'cron.job_created'
  | 'cron.job_updated'
  | 'cron.job_deleted'
  | 'cron.job_run_started'
  | 'cron.job_run_completed'
  | 'cron.job_run_failed'
  // Storage events
  | 'storage.bucket_created'
  | 'storage.bucket_deleted'
  | 'storage.file_uploaded'
  | 'storage.file_deleted'
  // Realtime events
  | 'realtime.channel_created'
  | 'realtime.channel_deleted'
  | 'realtime.client_joined'
  | 'realtime.client_left'
  | 'realtime.message_sent'
  // Email events
  | 'email.sent'
  | 'email.mailbox_created'
  | 'email.domain_added'
  // AI events
  | 'ai.conversation.created'
  | 'ai.conversation.deleted'
  | 'ai.error_diagnosed'
  | 'ai.recommendation.generated'
  | 'ai.deployment.assisted'
  | 'ai.project.generation_assisted'
  // Monitoring events
  | 'monitoring.alert_triggered'
  // Template events
  | 'template.created'
  | 'template.deleted'
  | 'template.project_generated'
  // Marketplace events
  | 'marketplace.item.submitted'
  | 'marketplace.item.approved'
  | 'marketplace.review.created';

export interface PlatformEvent<T = unknown> {
  id: string;
  type: EventType;
  timestamp: Date;
  actorId?: string;
  actorType?: 'user' | 'system' | 'api_key';
  resourceType?: string;
  resourceId?: string;
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