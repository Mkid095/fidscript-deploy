'use client';

// eslint-disable-next-line import/order
import { useEffect, useState, useCallback, useRef } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Card, Button, Spinner } from '@fidscript/ui';
import { HugeiconsIcon } from '@hugeicons/react';
// eslint-disable-next-line import/order
import { Rocket01Icon, GitBranchIcon, CheckmarkCircle02Icon, StopCircleIcon, PlayCircleIcon, MoreHorizontalIcon, RefreshIcon, Copy01Icon, Search01Icon, Delete01Icon, RotateClockwiseIcon, File01Icon, ExternalLinkIcon, GithubIcon } from '@hugeicons/core-free-icons';

// eslint-disable-next-line import/order
import type { FidscriptSDK } from '@fidscript/sdk';
import { useAuth } from '@/contexts/auth-context';
import type { Project, Deployment } from '@/types';
import { NewDeploymentModal } from '@/components/deployments/new-deployment-modal';
import { ToastProvider, useToast } from '@/components/toast-provider';

interface Props { project: Project }

type Tab = 'active' | 'all';

const IN_FLIGHT_STATUSES = new Set(['PENDING', 'QUEUED', 'BUILDING', 'DEPLOYING']);

function statusMeta(status?: string): { label: string; badge: string; dot: string } {
  switch (status?.toUpperCase()) {
    case 'SUCCESS':    return { label: 'Success',      badge: 'bg-emerald-900/60 text-[var(--success)] border-[var(--success)]/30', dot: 'bg-[var(--success)]' };
    case 'FAILED':     return { label: 'Failed',       badge: 'bg-red-900/60 text-[var(--danger)] border-[var(--danger)]/30',           dot: 'bg-[var(--danger)]' };
    case 'PENDING':    return { label: 'Pending',       badge: 'bg-blue-900/60 text-[var(--accent)] border-blue-800',        dot: 'bg-[var(--accent)] animate-pulse' };
    case 'QUEUED':     return { label: 'Queued',        badge: 'bg-blue-900/60 text-[var(--accent)] border-blue-800',        dot: 'bg-[var(--accent)] animate-pulse' };
    case 'BUILDING':   return { label: 'Building',      badge: 'bg-amber-900/60 text-[var(--warning)] border-[var(--warning)]/30',     dot: 'bg-[var(--warning)] animate-pulse' };
    case 'DEPLOYING':  return { label: 'Deploying',     badge: 'bg-amber-900/60 text-[var(--warning)] border-[var(--warning)]/30',     dot: 'bg-[var(--warning)] animate-pulse' };
    case 'STOPPED':    return { label: 'Stopped',       badge: 'bg-[var(--rail)] text-[var(--text-muted)] border-[var(--rail-light)]',        dot: 'bg-slate-500' };
    case 'ROLLED_BACK':return { label: 'Rolled back',   badge: 'bg-purple-900/60 text-purple-400 border-purple-800', dot: 'bg-purple-500' };
    case 'BLOCKED':    return { label: 'Blocked',       badge: 'bg-orange-900/60 text-[var(--warning)] border-orange-800',  dot: 'bg-[var(--warning)]' };
    default:           return { label: status ?? 'Unknown', badge: 'bg-[var(--rail)] text-[var(--text-muted)] border-[var(--rail-light)]', dot: 'bg-slate-600' };
  }
}

function isInFlight(status?: string): boolean {
  return IN_FLIGHT_STATUSES.has(status?.toUpperCase() ?? '');
}

function formatDuration(start: string, end?: string | null): string {
  if (!end) return 'In progress';
  const s = Math.round((new Date(end).getTime() - new Date(start).getTime()) / 1000);
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60); const rem = s % 60;
  if (m < 60) return rem > 0 ? `${m}m ${rem}s` : `${m}m`;
  const h = Math.floor(m / 60); return `${h}h ${m % 60}m`;
}

function RelativeTime({ iso }: { iso: string }) {
  const diff = Date.now() - new Date(iso).getTime();
  const s = Math.floor(diff / 1000);
  if (s < 5) return <span className="text-[var(--text-dim)]">just now</span>;
  if (s < 60) return <span>{s}s ago</span>;
  const m = Math.floor(s / 60);
  if (m < 60) return <span>{m}m ago</span>;
  const h = Math.floor(m / 60);
  if (h < 24) return <span>{h}h ago</span>;
  const d = Math.floor(h / 24);
  return <span>{d}d ago</span>;
}

// ── Deployment Card ───────────────────────────────────────────────────────────

interface DeploymentCardProps {
  deployment: Deployment;
  projectId: string;
  onUpdate: (id: string, patch: Partial<Deployment>) => void;
  onRemove: (id: string) => void;
}

function DeploymentCard({ deployment, projectId, onUpdate, onRemove }: DeploymentCardProps) {
  const { getSdk } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const [acting, setActing] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const inFlight = isInFlight(deployment.status);
  const meta = statusMeta(deployment.status);

  // Close menu on outside click
  useEffect(() => {
    if (!menuOpen) return;
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [menuOpen]);

  async function handleAction(action: string) {
    setActing(action);
    setMenuOpen(false);
    try {
      const sdk = getSdk();
      if (action === 'stop')     { await sdk.deployments.stop(projectId, deployment.id); onUpdate(deployment.id, { status: 'STOPPED' }); }
      if (action === 'restart')  { await sdk.deployments.restart(projectId, deployment.id); onUpdate(deployment.id, { status: 'PENDING' }); }
      if (action === 'delete')   { await sdk.deployments.destroy(projectId, deployment.id); onRemove(deployment.id); }
    } catch {
      /* error handled by parent toast */
    } finally {
      setActing(null);
    }
  }

  const duration = deployment.completedAt
    ? Math.round((new Date(deployment.completedAt).getTime() - new Date(deployment.createdAt).getTime()) / 1000)
    : null;

  return (
    <Card className="border border-[var(--rail)] py-3 px-4 hover:border-[var(--rail-light)] transition-all duration-150 group">
      <div className="flex items-start justify-between gap-3">
        {/* Left: status + identity */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2.5 mb-1.5 flex-wrap">
            {/* Status dot */}
            <span className={`w-2 h-2 rounded-full flex-shrink-0 ${meta.dot}`} />
            {/* Status badge */}
            <span className={`text-xs px-2 py-0.5 rounded-full border capitalize font-medium ${meta.badge}`}>
              {meta.label}
            </span>
            {/* Branch */}
            {deployment.branch && (
              <span className="flex items-center gap-1 text-xs text-[var(--text-muted)]">
                <HugeiconsIcon icon={GitBranchIcon} size={11} className="text-[var(--text-dim)]" />
                {deployment.branch}
              </span>
            )}
            {/* Commit */}
            {deployment.commitSha && (
              <code className="text-[10px] font-mono text-[var(--text-dim)] bg-[var(--rail)] px-1.5 py-0.5 rounded">
                {deployment.commitSha.slice(0, 7)}
              </code>
            )}
            {/* Image tag */}
            {deployment.imageTag && (
              <code className="text-[10px] font-mono text-[var(--text-dim)] bg-[var(--rail)] px-1.5 py-0.5 rounded">
                {deployment.imageTag}
              </code>
            )}
          </div>

          {/* Meta row */}
          <div className="flex items-center gap-3 text-xs text-[var(--text-muted)] flex-wrap">
            <span title={new Date(deployment.createdAt).toLocaleString()}>
              <RelativeTime iso={deployment.createdAt} />
            </span>
            {duration !== null && (
              <span className="text-[var(--text-dim)]">· {formatDuration(deployment.createdAt, deployment.completedAt)}</span>
            )}
            {deployment.deploymentUrl && (
              <a
                href={deployment.deploymentUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-[var(--accent)] hover:text-[var(--accent)] transition-colors"
              >
                <HugeiconsIcon icon={ExternalLinkIcon} size={10} />
                <span className="truncate max-w-[200px]">{deployment.deploymentUrl.replace(/^https?:\/\//, '')}</span>
              </a>
            )}
          </div>
        </div>

        {/* Right: actions */}
        <div className="flex items-center gap-1.5 flex-shrink-0">
          {acting && <Spinner size="sm" />}

          {/* Logs link */}
          <a
            href={`/projects/${projectId}/deployments/${deployment.id}`}
            className="flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-md bg-[var(--rail)] text-[var(--text-muted)] hover:text-[var(--text)] border border-[var(--rail-light)] hover:border-[#3a3d4a] transition-all"
          >
            <HugeiconsIcon icon={File01Icon} size={12} />
            <span className="hidden sm:inline">Logs</span>
          </a>

          {/* Inline action buttons */}
          {inFlight && (
            <button
              onClick={() => handleAction('stop')}
              disabled={!!acting}
              title="Stop deployment"
              className="flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-md bg-[var(--rail)] text-[var(--text-muted)] hover:text-[var(--warning)] border border-[var(--rail-light)] hover:border-amber-700 transition-all disabled:opacity-50"
            >
              <HugeiconsIcon icon={StopCircleIcon} size={12} />
              <span className="hidden sm:inline">Stop</span>
            </button>
          )}

          {(deployment.status === 'STOPPED' || deployment.status === 'FAILED') && (
            <button
              onClick={() => handleAction('restart')}
              disabled={!!acting}
              title="Restart deployment"
              className="flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-md bg-[var(--rail)] text-[var(--text-muted)] hover:text-[var(--success)] border border-[var(--rail-light)] hover:border-emerald-700 transition-all disabled:opacity-50"
            >
              <HugeiconsIcon icon={PlayCircleIcon} size={12} />
              <span className="hidden sm:inline">Restart</span>
            </button>
          )}

          {/* Kebab menu */}
          <div className="relative" ref={menuRef}>
            <button
              onClick={() => setMenuOpen(o => !o)}
              className="w-8 h-8 flex items-center justify-center rounded-md text-[var(--text-dim)] hover:text-[var(--text-muted)] hover:bg-[var(--rail)] transition-all"
              aria-label="Deployment menu"
            >
              <HugeiconsIcon icon={MoreHorizontalIcon} size={15} />
            </button>
            {menuOpen && (
              <div className="absolute right-0 top-full mt-1.5 w-44 bg-[var(--surface-2)] border border-[var(--rail)] rounded-lg shadow-2xl z-30 py-1">
                <a
                  href={`/projects/${projectId}/deployments/${deployment.id}`}
                  className="flex items-center gap-2.5 px-3 py-2 text-xs text-[var(--text-muted)] hover:bg-[var(--rail)] hover:text-[var(--text)] transition-colors"
                >
                  <HugeiconsIcon icon={Search01Icon} size={13} />
                  View detail
                </a>
                {(deployment.status === 'SUCCESS' || deployment.status === 'STOPPED' || deployment.status === 'FAILED') && (
                  <>
                    <button
                      onClick={() => handleAction('restart')}
                      className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-[var(--text-muted)] hover:bg-[var(--rail)] hover:text-[var(--success)] transition-colors"
                    >
                      <HugeiconsIcon icon={RotateClockwiseIcon} size={13} />
                      Rebuild
                    </button>
                    <button
                      onClick={() => handleAction('delete')}
                      className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-[var(--danger)] hover:bg-[var(--rail)] hover:text-[var(--danger)] transition-colors"
                    >
                      <HugeiconsIcon icon={Delete01Icon} size={13} />
                      Delete
                    </button>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </Card>
  );
}

// ── Skeleton card ─────────────────────────────────────────────────────────────
function DeploymentCardSkeleton() {
  return (
    <Card className="border border-[var(--rail)] py-4 px-4 animate-pulse">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 space-y-2">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-[var(--rail)]" />
            <div className="w-16 h-4 rounded-full bg-[var(--rail)]" />
            <div className="w-14 h-3 rounded bg-[var(--rail)]" />
          </div>
          <div className="flex items-center gap-3">
            <div className="w-16 h-3 rounded bg-[var(--rail)]" />
            <div className="w-20 h-3 rounded bg-[var(--rail)]" />
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-14 h-7 rounded-md bg-[var(--rail)]" />
          <div className="w-14 h-7 rounded-md bg-[var(--rail)]" />
          <div className="w-8 h-8 rounded-md bg-[var(--rail)]" />
        </div>
      </div>
    </Card>
  );
}

// ── Deployments Section ───────────────────────────────────────────────────────

function DeploymentsSectionInner({ project }: Props) {
  const { getSdk } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { showToast } = useToast();

  const tab = (searchParams.get('tab') as Tab) ?? 'active';
  const [deployments, setDeployments] = useState<Deployment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showNewModal, setShowNewModal] = useState(false);
  const [githubStatus, setGithubStatus] = useState<{ connected: boolean; username?: string; avatarUrl?: string } | null>(null);
  const [githubConnecting, setGithubConnecting] = useState(false);
  const [inlineUrl, setInlineUrl] = useState('');
  const [inlineSubmitting, setInlineSubmitting] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  // ── Load deployments ─────────────────────────────────────────────────────
  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const sdk = getSdk();
      const data = await sdk.deployments.list(project.id, { limit: 100 });
      setDeployments(Array.isArray(data) ? (data as any).deployments ?? data : (data as any).deployments ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load deployments');
    } finally {
      setLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [project.id, getSdk, refreshKey]);

  useEffect(() => { load(); }, [load]);

  // ── GitHub connection check ────────────────────────────────────────────
  useEffect(() => {
    getSdk().github.status().then(setGithubStatus).catch(() => setGithubStatus({ connected: false }));
  }, [getSdk]);

  async function handleConnectGithub() {
    setGithubConnecting(true);
    try {
      const sdk = getSdk();
      await sdk.github.connect();
      // Popup handles the OAuth flow; refresh githubStatus to reflect the new connection.
      const status = await sdk.github.status();
      setGithubStatus(status);
    } catch (err) {
      // AuthError = token expired / session invalid → redirect to login
      if (err && (err as any).name === 'AuthError') {
        router.replace('/login');
        return;
      }
      const msg = err instanceof Error ? err.message : 'Failed to connect to GitHub';
      showToast({ type: 'error', message: msg });
    } finally {
      setGithubConnecting(false);
    }
  }

  // ── Realtime subscription ────────────────────────────────────────────────
  useEffect(() => {
    const sdk = getSdk();
    const rt = (sdk as FidscriptSDK & { realtime?: { connect: (t: string, p: string) => Promise<void>; subscribeDeployments: (p: string, h: (e: any) => void) => () => void } }).realtime;
    if (!rt) return;

    const token = typeof window !== 'undefined'
      ? (localStorage.getItem('fidscript_access_token') ?? localStorage.getItem('fidscript_token') ?? '')
      : '';

    let unsub: (() => void) | undefined;
    let cancelled = false;

    // Connect first, then subscribe — the realtime gateway requires an active
    // socket connection before subscribe_project is emitted.
    // Pass a getter so socket.io re-reads the (possibly refreshed) JWT on every
    // reconnect instead of pinning a token that may expire mid-session.
    rt.connect(() => localStorage.getItem('fidscript_access_token') ?? localStorage.getItem('fidscript_token') ?? '', project.id).then(() => {
      if (cancelled) return;

      const handler = (event: { type?: string; data?: Record<string, any> }) => {
        const et = event?.type;
        if (!et || !et.startsWith('deployments.deployment.')) return;
        // The realtime bridge sends { type, timestamp, data: metadata }
        const data = event?.data ?? {};
        const updatedId = data.deploymentId;
        if (!updatedId) return;

        setDeployments(prev => {
          const exists = prev.some(d => d.id === updatedId);
          if (!exists) {
            load(); // new deployment — reload the list
            return prev;
          }
          return prev.map(d => {
            if (d.id !== updatedId) return d;
            return {
              ...d,
              status: et === 'deployments.deployment.succeeded' ? 'SUCCESS'
                    : et === 'deployments.deployment.failed'    ? 'FAILED'
                    : et === 'deployments.deployment.stopped'   ? 'STOPPED'
                    : et === 'deployments.deployment.building'  ? 'BUILDING'
                    : et === 'deployments.deployment.queued'   ? 'QUEUED'
                    : et === 'deployments.deployment.deploying'? 'DEPLOYING'
                    : et === 'deployments.deployment.blocked'  ? 'BLOCKED'
                    : et === 'deployments.deployment.rolled_back' ? 'ROLLED_BACK'
                    : d.status,
              completedAt: data.completedAt ?? (et === 'deployments.deployment.succeeded' || et === 'deployments.deployment.failed' || et === 'deployments.deployment.stopped'
                ? new Date().toISOString() : d.completedAt),
              deploymentUrl: data.deploymentUrl ?? d.deploymentUrl,
            };
          });
        });
      };

      unsub = rt.subscribeDeployments(project.id, handler);
    }).catch(() => {
      // Connection failed — polling fallback will still work
    });

    return () => { cancelled = true; unsub?.(); };
  }, [project.id, getSdk, load]);

  // ── Optimistic update helpers ───────────────────────────────────────────
  function updateDeployment(id: string, patch: Partial<Deployment>) {
    setDeployments(prev => prev.map(d => d.id === id ? { ...d, ...patch } : d));
  }
  function removeDeployment(id: string) {
    setDeployments(prev => prev.filter(d => d.id !== id));
  }

  // ── Inline deploy ────────────────────────────────────────────────────────
  async function handleInlineDeploy(e: React.FormEvent) {
    e.preventDefault();
    if (!inlineUrl.trim()) return;
    setInlineSubmitting(true);
    try {
      const sdk = getSdk();
      await sdk.deployments.create(project.id, {
        source: { type: 'git', git: { url: inlineUrl.trim() } },
      });
      setInlineUrl('');
      showToast({ type: 'success', message: 'Deployment started.' });
      await load();
    } catch (err) {
      showToast({ type: 'error', message: err instanceof Error ? err.message : 'Deploy failed.' });
    } finally {
      setInlineSubmitting(false);
    }
  }

  // ── Derived ──────────────────────────────────────────────────────────────
  const activeDeployments = deployments.filter(d => isInFlight(d.status));
  const displayDeployments = tab === 'active' ? activeDeployments : deployments;

  function switchTab(t: Tab) {
    router.replace(`/projects/${project.id}?section=deployments&tab=${t}`, { scroll: false });
  }

  return (
    <div className="space-y-4">
      {/* Header row: tabs + actions */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex gap-1 bg-[var(--surface-2)] border border-[var(--rail)] rounded-lg p-0.5">
          {(['active', 'all'] as Tab[]).map(t => (
            <button
              key={t}
              onClick={() => switchTab(t)}
              className={`px-3.5 py-1.5 text-xs rounded-md transition-all ${
                tab === t
                  ? 'bg-[var(--rail)] text-[var(--text)] shadow-sm'
                  : 'text-[var(--text-muted)] hover:text-[var(--text-muted)]'
              }`}
            >
              {t === 'active'
                ? `Active${activeDeployments.length ? ` (${activeDeployments.length})` : ''}`
                : `All${deployments.length ? ` (${deployments.length})` : ''}`}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={load}
            className="flex items-center gap-1.5 text-xs text-[var(--text-muted)] hover:text-[var(--text-muted)] px-2.5 py-1.5 rounded-md hover:bg-[var(--rail)] border border-transparent hover:border-[var(--rail-light)] transition-all"
          >
            <HugeiconsIcon icon={RefreshIcon} size={13} />
            Refresh
          </button>
          <Button variant="primary" size="sm" onClick={() => githubStatus?.connected ? setShowNewModal(true) : handleConnectGithub()}>
            <HugeiconsIcon icon={githubStatus?.connected ? Rocket01Icon : GithubIcon} size={13} />
            {githubStatus?.connected ? 'New deployment' : 'Connect GitHub'}
          </Button>
        </div>
      </div>

      {/* Inline git deploy — empty state */}
      {deployments.length === 0 && tab === 'active' && (
        <Card className="border border-[var(--rail)] py-8 px-5">
          <div className="flex flex-col items-center text-center mb-5">
            <div className="w-10 h-10 rounded-full bg-[var(--rail)] flex items-center justify-center mb-3">
              <HugeiconsIcon icon={githubStatus?.connected ? GithubIcon : Rocket01Icon} size={18} className={githubStatus?.connected ? 'text-[var(--text-muted)]' : 'text-[var(--text-dim)]'} />
            </div>
            <p className="text-sm font-medium text-[var(--text-muted)] mb-1">
              {githubStatus?.connected ? 'No deployments yet' : 'Connect GitHub to deploy'}
            </p>
            <p className="text-xs text-[var(--text-muted)]">
              {githubStatus?.connected
                ? 'Paste a Git URL below to deploy your first release.'
                : 'Connect your GitHub account to browse repos and deploy in one click.'}
            </p>
          </div>

          {githubStatus?.connected ? (
            <form onSubmit={handleInlineDeploy} className="flex gap-2.5 max-w-xl mx-auto">
              <input
                value={inlineUrl}
                onChange={e => setInlineUrl(e.target.value)}
                placeholder="https://github.com/user/repo"
                className="flex-1 px-3.5 py-2.5 rounded-lg bg-[var(--surface-2)] border border-[var(--rail)] text-sm text-[var(--text)] placeholder:text-[var(--text-dim)] focus:outline-none focus:ring-2 focus:ring-[var(--danger)]/40 focus:border-[var(--danger)] transition-all"
              />
              <Button type="submit" variant="primary" size="sm" loading={inlineSubmitting} disabled={!inlineUrl.trim()}>
                Deploy
              </Button>
            </form>
          ) : (
            <div className="flex justify-center">
              <Button variant="primary" size="sm" onClick={handleConnectGithub} loading={githubConnecting}>
                <HugeiconsIcon icon={GithubIcon} size={14} />
                {githubConnecting ? 'Redirecting…' : 'Connect GitHub'}
              </Button>
            </div>
          )}
        </Card>
      )}

      {/* Error state */}
      {error && (
        <Card className="border border-red-900/50 py-4 px-4">
          <p className="text-sm text-[var(--danger)]">{error}</p>
        </Card>
      )}

      {/* Loading skeletons */}
      {loading && deployments.length === 0 && (
        <div className="flex flex-col gap-2">
          {[1, 2, 3].map(i => <DeploymentCardSkeleton key={i} />)}
        </div>
      )}

      {/* Empty all */}
      {!loading && deployments.length === 0 && tab === 'all' && (
        <Card className="border border-[var(--rail)] py-8 px-4 text-center">
          <p className="text-sm text-[var(--text-muted)]">No deployments in this project yet.</p>
        </Card>
      )}

      {/* No active deployments */}
      {!loading && activeDeployments.length === 0 && tab === 'active' && deployments.length > 0 && (
        <Card className="border border-[var(--rail)] py-6 px-4 text-center">
          <div className="w-8 h-8 rounded-full bg-emerald-900/30 flex items-center justify-center mx-auto mb-2">
            <HugeiconsIcon icon={CheckmarkCircle02Icon} size={16} className="text-[var(--success)]" />
          </div>
          <p className="text-sm text-[var(--text-muted)]">All deployments are idle.</p>
        </Card>
      )}

      {/* Deployment list */}
      {!loading && displayDeployments.length > 0 && (
        <div className="flex flex-col gap-2" role="list" aria-label="Deployments">
          {displayDeployments.map(d => (
            <DeploymentCard
              key={d.id}
              deployment={d}
              projectId={project.id}
              onUpdate={updateDeployment}
              onRemove={removeDeployment}
            />
          ))}
        </div>
      )}

      {/* New deployment modal */}
      {showNewModal && (
        <NewDeploymentModal
          project={project}
          githubStatus={githubStatus}
          onClose={() => setShowNewModal(false)}
          onCreated={load}
        />
      )}
    </div>
  );
}

export function DeploymentsSection(props: Props) {
  return (
    <ToastProvider>
      <DeploymentsSectionInner {...props} />
    </ToastProvider>
  );
}
