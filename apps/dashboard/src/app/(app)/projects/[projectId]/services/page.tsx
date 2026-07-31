'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Card, Button, Badge, EmptyState, Spinner } from '@fidscript/ui';
import { HugeiconsIcon } from '@hugeicons/react';
import {
  Rocket01Icon,
  GitBranchIcon,
  Add01Icon,
  CheckmarkCircle01Icon,
  StopCircleIcon,
  PlayCircleIcon,
  RefreshIcon,
  GlobeIcon,
  GithubIcon,
  ArrowRight01Icon,
  MoreHorizontalIcon,
  File01Icon,
  Delete01Icon,
  CirclePlusIcon,
  ChevronDownIcon,
} from '@hugeicons/core-free-icons';

import { ToastProvider, useToast } from '@/components/toast-provider';
import { useAuth } from '@/contexts/auth-context';
import type { Project, Deployment } from '@/types';
import { useProjectContext } from '@/contexts/project-context';

// ── Status helpers ────────────────────────────────────────────────────────────

const IN_FLIGHT_STATUSES = new Set(['PENDING', 'QUEUED', 'BUILDING', 'DEPLOYING']);
const TERMINAL_STATUSES = new Set(['SUCCESS', 'FAILED', 'STOPPED', 'ROLLED_BACK', 'BLOCKED']);

function statusMeta(status?: string) {
  switch (status?.toUpperCase()) {
    case 'SUCCESS':     return { label: 'Live',       variant: 'success' as const, dot: 'bg-emerald-400' };
    case 'FAILED':      return { label: 'Failed',     variant: 'danger' as const, dot: 'bg-red-500' };
    case 'PENDING':     return { label: 'Pending',    variant: 'info' as const, dot: 'bg-blue-400 animate-pulse' };
    case 'QUEUED':      return { label: 'Queued',     variant: 'info' as const, dot: 'bg-blue-400 animate-pulse' };
    case 'BUILDING':    return { label: 'Building',   variant: 'warning' as const, dot: 'bg-amber-400 animate-pulse' };
    case 'DEPLOYING':   return { label: 'Deploying',  variant: 'warning' as const, dot: 'bg-amber-400 animate-pulse' };
    case 'STOPPED':     return { label: 'Stopped',    variant: 'default' as const, dot: 'bg-slate-500' };
    case 'ROLLED_BACK': return { label: 'Rolled back', variant: 'warning' as const, dot: 'bg-purple-500' };
    case 'BLOCKED':     return { label: 'Blocked',    variant: 'warning' as const, dot: 'bg-orange-400' };
    default:            return { label: status ?? 'Unknown', variant: 'default' as const, dot: 'bg-slate-600' };
  }
}

function isInFlight(s?: string) { return IN_FLIGHT_STATUSES.has(s?.toUpperCase() ?? ''); }
function isTerminal(s?: string) { return TERMINAL_STATUSES.has(s?.toUpperCase() ?? ''); }

function relativeTime(iso?: string): string {
  if (!iso) return '—';
  const diff = Date.now() - new Date(iso).getTime();
  const s = Math.floor(diff / 1000);
  if (s < 5) return 'just now';
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

function formatDuration(start: string, end?: string | null): string {
  if (!end) return 'In progress';
  const s = Math.round((new Date(end).getTime() - new Date(start).getTime()) / 1000);
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60); const r = s % 60;
  if (m < 60) return r > 0 ? `${m}m ${r}s` : `${m}m`;
  return `${Math.floor(m / 60)}h ${m % 60}m`;
}

function extractRepoKey(url?: string): string | null {
  if (!url) return null;
  const m = url.match(/github\.com\/([^/]+\/[^/]+)/) || url.match(/^([^/]+\/[^/]+\.git)$/);
  return m ? m[1].replace(/\.git$/, '') : null;
}

// ── Types ─────────────────────────────────────────────────────────────────────

interface ServiceGroup {
  name: string;
  deployments: Deployment[];
}

// ── Service card ──────────────────────────────────────────────────────────────

function ServiceCard({ service, projectId, onAction, isExpanded, onToggle }: {
  service: ServiceGroup;
  projectId: string;
  onAction: (id: string, action: string) => void;
  isExpanded: boolean;
  onToggle: () => void;
}) {
  const router = useRouter();
  const latest = service.deployments[0];
  const meta = latest ? statusMeta(latest.status) : statusMeta(undefined);
  const inFlight = latest ? isInFlight(latest.status) : false;
  const activeCount = service.deployments.filter(d => isInFlight(d.status)).length;
  const latestDetail = latest?.id;

  return (
    <Card className="border border-[var(--rail)] overflow-hidden flex flex-col hover:border-[var(--rail-light)] transition-colors">
      {/* Header — clickable to expand */}
      <button
        onClick={onToggle}
        className="flex items-start gap-3 px-4 py-3.5 text-left w-full hover:bg-[var(--rail)]/30 transition-colors"
      >
        <HugeiconsIcon
          icon={ArrowRight01Icon}
          size={14}
          className={`text-[var(--text-dim)] flex-shrink-0 mt-0.5 transition-transform duration-200 ${isExpanded ? 'rotate-90' : ''}`}
        />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="text-sm font-semibold text-[var(--text)]">{service.name}</h3>
            <Badge variant={meta.variant} className="text-[10px]">
              {inFlight ? `${meta.label}…` : meta.label}
            </Badge>
          </div>
          <p className="text-xs text-[var(--text-muted)] mt-0.5">
            {activeCount > 0 ? (
              <span className="text-[var(--warning)]">{activeCount} active</span>
            ) : null}
            {activeCount > 0 && ' · '}
            {service.deployments.length} deployment{service.deployments.length !== 1 ? 's' : ''}
          </p>
        </div>
      </button>

      {/* Latest deploy info */}
      {latest && (
        <div className="px-4 py-3 border-t border-[var(--rail)]/60 bg-[var(--surface-2)]/30">
          <div className="flex items-center gap-2 text-xs text-[var(--text-muted)] flex-wrap">
            {latest.branch && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-[var(--rail)] rounded text-[var(--text-dim)]">
                <HugeiconsIcon icon={GitBranchIcon} size={10} />
                {latest.branch}
              </span>
            )}
            {latest.commitSha && (
              <code className="text-[10px] font-mono text-[var(--text-dim)] bg-[var(--rail)] px-1.5 py-0.5 rounded">
                {latest.commitSha.slice(0, 7)}
              </code>
            )}
            <span className="text-[10px] text-[var(--text-dim)] ml-auto">{relativeTime(latest.createdAt)}</span>
          </div>
          {latest.deploymentUrl && !inFlight && (
            <a
              href={latest.deploymentUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-2 inline-flex items-center gap-1.5 text-xs text-[var(--accent)] hover:text-[var(--accent)] transition-colors max-w-full group"
            >
              <HugeiconsIcon icon={GlobeIcon} size={12} className="flex-shrink-0" />
              <span className="truncate group-hover:underline">{latest.deploymentUrl.replace(/^https?:\/\//, '')}</span>
            </a>
          )}
        </div>
      )}

      {/* Actions row */}
      <div className="flex items-center gap-2 px-4 py-2.5 border-t border-[var(--rail)]/60 mt-auto">
        {latestDetail && (
          <Link
            href={`/projects/${projectId}/deployments/${latestDetail}`}
            className="text-xs text-[var(--accent)] hover:text-[var(--accent)] transition-colors font-medium"
          >
            View history
          </Link>
        )}
        <div className="flex items-center gap-1 ml-auto">
          {inFlight && (
            <button
              onClick={() => onAction(latest!.id, 'stop')}
              className="p-1.5 rounded-lg text-[var(--text-dim)] hover:text-[var(--warning)] hover:bg-[var(--hover)] transition-colors"
              title="Stop deployment"
            >
              <HugeiconsIcon icon={StopCircleIcon} size={14} />
            </button>
          )}
          {(latest?.status === 'STOPPED' || latest?.status === 'FAILED') && (
            <button
              onClick={() => onAction(latest!.id, 'restart')}
              className="p-1.5 rounded-lg text-[var(--text-dim)] hover:text-[var(--success)] hover:bg-[var(--hover)] transition-colors"
              title="Restart deployment"
            >
              <HugeiconsIcon icon={PlayCircleIcon} size={14} />
            </button>
          )}
          <button
            onClick={() => onAction(latest!.id, 'delete')}
            className="p-1.5 rounded-lg text-[var(--text-dim)] hover:text-[var(--danger)] hover:bg-[var(--hover)] transition-colors"
            title="Delete deployment"
          >
            <HugeiconsIcon icon={Delete01Icon} size={14} />
          </button>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={e => { e.stopPropagation(); router.push(`/projects/${projectId}/services/new`); }}
          className="flex items-center gap-1.5 text-xs ml-2"
        >
          <HugeiconsIcon icon={CirclePlusIcon} size={12} />
          New
        </Button>
      </div>

      {/* Expandable history */}
      {isExpanded && (
        <div className="border-t border-[var(--rail)] divide-y divide-[var(--rail)]/50">
          {service.deployments.slice(0, 5).map((d, i) => (
            <DeploymentRow
              key={d.id}
              deployment={d}
              projectId={projectId}
              onAction={onAction}
              isFirst={i === 0}
            />
          ))}
          {service.deployments.length > 5 && (
            <div className="py-2 px-4 text-center">
              <Link
                href={`/projects/${projectId}/deployments/${latestDetail}`}
                className="text-xs text-[var(--accent)] hover:text-[var(--accent)] transition-colors"
              >
                View all {service.deployments.length} deployments →
              </Link>
            </div>
          )}
        </div>
      )}
    </Card>
  );
}

// ── Deployment row ────────────────────────────────────────────────────────────

function DeploymentRow({ deployment, projectId, onAction, isFirst }: {
  deployment: Deployment;
  projectId: string;
  onAction: (id: string, action: string) => void;
  isFirst?: boolean;
}) {
  const meta = statusMeta(deployment.status);
  const inFlight = isInFlight(deployment.status);
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div className={`py-2.5 px-4 transition-colors ${isFirst ? 'bg-[var(--surface-2)]/20' : 'hover:bg-[var(--rail)]/30'}`}>
      {/* Status row */}
      <div className="flex items-center gap-2">
        <span className={`w-2 h-2 rounded-full flex-shrink-0 ${meta.dot}`} />
        <Badge variant={meta.variant} className="text-[10px]">{meta.label}</Badge>
        {deployment.branch && (
          <span className="flex items-center gap-1 text-xs text-[var(--text-dim)]">
            <HugeiconsIcon icon={GitBranchIcon} size={10} />
            {deployment.branch}
          </span>
        )}
        {deployment.commitSha && (
          <code className="text-[10px] font-mono text-[var(--text-dim)] bg-[var(--rail)] px-1.5 py-0.5 rounded">
            {deployment.commitSha.slice(0, 7)}
          </code>
        )}
        <div className="flex items-center gap-2 ml-auto">
          <span className="text-[10px] text-[var(--text-dim)]">
            {deployment.completedAt ? formatDuration(deployment.createdAt, deployment.completedAt) : '—'}
          </span>
          <span className="text-[10px] text-[var(--text-dim)]">·</span>
          <span className="text-[10px] text-[var(--text-dim)]">{relativeTime(deployment.createdAt)}</span>
        </div>
      </div>

      {/* Actions row */}
      <div className="flex items-center gap-2 mt-1.5">
        {deployment.deploymentUrl && !inFlight && (
          <a
            href={deployment.deploymentUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 text-[10px] text-[var(--accent)] hover:text-[var(--accent)] transition-colors"
          >
            <HugeiconsIcon icon={GlobeIcon} size={10} />
            <span className="truncate max-w-[120px]">{deployment.deploymentUrl.replace(/^https?:\/\//, '')}</span>
          </a>
        )}
        <div className="flex items-center gap-1 ml-auto">
          <Link
            href={`/projects/${projectId}/deployments/${deployment.id}`}
            className="p-1.5 rounded-lg text-[var(--text-dim)] hover:text-[var(--text-muted)] hover:bg-[var(--hover)] transition-colors"
            title="View details"
          >
            <HugeiconsIcon icon={File01Icon} size={13} />
          </Link>
          <div className="relative">
            <button
              onClick={() => setMenuOpen(v => !v)}
              className="p-1.5 rounded-lg text-[var(--text-dim)] hover:text-[var(--text-muted)] hover:bg-[var(--hover)] transition-colors"
              aria-label="More actions"
            >
              <HugeiconsIcon icon={MoreHorizontalIcon} size={13} />
            </button>
            {menuOpen && (
              <div className="absolute right-0 mt-1 w-36 bg-[var(--surface-2)] border border-[var(--rail)] rounded-lg shadow-xl py-1 z-20">
                {inFlight && (
                  <button
                    onClick={() => { setMenuOpen(false); onAction(deployment.id, 'stop'); }}
                    className="flex items-center gap-2 w-full px-3 py-2 text-xs text-[var(--warning)] hover:bg-[var(--rail)]"
                  >
                    <HugeiconsIcon icon={StopCircleIcon} size={12} /> Stop
                  </button>
                )}
                {(deployment.status === 'STOPPED' || deployment.status === 'FAILED') && (
                  <button
                    onClick={() => { setMenuOpen(false); onAction(deployment.id, 'restart'); }}
                    className="flex items-center gap-2 w-full px-3 py-2 text-xs text-[var(--success)] hover:bg-[var(--rail)]"
                  >
                    <HugeiconsIcon icon={PlayCircleIcon} size={12} /> Restart
                  </button>
                )}
                <button
                  onClick={() => { setMenuOpen(false); onAction(deployment.id, 'delete'); }}
                  className="flex items-center gap-2 w-full px-3 py-2 text-xs text-[var(--danger)] hover:bg-[var(--rail)]"
                >
                  <HugeiconsIcon icon={Delete01Icon} size={12} /> Delete
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Loading skeleton ───────────────────────────────────────────────────────────

function ServicesSkeleton() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
      {[1, 2, 3, 4, 5, 6].map(i => (
        <Card key={i} className="border border-[var(--rail)] overflow-hidden">
          <div className="p-4 animate-pulse">
            <div className="flex items-start gap-3">
              <div className="w-4 h-4 rounded bg-[var(--rail)]" />
              <div className="flex-1 space-y-2.5">
                <div className="h-4 bg-[var(--rail)] rounded w-2/3" />
                <div className="h-3 bg-[var(--rail)] rounded w-1/3" />
              </div>
              <div className="h-5 w-14 bg-[var(--rail)] rounded-full" />
            </div>
            <div className="mt-3 pt-3 border-t border-[var(--rail)]">
              <div className="flex items-center gap-2">
                <div className="h-2 w-16 bg-[var(--rail)] rounded" />
                <div className="h-2 w-12 bg-[var(--rail)] rounded" />
              </div>
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}

// ── Main section ──────────────────────────────────────────────────────────────

function ServicesSectionInner({ project }: { project: Project }) {
  const router = useRouter();
  const { getSdk } = useAuth();
  const { showToast } = useToast();

  const [deployments, setDeployments] = useState<Deployment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [githubStatus, setGithubStatus] = useState<{ connected: boolean } | null>(null);
  const [connecting, setConnecting] = useState(false);
  const [expandedServices, setExpandedServices] = useState<Set<string>>(new Set());
  const rtRef = useRef<{ disconnect: () => void } | null>(null);

  // Group deployments into services
  const services: ServiceGroup[] = (() => {
    const map = new Map<string, Deployment[]>();
    for (const d of deployments) {
      const key = (d as any).serviceName || extractRepoKey(d.sourceUrl) || 'default';
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(d);
    }
    return Array.from(map.entries()).map(([name, depls]) => ({
      name,
      deployments: depls.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
    }));
  })();

  const healthyCount = services.filter(s => s.deployments[0]?.status === 'SUCCESS').length;
  const activeCount = services.filter(s => isInFlight(s.deployments[0]?.status)).length;

  const load = useCallback(async () => {
    try {
      const sdk = getSdk();
      const data = await sdk.deployments.list(project.id, { limit: 100 });
      setDeployments((data as any).deployments ?? (Array.isArray(data) ? data : []));
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load services');
    } finally {
      setLoading(false);
    }
  }, [project.id, getSdk]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    getSdk().github.status().then(s => setGithubStatus(s)).catch(() => setGithubStatus({ connected: false }));
  }, [getSdk]);

  // ── Realtime ─────────────────────────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;
    async function connectRealtime() {
      try {
        const sdk = getSdk();
        const rt = (sdk as { realtime?: typeof sdk.realtime }).realtime;
        if (!rt) return;
        const token = localStorage.getItem('fidscript_access_token') ?? localStorage.getItem('fidscript_token');
        if (!token) return;

        await rt.connect(() => localStorage.getItem('fidscript_access_token') ?? localStorage.getItem('fidscript_token') ?? '', project.id);
        if (cancelled) { rt.disconnect?.(); return; }

        const unsub = rt.subscribeDeployments(project.id, (event: any) => {
          const meta = event?.data ?? event?.metadata ?? event;
          const deploymentId = meta.deploymentId;
          const eventType: string = event?.type ?? '';

          const statusMap: Record<string, string> = {
            'deployments.deployment.queued': 'QUEUED',
            'deployments.deployment.building': 'BUILDING',
            'deployments.deployment.deploying': 'DEPLOYING',
            'deployments.deployment.succeeded': 'SUCCESS',
            'deployments.deployment.failed': 'FAILED',
            'deployments.deployment.stopped': 'STOPPED',
            'deployments.deployment.blocked': 'BLOCKED',
            'deployments.deployment.rolled_back': 'ROLLED_BACK',
          };
          const newStatus = statusMap[eventType];

          if (newStatus && deploymentId) {
            setDeployments(prev => prev.map(d =>
              d.id === deploymentId ? { ...d, status: newStatus } : d,
            ));
          }

          if (newStatus && isTerminal(newStatus)) {
            setTimeout(() => load(), 500);
          }
        });
        rtRef.current = { disconnect: () => { unsub(); rt.disconnect?.(); } };
      } catch {
        // Realtime is best-effort
      }
    }
    connectRealtime();
    return () => {
      cancelled = true;
      rtRef.current?.disconnect?.();
    };
  }, [project.id, getSdk, load]);

  async function handleConnectGithub() {
    setConnecting(true);
    try {
      await getSdk().github.connect();
      const status = await getSdk().github.status();
      setGithubStatus(status);
      showToast({ type: 'success', message: `Connected to GitHub as ${status.username}` });
    } catch (err) {
      showToast({ type: 'error', message: err instanceof Error ? err.message : 'Failed to connect GitHub' });
    } finally {
      setConnecting(false);
    }
  }

  async function handleAction(id: string, action: string) {
    try {
      const sdk = getSdk();
      if (action === 'stop')     { await sdk.deployments.stop(project.id, id); showToast({ type: 'success', message: 'Deployment stopping.' }); }
      if (action === 'restart')  { await sdk.deployments.restart(project.id, id); showToast({ type: 'success', message: 'Deployment restarting.' }); }
      if (action === 'delete')   {
        if (!confirm('Delete this deployment? This cannot be undone.')) return;
        await sdk.deployments.destroy(project.id, id);
        showToast({ type: 'success', message: 'Deployment deleted.' });
      }
      await load();
    } catch (err) {
      showToast({ type: 'error', message: err instanceof Error ? err.message : 'Action failed' });
    }
  }

  function toggleService(name: string) {
    setExpandedServices(prev => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name); else next.add(name);
      return next;
    });
  }

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-6 space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-[var(--text)]">Services</h1>
          <p className="text-sm text-[var(--text-muted)] mt-0.5">
            {loading ? (
              'Loading…'
            ) : (
              <>
                {services.length} service{services.length !== 1 ? 's' : ''}
                {healthyCount > 0 && ` · ${healthyCount} live`}
                {activeCount > 0 && <span className="text-[var(--warning)]"> · {activeCount} active</span>}
              </>
            )}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={load} className="text-[var(--text-muted)]" aria-label="Refresh">
            <HugeiconsIcon icon={RefreshIcon} size={14} />
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={() => router.push(`/projects/${project.id}/services/new`)}
            className="flex items-center gap-1.5"
          >
            <HugeiconsIcon icon={Add01Icon} size={13} />
            New service
          </Button>
        </div>
      </div>

      {/* Error */}
      {error && (
        <Card className="border border-[var(--danger)]/30 py-3 px-4 bg-[var(--danger)]/5">
          <p className="text-sm text-[var(--danger)]">{error}</p>
        </Card>
      )}

      {/* Loading */}
      {loading && <ServicesSkeleton />}

      {/* Empty state */}
      {!loading && services.length === 0 && (
        <EmptyState
          icon={
            <div className="w-16 h-16 rounded-2xl bg-[var(--rail)] border border-[var(--rail-light)] flex items-center justify-center">
              <HugeiconsIcon icon={Rocket01Icon} size={32} className="text-[var(--text-muted)]" />
            </div>
          }
          title="Deploy your first service"
          description="Connect a Git provider or upload an archive to deploy your first service. Each service gets its own deployment history."
          action={
            <div className="flex flex-col sm:flex-row items-center gap-3 mt-2">
              <Button
                variant="primary"
                size="sm"
                onClick={() => router.push(`/projects/${project.id}/services/new`)}
                className="flex items-center gap-1.5"
              >
                <HugeiconsIcon icon={Add01Icon} size={13} />
                Create service
              </Button>
              {!githubStatus?.connected && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleConnectGithub}
                  disabled={connecting}
                  className="flex items-center gap-1.5 text-[var(--text-muted)]"
                >
                  {connecting ? (
                    <Spinner size="sm" />
                  ) : (
                    <HugeiconsIcon icon={GithubIcon} size={13} />
                  )}
                  Connect GitHub
                </Button>
              )}
            </div>
          }
        />
      )}

      {/* Service grid */}
      {!loading && services.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {services.map(svc => (
            <ServiceCard
              key={svc.name}
              service={svc}
              projectId={project.id}
              onAction={handleAction}
              isExpanded={expandedServices.has(svc.name)}
              onToggle={() => toggleService(svc.name)}
            />
          ))}
        </div>
      )}

      {/* All healthy footer */}
      {!loading && services.length > 0 && !activeCount && (
        <div className="flex items-center justify-center gap-2 py-3 text-xs text-[var(--text-dim)]">
          <HugeiconsIcon icon={CheckmarkCircle01Icon} size={14} className="text-[var(--success)]" />
          All services are healthy
        </div>
      )}
    </div>
  );
}

export default function ServicesPage() {
  const { project } = useProjectContext();
  if (!project) {
    return (
      <div className="flex items-center justify-center h-64">
        <Spinner size="md" />
      </div>
    );
  }
  return (
    <ToastProvider>
      <ServicesSectionInner project={project} />
    </ToastProvider>
  );
}
