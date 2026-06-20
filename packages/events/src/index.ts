// Event type definitions for FIDScript platform
// All platform actions generate events for auditing and reactivity.
//
// Naming scheme: <domain>.<entity>.<verb>
// Every string emitted by EventService.emit() must be a valid EventType.
// Add new types here — never emit strings outside this union (gate behind typecheck).

export type EventType =
  // Identity events (Phase 03)
  | 'identity.user.registered'
  | 'identity.user.updated'
  | 'identity.user.login_failed'
  | 'identity.user.logged_in'
  | 'identity.user.logged_out'
  | 'identity.user.mfa_setup'
  | 'identity.user.mfa_enabled'
  | 'identity.user.mfa_challenge'
  | 'identity.session.created'
  | 'identity.session.revoked'
  | 'identity.api_key.created'
  | 'identity.api_key.revoked'
  | 'identity.token.refreshed'
  // Legacy aliases (backwards-compat)
  | 'user.created'
  | 'user.login'
  // App-level auth events (project-scoped)
  | 'auth.user_created'
  | 'auth.login_succeeded'
  | 'auth.login_failed'
  | 'auth.magic_code_sent'
  | 'auth.magic_code_verified'
  | 'auth.oauth_linked'
  | 'auth.provider_configured'
  // Project events (Phase 04)
  | 'projects.project.created'
  | 'projects.project.updated'
  | 'projects.project.deleted'
  | 'projects.project.suspended'
  | 'projects.project.archived'
  | 'projects.project.restored'
  | 'projects.project.cloned'
  | 'projects.member.added'
  | 'projects.member.removed'
  | 'projects.invitation.created'
  | 'projects.invitation.accepted'
  | 'projects.invitation.revoked'
  | 'projects.api_key.created'
  | 'projects.api_key.revoked'
  | 'projects.env_var.updated'
  | 'projects.env_var.deleted'
  // Legacy aliases (backwards-compat)
  | 'project.created'
  | 'project.updated'
  | 'project.deleted'
  | 'project.suspended'
  | 'project.archived'
  | 'project.restored'
  | 'project.cloned'
  // Deployment events (Phase 06) — dot notation
  | 'deployments.deployment.created'
  | 'deployments.deployment.queued'
  | 'deployments.deployment.building'
  | 'deployments.deployment.deploying'
  | 'deployments.deployment.succeeded'
  | 'deployments.deployment.failed'
  | 'deployments.deployment.stopped'
  | 'deployments.deployment.blocked'
  | 'deployments.deployment.rolled_back'
  // Legacy aliases (backwards-compat)
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
  // Storage events (Phase 05)
  | 'storage.bucket.created'
  | 'storage.bucket.deleted'
  | 'storage.file.uploaded'
  | 'storage.file.deleted'
  // Realtime events
  | 'realtime.channel_created'
  | 'realtime.channel_deleted'
  | 'realtime.client_joined'
  | 'realtime.client_left'
  | 'realtime.message_sent'
  // Email events
  | 'email.sent'
  | 'email.delivered'
  | 'email.bounced'
  | 'email.received'
  | 'email.opened'
  | 'email.clicked'
  | 'email.complained'
  | 'email.mailbox_created'
  | 'email.mailbox_deleted'
  | 'email.domain_added'
  | 'email.domain_deleted'
  | 'email.domain_verified'
  | 'email.alias_created'
  | 'email.alias_deleted'
  | 'email.identity_created'
  | 'email.identity_deleted'
  | 'email.api_key_created'
  | 'email.api_key_deleted'
  | 'email.webhook_triggered'
  // AI events
  | 'ai.conversation.created'
  | 'ai.conversation.deleted'
  | 'ai.error_diagnosed'
  | 'ai.recommendation.generated'
  | 'ai.deployment.assisted'
  | 'ai.project.generation_assisted'
  // Monitoring events
  | 'monitoring.alert_triggered'
  | 'monitoring.alert.firing'
  | 'monitoring.alert.resolved'
  | 'monitoring.notification.sent'
  | 'monitoring.notification.failed'
  // Logging events (Phase 15)
  | 'logs.log.ingested'
  | 'logs.pruned'
  | 'logs.shipped'
  | 'logs.ship_failed'
  | 'logs.quota_exceeded'
  // Template events
  | 'template.created'
  | 'template.deleted'
  | 'template.project_generated'
  | 'templates.template.applied'
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