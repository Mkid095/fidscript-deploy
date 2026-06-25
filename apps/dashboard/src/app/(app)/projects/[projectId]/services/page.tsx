'use client';

/**
 * Services page — responsive card grid of deployment services.
 *
 * Each "service" is a logical grouping of deployments sharing the same source
 * repo (or archive name). Rendered as a responsive grid:
 *   1 column on mobile, 2 on tablet (md), 3 on large desktop (xl).
 *
 * Realtime: subscribes to deployment events via the SDK realtime module so
 * status badges and history update live without manual refresh. Falls back
 * to polling-free REST on realtime failure.
 *
 * Empty state: routes to /services/new (the deploy wizard) instead of a modal.
 */
import { useEffect, useState, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Card, Button, Spinner } from '@fidscript/ui';
import { HugeiconsIcon } from '@hugeicons/react';
import {
  Rocket01Icon,
  GitBranchIcon,
  Add01Icon,
  CheckmarkCircle02Icon,
  StopCircleIcon,
  PlayCircleIcon,
  RefreshIcon,
  GlobeIcon,
  GithubIcon,
  SourceCodeIcon,
  MoreHorizontalIcon,
  File01Icon,
  Delete01Icon,
  ArrowRight01Icon,
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
    case 'SUCCESS':     return { label: 'Live',       badge: 'bg-emerald-900/60 text-emerald-400 border-emerald-800', dot: 'bg-emerald-500' };
    case 'FAILED':      return { label: 'Failed',     badge: 'bg-red-900/60 text-red-400 border-red-800',             dot: 'bg-red-500' };
    case 'PENDING':     return { label: 'Pending',    badge: 'bg-blue-900/60 text-blue-400 border-blue-800',          dot: 'bg-blue-500 animate-pulse' };
    case 'QUEUED':      return { label: 'Queued',     badge: 'bg-blue-900/60 text-blue-400 border-blue-800',          dot: 'bg-blue-500 animate-pulse' };
    case 'BUILDING':    return { label: 'Building',   badge: 'bg-amber-900/60 text-amber-400 border-amber-800',       dot: 'bg-amber-500 animate-pulse' };
    case 'DEPLOYING':   return { label: 'Deploying',  badge: 'bg-amber-900/60 text-amber-400 border-amber-800',       dot: 'bg-amber-500 animate-pulse' };
    case 'STOPPED':     return { label: 'Stopped',    badge: 'bg-slate-800 text-slate-400 border-slate-700',          dot: 'bg-slate-500' };
    case 'ROLLED_BACK': return { label: 'Rolled back',badge: 'bg-purple-900/60 text-purple-400 border-purple-800',    dot: 'bg-purple-500' };
    case 'BLOCKED':     return { label: 'Blocked',    badge: 'bg-orange-900/60 text-orange-400 border-orange-800',    dot: 'bg-orange-500' };
    default:            return { label: status ?? 'Unknown', badge: 'bg-slate-800 text-slate-400 border-slate-700',    dot: 'bg-slate-600' };
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

// ── Deployment row (responsive) ───────────────────────────────────────────────

function DeploymentRow({ deployment, projectId, onAction }: {
  deployment: Deployment;
  projectId: string;
  onAction: (id: string, action: string) => void;
}) {
  const meta = statusMeta(deployment.status);
  const inFlight = isInFlight(deployment.status);
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div className="py-2.5 px-4 hover:bg-[#1e2130]/40 transition-colors border-t border-[#1e2130]/50">
      {/* Line 1: status + ref (always visible) */}
      <div className="flex items-center gap-2">
        <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${meta.dot}`} />
        <span className={`text-[10px] px-1.5 py-0.5 rounded border capitalize font-medium ${meta.badge}`}>{meta.label}</span>
        {deployment.branch && (
          <span className="flex items-center gap-1 text-xs text-slate-400 min-w-0">
            <HugeiconsIcon icon={GitBranchIcon} size={10} className="text-slate-600 flex-shrink-0" />
            <span className="truncate">{deployment.branch}</span>
          </span>
        )}
        {deployment.commitSha && (
          <code className="text-[10px] font-mono text-slate-600 bg-[#1e2130] px-1.5 py-0.5 rounded flex-shrink-0">
            {deployment.commitSha.slice(0, 7)}
          </code>
        )}
      </div>

      {/* Line 2: duration + when + actions (desktop: inline; mobile: wraps) */}
      <div className="flex items-center gap-3 mt-1.5 flex-wrap">
        <span className="text-[10px] text-slate-600">
          {deployment.completedAt ? formatDuration(deployment.createdAt, deployment.completedAt) : '—'}
        </span>
        <span className="text-[10px] text-slate-600">·</span>
        <span className="text-[10px] text-slate-600">{relativeTime(deployment.createdAt)}</span>
        {deployment.deploymentUrl && (
          <a href={deployment.deploymentUrl} target="_blank" rel="noopener noreferrer"
            className="flex items-center gap-1 text-[10px] text-blue-500 hover:text-blue-400 transition-colors ml-auto">
            <HugeiconsIcon icon={GlobeIcon} size={10} />
            <span className="truncate max-w-[100px]">{deployment.deploymentUrl.replace(/^https?:\/\//, '')}</span>
          </a>
        )}

        {/* Desktop actions */}
        <div className="hidden sm:flex items-center gap-1 ml-auto">
          <Link href={`/projects/${projectId}/deployments/${deployment.id}`}
            className="p-1.5 rounded text-slate-600 hover:text-slate-300 hover:bg-[#1e2130] transition-colors">
            <HugeiconsIcon icon={File01Icon} size={12} />
          </Link>
          {inFlight && (
            <button onClick={() => onAction(deployment.id, 'stop')}
              className="p-1.5 rounded text-slate-600 hover:text-amber-400 hover:bg-[#1e2130] transition-colors">
              <HugeiconsIcon icon={StopCircleIcon} size={12} />
            </button>
          )}
          {(deployment.status === 'STOPPED' || deployment.status === 'FAILED') && (
            <button onClick={() => onAction(deployment.id, 'restart')}
              className="p-1.5 rounded text-slate-600 hover:text-emerald-400 hover:bg-[#1e2130] transition-colors">
              <HugeiconsIcon icon={PlayCircleIcon} size={12} />
            </button>
          )}
        </div>

        {/* Mobile kebab menu */}
        <div className="sm:relative ml-auto">
          <button
            onClick={() => setMenuOpen(v => !v)}
            className="sm:hidden p-1.5 rounded text-slate-600 hover:text-slate-300 hover:bg-[#1e2130] transition-colors"
            aria-label="Deployment actions"
            aria-expanded={menuOpen}
          >
            <HugeiconsIcon icon={MoreHorizontalIcon} size={14} />
          </button>
          {menuOpen && (
            <div className="sm:hidden absolute right-0 mt-1 w-40 bg-[#0f1117] border border-[#1e2130] rounded-lg shadow-xl py-1 z-10">
              <Link href={`/projects/${projectId}/deployments/${deployment.id}`}
                onClick={() => setMenuOpen(false)}
                className="flex items-center gap-2 px-3 py-2 text-xs text-slate-300 hover:bg-[#1e2130]">
                <HugeiconsIcon icon={File01Icon} size={12} /> View detail
              </Link>
              {inFlight && (
                <button onClick={() => { setMenuOpen(false); onAction(deployment.id, 'stop'); }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-xs text-amber-400 hover:bg-[#1e2130]">
                  <HugeiconsIcon icon={StopCircleIcon} size={12} /> Stop
                </button>
              )}
              {(deployment.status === 'STOPPED' || deployment.status === 'FAILED') && (
                <button onClick={() => { setMenuOpen(false); onAction(deployment.id, 'restart'); }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-xs text-emerald-400 hover:bg-[#1e2130]">
                  <HugeiconsIcon icon={PlayCircleIcon} size={12} /> Restart
                </button>
              )}
              <button onClick={() => { setMenuOpen(false); onAction(deployment.id, 'delete'); }}
                className="w-full flex items-center gap-2 px-3 py-2 text-xs text-red-400 hover:bg-[#1e2130]">
                <HugeiconsIcon icon={Delete01Icon} size={12} /> Delete
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
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
    <Card className="border border-[#1e2130] overflow-hidden flex flex-col">
      {/* Header */}
      <div
        className="flex items-start gap-3 px-4 py-3 cursor-pointer hover:bg-[#1e2130]/30 transition-colors"
        onClick={onToggle}
      >
        <HugeiconsIcon
          icon={ArrowRight01Icon}
          size={14}
          className={`text-slate-600 flex-shrink-0 mt-0.5 transition-transform ${isExpanded ? 'rotate-90' : ''}`}
        />
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-semibold text-slate-200 truncate">{service.name}</h3>
          <p className="text-xs text-slate-500">
            {activeCount > 0 ? `${activeCount} active · ` : ''}
            {service.deployments.length} deployment{service.deployments.length !== 1 ? 's' : ''}
          </p>
        </div>
        <span className={`text-[10px] px-2 py-0.5 rounded-full border capitalize font-medium flex-shrink-0 ${meta.badge}`}>
          {inFlight ? `${meta.label}…` : meta.label}
        </span>
      </div>

      {/* Latest deploy summary */}
      {latest && (
        <div className="px-4 py-2.5 border-t border-[#1e2130]/50 bg-[#080a0d]/30">
          <div className="flex items-center gap-2 text-xs text-slate-400 flex-wrap">
            {latest.branch && (
              <span className="flex items-center gap-1">
                <HugeiconsIcon icon={GitBranchIcon} size={11} className="text-slate-600" />
                {latest.branch}
              </span>
            )}
            {latest.commitSha && (
              <code className="text-[10px] font-mono text-slate-600 bg-[#1e2130] px-1.5 py-0.5 rounded">
                {latest.commitSha.slice(0, 7)}
              </code>
            )}
            <span className="text-[10px] text-slate-600 ml-auto">{relativeTime(latest.createdAt)}</span>
          </div>
          {latest.deploymentUrl && !inFlight && (
            <a href={latest.deploymentUrl} target="_blank" rel="noopener noreferrer"
              className="mt-2 inline-flex items-center gap-1 text-xs text-blue-500 hover:text-blue-400 transition-colors max-w-full">
              <HugeiconsIcon icon={GlobeIcon} size={11} className="flex-shrink-0" />
              <span className="truncate">{latest.deploymentUrl.replace(/^https?:\/\//, '')}</span>
            </a>
          )}
        </div>
      )}

      {/* Actions row */}
      <div className="flex items-center gap-2 px-4 py-2.5 border-t border-[#1e2130]/50 mt-auto">
        {latestDetail && (
          <Link href={`/projects/${projectId}/deployments/${latestDetail}`}
            className="text-xs text-blue-500 hover:text-blue-400 transition-colors">
            View history
          </Link>
        )}
        <Button
          variant="ghost"
          size="sm"
          onClick={e => { e.stopPropagation(); router.push(`/projects/${projectId}/services/new`); }}
          className="ml-auto flex items-center gap-1 text-xs"
        >
          <HugeiconsIcon icon={Add01Icon} size={11} />
          New version
        </Button>
      </div>

      {/* Expandable history */}
      {isExpanded && (
        <div className="border-t border-[#1e2130]">
          {service.deployments.map(d => (
            <DeploymentRow
              key={d.id}
              deployment={d}
              projectId={projectId}
              onAction={onAction}
            />
          ))}
        </div>
      )}
    </Card>
  );
}

// ── Empty state ───────────────────────────────────────────────────────────────

function EmptyProject({ githubConnected, onConnectGithub, onNewDeploy, connecting }: {
  githubConnected: boolean;
  onConnectGithub: () => void;
  onNewDeploy: () => void;
  connecting: boolean;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="w-14 h-14 rounded-2xl bg-[#1e2130] border border-[#2a2d3a] flex items-center justify-center mb-5">
        <HugeiconsIcon icon={Rocket01Icon} size={28} className="text-slate-500" />
      </div>
      <h2 className="text-lg font-semibold text-slate-200 mb-2">Deploy your first service</h2>
      <p className="text-sm text-slate-500 max-w-sm mb-8">
        Connect a Git provider or upload an archive to deploy your first service.
        Each service gets its own deployment history and environment.
      </p>
      <Button variant="primary" size="sm" onClick={onNewDeploy} className="flex items-center gap-2">
        <HugeiconsIcon icon={Add01Icon} size={14} />
        Create service
      </Button>
      <div className="flex items-center gap-4 mt-6">
        {!githubConnected && (
          <button onClick={onConnectGithub} className="text-xs text-slate-500 hover:text-slate-300 transition-colors flex items-center gap-1">
            <HugeiconsIcon icon={GithubIcon} size={12} />
            Connect GitHub first
            {connecting && <Spinner size="sm" />}
          </button>
        )}
      </div>
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

  // ── Realtime: live status updates ───────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;
    async function connectRealtime() {
      try {
        const sdk = getSdk();
        const rt = (sdk as { realtime?: typeof sdk.realtime }).realtime;
        if (!rt) return;
        const token = localStorage.getItem('fidscript_access_token') ?? localStorage.getItem('fidscript_token');
        if (!token) return;

        await rt.connect(token, project.id);
        if (cancelled) { rt.disconnect?.(); return; }

        // Subscribe to deployment events. On any deployment event, patch the
        // matching deployment's status in local state; on terminal states,
        // also refetch the full list to pick up new deployments.
        const unsub = rt.subscribeDeployments(project.id, (event: any) => {
          const meta = event?.metadata ?? event;
          const deploymentId = meta.deploymentId;
          const eventType: string = event?.type ?? '';
          if (!deploymentId) return;

          // Derive new status from the event type suffix.
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

          setDeployments(prev => prev.map(d =>
            d.id === deploymentId && newStatus ? { ...d, status: newStatus } : d,
          ));

          // Refetch on terminal states to capture URL + any new deployments.
          if (newStatus && isTerminal(newStatus)) {
            setTimeout(() => load(), 500);
          }
        });
        rtRef.current = { disconnect: () => { unsub(); rt.disconnect?.(); } };
      } catch {
        // Realtime is best-effort — the page still works via manual refresh.
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
    <div className="px-4 sm:px-6 lg:px-8 py-6 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-xl font-bold text-slate-200">Services</h1>
          <p className="text-sm text-slate-500">
            {loading ? 'Loading…' : `${services.length} service${services.length !== 1 ? 's' : ''}`}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <Button variant="ghost" size="sm" onClick={load} title="Refresh" aria-label="Refresh">
            <HugeiconsIcon icon={RefreshIcon} size={13} />
          </Button>
          <Button variant="primary" size="sm" onClick={() => router.push(`/projects/${project.id}/services/new`)} className="flex items-center gap-1.5">
            <HugeiconsIcon icon={Add01Icon} size={13} />
            <span className="hidden sm:inline">New service</span>
            <span className="sm:hidden">New</span>
          </Button>
        </div>
      </div>

      {/* Error */}
      {error && (
        <Card className="border border-red-900/50 py-3 px-4">
          <p className="text-sm text-red-400">{error}</p>
        </Card>
      )}

      {/* Loading skeletons */}
      {loading && services.length === 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {[1, 2, 3].map(i => (
            <Card key={i} className="border border-[#1e2130] p-4 animate-pulse">
              <div className="flex items-center gap-3">
                <div className="w-4 h-4 rounded bg-[#1e2130]" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-[#1e2130] rounded w-1/2" />
                  <div className="h-3 bg-[#1e2130] rounded w-1/3" />
                </div>
                <div className="h-6 w-16 bg-[#1e2130] rounded-full" />
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Empty state */}
      {!loading && services.length === 0 && (
        <EmptyProject
          githubConnected={githubStatus?.connected ?? false}
          onConnectGithub={handleConnectGithub}
          onNewDeploy={() => router.push(`/projects/${project.id}/services/new`)}
          connecting={connecting}
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

      {/* All healthy indicator */}
      {!loading && services.length > 0 && services.every(s => !isInFlight(s.deployments[0]?.status)) && (
        <div className="flex items-center gap-2 justify-center py-2 text-xs text-slate-600">
          <HugeiconsIcon icon={CheckmarkCircle02Icon} size={13} className="text-emerald-500" />
          All services are healthy
        </div>
      )}
    </div>
  );
}

export default function ServicesPage() {
  const { project } = useProjectContext();
  if (!project) return <div className="p-4 text-sm text-slate-500">Loading project…</div>;
  return (
    <ToastProvider>
      <ServicesSectionInner project={project} />
    </ToastProvider>
  );
}
