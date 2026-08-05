'use client';

/** Minimal PlatformEvent shape — mirrors @fidscript-deploy/events */
export interface PlatformEvent {
  id: string;
  type: string;
  timestamp: string;
  actorType?: string;
  resourceType?: string;
  resourceId?: string;
  metadata?: Record<string, unknown>;
}

export interface ActivityEvent {
  id: string;
  type: string;
  timestamp: Date;
  actorLabel: string;
  description: string;
  iconType: string;
  iconColor: string;
}

const EVENT_DESCRIPTIONS: Record<string, (m: Record<string, unknown>) => string> = {
  'projects.project.created': () => 'Project created',
  'projects.project.updated': () => 'Project updated',
  'projects.project.deleted': () => 'Project deleted',
  'projects.project.suspended': () => 'Project suspended',
  'projects.project.archived': () => 'Project archived',
  'projects.project.restored': () => 'Project restored',
  'projects.project.cloned': () => 'Project cloned',
  'projects.member.added': (m) => `${m.email ?? 'A member'} added to project`,
  'projects.member.removed': (m) => `${m.email ?? 'A member'} removed from project`,
  'projects.invitation.created': (m) => `Invitation sent to ${m.email ?? 'unknown'}`,
  'projects.invitation.accepted': (m) => `${m.email ?? 'An invitation'} was accepted`,
  'projects.invitation.revoked': () => 'Invitation revoked',
  'projects.api_key.created': (m) => `API key "${m.name ?? 'unnamed'}" created`,
  'projects.api_key.revoked': (m) => `API key "${m.name ?? 'unnamed'}" revoked`,
  'projects.env_var.updated': () => 'Environment variable updated',
  'projects.env_var.deleted': () => 'Environment variable deleted',
  'deployments.deployment.created': () => 'Deployment created',
  'deployments.deployment.queued': () => 'Deployment queued',
  'deployments.deployment.building': () => 'Build in progress',
  'deployments.deployment.deploying': () => 'Deploying',
  'deployments.deployment.succeeded': (m) =>
    m.duration != null ? `Deployment succeeded in ${m.duration}s` : 'Deployment succeeded',
  'deployments.deployment.failed': (m) =>
    m.error ? `Deployment failed: ${m.error}` : 'Deployment failed',
  'deployments.deployment.stopped': () => 'Deployment stopped',
  'deployments.deployment.blocked': () => 'Deployment blocked',
  'deployments.deployment.rolled_back': () => 'Deployment rolled back',
  'function.created': () => 'Function created',
  'function.deployed': () => 'Function deployed',
  'function.invoked': () => 'Function invoked',
  'function.error': (m) => m.error ? `Function error: ${m.error}` : 'Function error',
  'function.deleted': () => 'Function deleted',
  'database.provisioned': () => 'Database provisioned',
  'database.updated': () => 'Database updated',
  'database.deleted': () => 'Database deleted',
  'domain.added': (m) => `Domain "${m.domain ?? ''}" added`,
  'domain.verified': (m) => `Domain "${m.domain ?? ''}" verified`,
  'domain.failed': (m) => `Domain "${m.domain ?? ''}" failed`,
  'domain.deleted': (m) => `Domain "${m.domain ?? ''}" deleted`,
  'storage.bucket.created': (m) => `Bucket "${m.name ?? ''}" created`,
  'storage.bucket.deleted': (m) => `Bucket "${m.name ?? ''}" deleted`,
  'storage.file.uploaded': (m) => `File "${m.key ?? ''}" uploaded`,
  'storage.file.deleted': (m) => `File "${m.key ?? ''}" deleted`,
  'queue.created': (m) => `Queue "${m.name ?? ''}" created`,
  'cron.job_created': (m) => `Cron job "${m.name ?? ''}" created`,
  'cron.job_deleted': (m) => `Cron job "${m.name ?? ''}" deleted`,
  'monitoring.alert_triggered': () => 'Alert triggered',
  'monitoring.alert.resolved': () => 'Alert resolved',
};

export function describeEvent(event: PlatformEvent): string {
  const fn = EVENT_DESCRIPTIONS[event.type];
  if (fn) return fn(event.metadata ?? {});
  const parts = event.type.split('.');
  const verb = (parts[parts.length - 1] ?? event.type).replace(/_/g, ' ');
  const resource = event.resourceType ?? parts.slice(0, -1).join(' ');
  return `${verb.charAt(0).toUpperCase() + verb.slice(1)} ${resource}`;
}

export function iconTypeFor(type: string): string {
  if (type.startsWith('deployments.')) return 'rocket';
  if (type.startsWith('projects.member')) return 'users';
  if (type.startsWith('projects.api_key') || type.startsWith('projects.env_var')) return 'lock';
  if (type.startsWith('projects.invitation')) return 'mail';
  if (type.startsWith('database.') || type.startsWith('storage.')) return 'db';
  if (type.startsWith('domain.')) return 'globe';
  if (type.startsWith('monitoring.alert')) return 'warning';
  if (type.startsWith('cron.') || type.startsWith('queue.') || type.startsWith('function.')) return 'activity';
  return 'activity';
}

export function colorForEvent(type: string): string {
  if (/\.(succeeded|resolved|accepted)$/.test(type)) return 'text-[var(--success)]';
  if (/\.(failed|error|deleted|removed|revoked)$/.test(type)) return 'text-[var(--danger)]';
  if (/\.(created|added|provisioned|deployed|building|deploying|queued)$/.test(type)) return 'text-[var(--accent)]';
  if (/\.(updated|restored|verified)$/.test(type)) return 'text-[var(--warning)]';
  return 'text-[var(--text-muted)]';
}

export function actorLabel(event: PlatformEvent): string {
  if (event.actorType === 'system') return 'System';
  if (event.actorType === 'api_key') return 'API';
  return event.actorType ?? 'User';
}

export function toActivityEvent(event: PlatformEvent): ActivityEvent {
  return {
    id: event.id,
    type: event.type,
    timestamp: new Date(event.timestamp),
    actorLabel: actorLabel(event),
    description: describeEvent(event),
    iconType: iconTypeFor(event.type),
    iconColor: colorForEvent(event.type),
  };
}

export function formatTime(date: Date): string {
  const diff = Date.now() - date.getTime();
  const min = Math.floor(diff / 60000);
  if (min < 1) return 'Just now';
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  return `${Math.floor(hr / 24)}d ago`;
}
