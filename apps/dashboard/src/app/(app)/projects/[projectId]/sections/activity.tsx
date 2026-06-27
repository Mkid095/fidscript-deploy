'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { HugeiconsIcon } from '@hugeicons/react';
import { Rocket01Icon, UserGroupIcon, LockPasswordIcon, Mail01Icon, Database02Icon, Globe02Icon, Activity01Icon, UserWarning01Icon, RefreshDotIcon } from '@hugeicons/core-free-icons';
import { Spinner, EmptyState } from '@fidscript/ui';

import type { Project } from '@/types';
import { useAuth } from '@/contexts/auth-context';

/** Minimal PlatformEvent shape — mirrors @fidscript/events */
interface PlatformEvent {
  id: string;
  type: string;
  timestamp: string;
  actorType?: string;
  resourceType?: string;
  resourceId?: string;
  metadata?: Record<string, unknown>;
}

interface Props { project: Project }

interface ActivityEvent {
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

function describeEvent(event: PlatformEvent): string {
  const fn = EVENT_DESCRIPTIONS[event.type];
  if (fn) return fn(event.metadata ?? {});
  const parts = event.type.split('.');
  const verb = (parts[parts.length - 1] ?? event.type).replace(/_/g, ' ');
  const resource = event.resourceType ?? parts.slice(0, -1).join(' ');
  return `${verb.charAt(0).toUpperCase() + verb.slice(1)} ${resource}`;
}

function iconTypeFor(type: string): string {
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

function colorForEvent(type: string): string {
  if (/\.(succeeded|resolved|accepted)$/.test(type)) return 'text-[var(--success)]';
  if (/\.(failed|error|deleted|removed|revoked)$/.test(type)) return 'text-[var(--danger)]';
  if (/\.(created|added|provisioned|deployed|building|deploying|queued)$/.test(type)) return 'text-[var(--accent)]';
  if (/\.(updated|restored|verified)$/.test(type)) return 'text-[var(--warning)]';
  return 'text-[var(--text-muted)]';
}

function actorLabel(event: PlatformEvent): string {
  if (event.actorType === 'system') return 'System';
  if (event.actorType === 'api_key') return 'API';
  return event.actorType ?? 'User';
}

function toActivityEvent(event: PlatformEvent): ActivityEvent {
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

function formatTime(date: Date): string {
  const diff = Date.now() - date.getTime();
  const min = Math.floor(diff / 60000);
  if (min < 1) return 'Just now';
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  return `${Math.floor(hr / 24)}d ago`;
}

function IconForType({ type, className }: { type: string; className?: string }) {
  const iconClass = className ?? 'text-[var(--text-muted)]';
  switch (type) {
    case 'rocket':   return <HugeiconsIcon icon={Rocket01Icon} size={16} color="currentColor" className={iconClass} />;
    case 'users':     return <HugeiconsIcon icon={UserGroupIcon} size={16} color="currentColor" className={iconClass} />;
    case 'lock':      return <HugeiconsIcon icon={LockPasswordIcon} size={16} color="currentColor" className={iconClass} />;
    case 'mail':     return <HugeiconsIcon icon={Mail01Icon} size={16} color="currentColor" className={iconClass} />;
    case 'db':       return <HugeiconsIcon icon={Database02Icon} size={16} color="currentColor" className={iconClass} />;
    case 'globe':    return <HugeiconsIcon icon={Globe02Icon} size={16} color="currentColor" className={iconClass} />;
    case 'warning':  return <HugeiconsIcon icon={UserWarning01Icon} size={16} color="currentColor" className={iconClass} />;
    default:         return <HugeiconsIcon icon={Activity01Icon} size={16} color="currentColor" className={iconClass} />;
  }
}

export function ActivityFeed({ project }: Props) {
  const { getSdk } = useAuth();
  const [events, setEvents] = useState<ActivityEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [connected, setConnected] = useState(false);
  const rtRef = useRef<{ disconnect?: () => void } | null>(null);

  const loadInitial = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const sdk = getSdk();
      const raw = await sdk.projects.getEvents(project.id, 50);
      const arr: PlatformEvent[] = Array.isArray(raw) ? raw as PlatformEvent[] : [];
      setEvents(arr.map(toActivityEvent));
    } catch {
      setError('Could not load events');
    } finally {
      setLoading(false);
    }
  }, [project.id, getSdk]);

  useEffect(() => {
    let cancelled = false;

    async function connectRealtime() {
      try {
        const sdk = getSdk();
        const rt = (sdk as { realtime?: typeof sdk.realtime }).realtime;
        if (!rt) return;

        const token = localStorage.getItem('fidscript_access_token')
          ?? localStorage.getItem('fidscript_token');
        if (!token) return;

        // Pass a getter so socket.io re-reads the (possibly refreshed) JWT on
        // every reconnect instead of pinning a token that may expire mid-session.
        await rt.connect(() => localStorage.getItem('fidscript_access_token') ?? localStorage.getItem('fidscript_token') ?? '', project.id);
        if (cancelled) { rt.disconnect?.(); return; }

        setConnected(true);

        const unsub = rt.subscribeProject(project.id, (event: unknown) => {
          if (cancelled) return;
          setEvents(prev => [toActivityEvent(event as PlatformEvent), ...prev].slice(0, 100));
        });
        rtRef.current = { disconnect: () => { unsub(); rt.disconnect?.(); } };
      } catch {
        if (!cancelled) setConnected(false);
      }
    }

    loadInitial();
    connectRealtime();

    return () => {
      cancelled = true;
      rtRef.current?.disconnect?.();
    };
  }, [project.id, getSdk, loadInitial]);

  if (loading) return <div className="py-8 text-center"><Spinner size="md" /></div>;
  if (error) return <p className="text-[var(--danger)] text-sm">{error}</p>;

  return (
    <div className="flex flex-col gap-0">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <span className={`w-2 h-2 rounded-full ${connected ? 'bg-emerald-400' : 'bg-slate-600'}`} />
          <span className="text-xs text-[var(--text-muted)]">{connected ? 'Live' : 'Polling'}</span>
        </div>
        <button
          onClick={loadInitial}
          className="flex items-center gap-1 text-xs text-[var(--text-muted)] hover:text-[var(--text-muted)] transition-colors"
        >
          <HugeiconsIcon icon={RefreshDotIcon} size={12} color="currentColor" />
          Refresh
        </button>
      </div>

      {events.length === 0 ? (
        <EmptyState
          title="No activity yet"
          description="Project events will appear here as they happen."
        />
      ) : (
        <div className="flex flex-col">
          {events.map(event => (
            <div
              key={event.id}
              className="flex items-start gap-3 py-3 border-b border-[var(--rail)]/50 last:border-0"
            >
              <div className={`mt-0.5 flex-shrink-0 ${event.iconColor}`}>
                <IconForType type={event.iconType} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-[var(--text-muted)] leading-snug">{event.description}</p>
                <p className="text-xs text-[var(--text-dim)] mt-0.5">
                  {event.actorLabel}
                </p>
              </div>
              <span className="text-xs text-[var(--text-dim)] flex-shrink-0 mt-0.5">
                {formatTime(event.timestamp)}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
