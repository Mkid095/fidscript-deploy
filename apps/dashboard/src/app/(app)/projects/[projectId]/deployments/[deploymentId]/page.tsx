'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Card, Button, Spinner, Modal } from '@fidscript/ui';
import { HugeiconsIcon } from '@hugeicons/react';
import { ChevronRightIcon, GitBranchIcon, GitCommitIcon, Image01Icon, ExternalLinkIcon, Copy01Icon, CheckmarkCircle02Icon, AlertCircleIcon, StopCircleIcon, PlayCircleIcon, Delete01Icon, RotateClockwiseIcon, Download01Icon, RefreshIcon, User02Icon, Clock02Icon, CheckmarkCircle03Icon, ArrowUp01Icon, ArrowDown01Icon } from '@hugeicons/core-free-icons';

import { useAuth } from '@/contexts/auth-context';
import type { Deployment } from '@/types';
import { ToastProvider, useToast } from '@/components/toast-provider';

// ── State machine ─────────────────────────────────────────────────────────────

const STEPS = [
  { key: 'PENDING',      label: 'Pending',    color: 'bg-[var(--accent)]' },
  { key: 'QUEUED',       label: 'Queued',     color: 'bg-[var(--accent)]' },
  { key: 'BUILDING',     label: 'Building',   color: 'bg-[var(--warning)]' },
  { key: 'DEPLOYING',    label: 'Deploying',  color: 'bg-[var(--warning)]' },
  { key: 'SUCCESS',      label: 'Success',    color: 'bg-[var(--success)]' },
];

const TERMINAL = ['FAILED', 'STOPPED', 'ROLLED_BACK', 'BLOCKED'];

function stepIndex(status?: string): number {
  return STEPS.findIndex(s => s.key === status?.toUpperCase()) ?? 0;
}

function statusColor(status?: string) {
  switch (status?.toUpperCase()) {
    case 'SUCCESS':     return 'bg-emerald-900/60 text-[var(--success)] border-[var(--success)]/30';
    case 'FAILED':      return 'bg-red-900/60 text-[var(--danger)] border-[var(--danger)]/30';
    case 'PENDING':
    case 'QUEUED':      return 'bg-blue-900/60 text-[var(--accent)] border-blue-800';
    case 'BUILDING':
    case 'DEPLOYING':   return 'bg-amber-900/60 text-[var(--warning)] border-[var(--warning)]/30';
    case 'STOPPED':     return 'bg-[var(--rail)] text-[var(--text-muted)] border-[var(--rail-light)]';
    case 'ROLLED_BACK': return 'bg-purple-900/60 text-purple-400 border-purple-800';
    case 'BLOCKED':     return 'bg-orange-900/60 text-[var(--warning)] border-orange-800';
    default:            return 'bg-[var(--rail)] text-[var(--text-muted)] border-[var(--rail-light)]';
  }
}

function formatDuration(start: string, end?: string | null): string {
  if (!end) return 'In progress';
  const s = Math.round((new Date(end).getTime() - new Date(start).getTime()) / 1000);
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ${s % 60}s`;
  const h = Math.floor(m / 60);
  return `${h}h ${m % 60}m`;
}

function MetadataRow({ icon: Icon, label, value, mono, copyable, className }: {
  icon: typeof GitBranchIcon;
  label: string;
  value?: string | null;
  mono?: boolean;
  copyable?: boolean;
  className?: string;
}) {
  const [copied, setCopied] = useState(false);
  if (!value) return null;
  return (
    <div className={`flex items-start gap-2.5 ${className ?? ''}`}>
      <HugeiconsIcon icon={Icon} size={13} className="text-[var(--text-dim)] mt-0.5 flex-shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-xs text-[var(--text-dim)]">{label}</p>
        <div className="flex items-center gap-1.5">
          <p className={`text-xs text-[var(--text-muted)] truncate ${mono ? 'font-mono' : ''}`}>{value}</p>
          {copyable && (
            <button
              onClick={() => { navigator.clipboard.writeText(value); setCopied(true); setTimeout(() => setCopied(false), 1500); }}
              className="text-[var(--text-dim)] hover:text-[var(--text-muted)] transition-colors flex-shrink-0"
              title="Copy"
            >
              <HugeiconsIcon icon={copied ? CheckmarkCircle03Icon : Copy01Icon} size={11} className={copied ? 'text-[var(--success)]' : ''} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Log Viewer ────────────────────────────────────────────────────────────────

const LOG_LEVELS = ['debug', 'info', 'warn', 'error', 'fatal'] as const;
type LogLevel = typeof LOG_LEVELS[number];

interface LogLine { id: string; ts: string; level: LogLevel; text: string }

const LEVEL_STYLE: Record<LogLevel, string> = {
  debug: 'text-[var(--text-muted)]',
  info:  'text-[var(--accent)]',
  warn:  'text-[var(--warning)]',
  error: 'text-[var(--danger)]',
  fatal: 'text-[var(--danger)] font-bold',
};

function parseLogLines(raw: string): LogLine[] {
  if (!raw.trim()) return [];
  // Try JSON lines first
  try {
    return raw.split('\n').filter(Boolean).map((line, i) => {
      try {
        const obj = JSON.parse(line);
        return {
          id: `${i}-${obj.timestamp ?? i}`,
          ts: obj.timestamp ?? '',
          level: (obj.level ?? 'info') as LogLevel,
          text: typeof obj.message === 'string' ? obj.message : typeof obj.msg === 'string' ? obj.msg : line,
        };
      } catch {
        return { id: String(i), ts: '', level: 'info' as LogLevel, text: line };
      }
    });
  } catch {
    // Plain text — split by lines
    return raw.split('\n').filter(Boolean).map((line, i) => ({
      id: String(i), ts: '', level: 'info' as LogLevel, text: line,
    }));
  }
}

/**
 * LivePreview — inline iframe preview of the deployed app (Vercel-style).
 * Shows a sandboxed iframe of the deployment URL with open-in-new-tab +
 * copy URL + reload controls. Collapsed by default; expands on click.
 */
function LivePreview({ url }: { url: string }) {
  const [expanded, setExpanded] = useState(false);
  const [iframeKey, setIframeKey] = useState(0);

  return (
    <Card className="border border-[var(--rail)] p-0 overflow-hidden">
      {/* Header bar */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-[var(--rail)]">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <span className="w-2 h-2 rounded-full bg-[var(--success)] flex-shrink-0" />
          <span className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider">Live preview</span>
          <a href={url} target="_blank" rel="noopener noreferrer" className="text-xs text-[var(--accent)] hover:text-[var(--accent)] truncate font-mono">
            {url.replace(/^https?:\/\//, '')}
          </a>
        </div>
        <div className="flex items-center gap-1 flex-shrink-0">
          {expanded && (
            <>
              <button
                onClick={() => setIframeKey(k => k + 1)}
                className="p-1.5 rounded text-[var(--text-muted)] hover:text-[var(--text-muted)] hover:bg-[var(--rail)] transition-colors"
                title="Reload preview"
                aria-label="Reload preview"
              >
                <HugeiconsIcon icon={RefreshIcon} size={13} />
              </button>
              <a
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className="p-1.5 rounded text-[var(--text-muted)] hover:text-[var(--text-muted)] hover:bg-[var(--rail)] transition-colors"
                title="Open in new tab"
                aria-label="Open in new tab"
              >
                <HugeiconsIcon icon={ExternalLinkIcon} size={13} />
              </a>
            </>
          )}
          <Button variant="ghost" size="sm" onClick={() => setExpanded(v => !v)}>
            {expanded ? 'Hide' : 'Preview'}
          </Button>
        </div>
      </div>

      {/* Iframe */}
      {expanded && (
        <div className="relative bg-white" style={{ height: 'min(60vh, 500px)' }}>
          <iframe
            key={iframeKey}
            src={url}
            className="w-full h-full border-0"
            sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
            title="Deployment preview"
            loading="lazy"
          />
        </div>
      )}
    </Card>
  );
}

function LogViewer({ logs, inFlight = false }: { logs: string; inFlight?: boolean }) {
  // Auto-expand while the build is running so the user lands on a live stream
  // (Vercel-style) instead of an empty page they have to click open.
  const [show, setShow] = useState(inFlight);
  const [activeLevels, setActiveLevels] = useState<Set<LogLevel>>(new Set(LOG_LEVELS));
  const [search, setSearch] = useState('');
  const lines = parseLogLines(logs);
  const containerRef = useRef<HTMLDivElement>(null);
  const [autoScroll, setAutoScroll] = useState(true);

  const filtered = lines.filter(l =>
    activeLevels.has(l.level) &&
    (!search || l.text.toLowerCase().includes(search.toLowerCase()))
  );

  // Auto-scroll to bottom when new lines appear
  useEffect(() => {
    if (!autoScroll) return;
    const el = containerRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [filtered.length, autoScroll]);

  function toggleLevel(lvl: LogLevel) {
    setActiveLevels(prev => {
      const next = new Set(prev);
      next.has(lvl) ? next.delete(lvl) : next.add(lvl);
      return next;
    });
  }

  function copyAll() {
    navigator.clipboard.writeText(filtered.map(l => l.text).join('\n'));
  }

  function downloadLogs() {
    const blob = new Blob([filtered.map(l => `[${l.ts}] ${l.level.toUpperCase()} ${l.text}`).join('\n')], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `build-logs-${Date.now()}.txt`; a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="rounded-lg border border-[var(--rail)] overflow-hidden">
      {/* Toolbar */}
      <div className="flex items-center gap-3 px-4 py-2.5 bg-[var(--surface-2)] border-b border-[var(--rail)] flex-wrap">
        <span className="text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider">Build logs</span>
        <div className="flex items-center gap-1">
          {LOG_LEVELS.map(lvl => (
            <button
              key={lvl}
              onClick={() => toggleLevel(lvl)}
              className={`text-[10px] font-mono uppercase px-2 py-1 rounded border transition-colors ${
                activeLevels.has(lvl)
                  ? `${LEVEL_STYLE[lvl]} border-transparent`
                  : 'text-[var(--text-dim)] border-[var(--rail-light)] bg-transparent hover:text-[var(--text-muted)]'
              }`}
            >
              {lvl}
            </button>
          ))}
        </div>
        <div className="flex-1" />
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search logs…"
          className="w-40 text-xs px-2.5 py-1.5 rounded bg-[var(--surface-2)] border border-[var(--rail)] text-[var(--text-muted)] placeholder:text-[var(--text-dim)] focus:outline-none focus:border-[var(--rail-light)]"
        />
        <button onClick={copyAll}   title="Copy all"  className="text-[var(--text-dim)] hover:text-[var(--text-muted)] transition-colors"><HugeiconsIcon icon={Copy01Icon}      size={13} /></button>
        <button onClick={downloadLogs} title="Download" className="text-[var(--text-dim)] hover:text-[var(--text-muted)] transition-colors"><HugeiconsIcon icon={Download01Icon} size={13} /></button>
        <button onClick={() => setAutoScroll(s => !s)} title={autoScroll ? 'Auto-scroll on' : 'Auto-scroll off'}
          className={`text-xs transition-colors ${autoScroll ? 'text-[var(--accent)]' : 'text-[var(--text-dim)] hover:text-[var(--text-muted)]'}`}>
          <HugeiconsIcon icon={RefreshIcon} size={13} />
        </button>
      </div>

      {/* Log body */}
      <button
        onClick={() => setShow(s => !s)}
        className="w-full flex items-center justify-between px-4 py-2.5 bg-[var(--surface-2)] border-b border-[var(--rail)] text-xs text-[var(--text-muted)] hover:text-[var(--text-muted)] transition-colors text-left"
      >
        <span>{inFlight && filtered.length === 0
          ? <span className="flex items-center gap-2"><Spinner size="sm" /> Streaming build output…</span>
          : `${show ? 'Hide' : 'Show'} ${filtered.length} log line${filtered.length === 1 ? '' : 's'}`}</span>
        <HugeiconsIcon icon={show ? ArrowUp01Icon : ArrowDown01Icon} size={12} className="text-[var(--text-dim)]" />
      </button>

      {show && (
        <div
          ref={containerRef}
          className="bg-[var(--surface-2)] overflow-y-auto"
          style={{ maxHeight: '400px' }}
          onScroll={() => {
            const el = containerRef.current;
            if (!el) return;
            setAutoScroll(el.scrollHeight - el.scrollTop - el.clientHeight < 32);
          }}
        >
          {filtered.length === 0 ? (
            <div className="p-6 flex items-center gap-2 text-xs text-[var(--text-dim)]">
              {inFlight ? <><Spinner size="sm" /> Waiting for build output…</> : 'No log entries match your filters.'}
            </div>
          ) : (
            <div className="divide-y divide-[var(--rail)]/40">
              {filtered.map(line => (
                <div key={line.id} className="flex items-start gap-3 px-4 py-1.5 hover:bg-[var(--rail)]/20">
                  {line.ts && (
                    <span className="text-[10px] font-mono text-[var(--text-dim)] flex-shrink-0 mt-0.5 w-36">
                      {new Date(line.ts).toLocaleTimeString()}
                    </span>
                  )}
                  <span className={`text-[10px] font-mono uppercase px-1.5 py-0.5 rounded flex-shrink-0 mt-0.5 ${LEVEL_STYLE[line.level]}`}>
                    {line.level}
                  </span>
                  <span className="text-xs font-mono text-[var(--text-muted)] leading-relaxed whitespace-pre-wrap break-all">
                    {line.text}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Rollback Picker ───────────────────────────────────────────────────────────

function RollbackPicker({
  projectId,
  currentId,
  onPicked,
  onClose,
}: {
  projectId: string; currentId: string;
  onPicked: (targetId: string) => void; onClose: () => void;
}) {
  const { getSdk } = useAuth();
  const [deployments, setDeployments] = useState<Deployment[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getSdk().deployments.list(projectId, { limit: 50 }).then(data => {
      const all: Deployment[] = (data as any).deployments ?? data ?? [];
      // Show prior SUCCESS deployments excluding current
      setDeployments(all.filter((d: Deployment) => d.status === 'SUCCESS' && d.id !== currentId));
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [projectId, currentId, getSdk]);

  async function handleRollback() {
    if (!selected) return;
    setSubmitting(true);
    setError(null);
    try {
      const sdk = getSdk();
      await sdk.deployments.rollback(projectId, currentId, selected);
      onPicked(selected);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Rollback failed');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <p className="text-sm text-[var(--text-muted)] mb-1">Select a deployment to roll back to</p>
        <p className="text-xs text-[var(--text-muted)]">A new deployment will be created using the image from the selected release.</p>
      </div>

      {loading ? (
        <div className="flex justify-center py-6"><Spinner size="md" /></div>
      ) : deployments.length === 0 ? (
        <p className="text-xs text-[var(--text-muted)] py-4 text-center">No prior successful deployments found.</p>
      ) : (
        <div className="flex flex-col gap-1.5 max-h-60 overflow-y-auto">
          {deployments.slice(0, 10).map(d => (
            <button
              key={d.id}
              onClick={() => setSelected(d.id)}
              className={`flex items-center gap-3 p-3 rounded-lg border text-left transition-all ${
                selected === d.id
                  ? 'border-[var(--danger)]/40 bg-[var(--danger)]/5'
                  : 'border-[var(--rail)] hover:border-[var(--rail-light)] bg-[var(--surface-2)]'
              }`}
            >
              <div className={`w-3 h-3 rounded-full flex-shrink-0 ${selected === d.id ? 'bg-[var(--danger)]' : 'bg-[var(--rail)]'}`} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono text-[var(--text-muted)]">{d.commitSha?.slice(0, 7) ?? d.id.slice(0, 8)}</span>
                  {d.branch && <span className="text-xs text-[var(--text-dim)]">· {d.branch}</span>}
                </div>
                <p className="text-[10px] text-[var(--text-dim)]">
                  {new Date(d.createdAt).toLocaleString()}
                  {d.imageTag && <span className="ml-2 font-mono">{d.imageTag}</span>}
                </p>
              </div>
            </button>
          ))}
        </div>
      )}

      {error && <p className="text-xs text-[var(--danger)]">{error}</p>}

      <div className="flex justify-end gap-2">
        <Button variant="ghost" size="sm" onClick={onClose}>Cancel</Button>
        <Button
          variant="primary"
          size="sm"
          disabled={!selected || submitting}
          loading={submitting}
          onClick={handleRollback}
        >
          Roll back
        </Button>
      </div>
    </div>
  );
}

// ── Confirm Dialog ─────────────────────────────────────────────────────────────

function ConfirmDialog({
  title,
  message,
  confirmLabel,
  variant,
  onConfirm,
  onClose,
}: {
  title: string; message: string; confirmLabel: string; variant: 'danger' | 'warning';
  onConfirm: () => void; onClose: () => void;
}) {
  const [confirmText, setConfirmText] = useState('');
  const requiresText = variant === 'danger';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-[var(--surface-2)] border border-[var(--rail)] rounded-xl shadow-2xl w-full max-w-md mx-4 p-6 space-y-4">
        <h2 className="text-sm font-semibold text-[var(--text)]">{title}</h2>
        <p className="text-sm text-[var(--text-muted)] leading-relaxed">{message}</p>
        {requiresText && (
          <input
            value={confirmText}
            onChange={e => setConfirmText(e.target.value)}
            placeholder='Type "delete" to confirm'
            className="w-full px-3 py-2 rounded-lg bg-[var(--surface-2)] border border-[var(--rail)] text-sm text-[var(--text)] placeholder:text-[var(--text-dim)] focus:outline-none focus:border-[var(--danger)]"
            autoFocus
          />
        )}
        <div className="flex justify-end gap-2">
          <Button variant="ghost" size="sm" onClick={onClose}>Cancel</Button>
          <Button
            variant={variant === 'danger' ? 'danger' : 'primary'}
            size="sm"
            disabled={requiresText && confirmText !== 'delete'}
            onClick={onConfirm}
          >
            {confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}

// ── Detail Page ───────────────────────────────────────────────────────────────

function DeploymentDetailInner() {
  const params = useParams();
  const router = useRouter();
  const { getSdk } = useAuth();
  const { showToast } = useToast();

  const projectId = params.projectId as string;
  const deploymentId = params.deploymentId as string;

  const [deployment, setDeployment] = useState<Deployment | null>(null);
  const [logs, setLogs] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [acting, setActing] = useState<string | null>(null);
  const [showRollbackPicker, setShowRollbackPicker] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [logStream, setLogStream] = useState<boolean>(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const sdk = getSdk();
      const [dep, logData] = await Promise.all([
        sdk.deployments.get(projectId, deploymentId),
        sdk.deployments.getLogs(projectId, deploymentId),
      ]);
      setDeployment(dep as Deployment);
      setLogs(typeof logData === 'string' ? logData : (logData as any).logs ?? JSON.stringify(logData));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load');
    } finally {
      setLoading(false);
    }
  }, [projectId, deploymentId, getSdk]);

  useEffect(() => { load(); }, [load]);

  // Poll for log + status updates while the deployment is in-flight.
  // The backend stores build logs as a single text column (Release.buildLogs)
  // and surfaces them via the one-shot `getLogs` endpoint — there is no SSE
  // stream endpoint. Polling every 2.5s matches the previous working LogConsole.
  useEffect(() => {
    if (!deployment || !['PENDING','QUEUED','BUILDING','DEPLOYING'].includes(deployment.status)) return;
    setLogStream(true);
    let cancelled = false;
    const interval = setInterval(async () => {
      try {
        const sdk = getSdk();
        const [dep, logData] = await Promise.all([
          sdk.deployments.get(projectId, deploymentId),
          sdk.deployments.getLogs(projectId, deploymentId),
        ]);
        if (cancelled) return;
        setDeployment(dep as Deployment);
        setLogs(typeof logData === 'string' ? logData : (logData as any).logs ?? JSON.stringify(logData));
        // Stop polling once the deployment reaches a terminal state.
        if (dep && !['PENDING','QUEUED','BUILDING','DEPLOYING'].includes((dep as Deployment).status)) {
          setLogStream(false);
          clearInterval(interval);
        }
      } catch {
        // Swallow transient polling errors — the next tick retries.
      }
    }, 2500);
    return () => { cancelled = true; clearInterval(interval); setLogStream(false); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId, deploymentId, deployment?.status]);

  async function handleAction(action: string) {
    setActing(action);
    try {
      const sdk = getSdk();
      if (action === 'stop') {
        await sdk.deployments.stop(projectId, deploymentId);
        showToast({ type: 'success', message: 'Deployment stopped.' });
      }
      if (action === 'restart') {
        await sdk.deployments.restart(projectId, deploymentId);
        showToast({ type: 'success', message: 'Deployment restarted.' });
      }
      if (action === 'delete') {
        await sdk.deployments.destroy(projectId, deploymentId);
        showToast({ type: 'success', message: 'Deployment deleted.' });
        router.push(`/projects/${projectId}?section=deployments`);
        return;
      }
      await load();
    } catch (err) {
      showToast({ type: 'error', message: err instanceof Error ? err.message : `Action failed: ${action}` });
    } finally {
      setActing(null);
    }
  }

  if (loading) return <div className="flex items-center justify-center min-h-64"><Spinner size="lg" /></div>;
  if (error || !deployment) return (
    <div className="p-6">
      <p className="text-[var(--danger)] text-sm">{error ?? 'Not found'}</p>
      <Link href={`/projects/${projectId}?section=deployments`} className="text-xs text-[var(--text-muted)] hover:text-[var(--text-muted)] mt-2 inline-block">← Back</Link>
    </div>
  );

  const inFlight = ['PENDING', 'QUEUED', 'BUILDING', 'DEPLOYING'].includes(deployment.status);
  const canRollback = deployment.status === 'SUCCESS';
  const canDelete = ['SUCCESS', 'STOPPED', 'FAILED'].includes(deployment.status);

  return (
    <div className="p-6 space-y-6 max-w-4xl">
      {/* Back link */}
      <Link href={`/projects/${projectId}?section=deployments`}
        className="text-xs text-[var(--text-dim)] hover:text-[var(--text-muted)] inline-flex items-center gap-1 transition-colors">
        ← Back to Deployments
      </Link>

      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <span className={`text-sm px-2.5 py-1 rounded-full border capitalize font-medium ${statusColor(deployment.status)}`}>
              {deployment.status?.toLowerCase()}
            </span>
            {acting && <Spinner size="sm" />}
            {logStream && <span className="text-xs text-[var(--accent)] animate-pulse"> Streaming</span>}
          </div>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-[var(--text-muted)]">
            <span className="flex items-center gap-1.5">
              <HugeiconsIcon icon={Clock02Icon} size={12} className="text-[var(--text-dim)]" />
              {new Date(deployment.createdAt).toLocaleString()}
            </span>
            {deployment.completedAt && (
              <span>{formatDuration(deployment.createdAt, deployment.completedAt)}</span>
            )}
          </div>
          {deployment.deploymentUrl && (
            <div className="flex items-center gap-2">
              <a href={deployment.deploymentUrl} target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-1.5 text-sm text-[var(--accent)] hover:text-[var(--accent)] transition-colors">
                <HugeiconsIcon icon={ExternalLinkIcon} size={12} />
                {deployment.deploymentUrl.replace(/^https?:\/\//, '')}
              </a>
              <button onClick={() => { navigator.clipboard.writeText(deployment.deploymentUrl!); showToast({ type: 'success', message: 'URL copied.' }); }}
                className="text-[var(--text-dim)] hover:text-[var(--text-muted)] transition-colors" title="Copy URL">
                <HugeiconsIcon icon={Copy01Icon} size={12} />
              </button>
            </div>
          )}
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          {inFlight && (
            <Button variant="secondary" size="sm" onClick={() => handleAction('stop')} loading={acting === 'stop'}>
              <HugeiconsIcon icon={StopCircleIcon} size={13} />
              Stop
            </Button>
          )}
          {(deployment.status === 'STOPPED' || deployment.status === 'FAILED') && (
            <Button variant="secondary" size="sm" onClick={() => handleAction('restart')} loading={acting === 'restart'}>
              <HugeiconsIcon icon={PlayCircleIcon} size={13} />
              Restart
            </Button>
          )}
          {canRollback && (
            <Button variant="secondary" size="sm" onClick={() => setShowRollbackPicker(true)}>
              <HugeiconsIcon icon={RotateClockwiseIcon} size={13} />
              Rollback
            </Button>
          )}
          {canDelete && (
            <Button variant="danger" size="sm" onClick={() => setShowDeleteConfirm(true)}>
              <HugeiconsIcon icon={Delete01Icon} size={13} />
              Delete
            </Button>
          )}
        </div>
      </div>

      {/* State machine timeline — accessible */}
      <Card className="border border-[var(--rail)] p-5">
        <h2 className="text-sm font-semibold text-[var(--text)] mb-5" id="deployment-progress">Deployment Progress</h2>
        <div
          className="flex items-center gap-1 flex-wrap"
          role="region"
          aria-labelledby="deployment-progress"
          aria-live="polite"
        >
          {STEPS.map((step, i) => {
            const current = stepIndex(deployment.status);
            const reached = i < current || (i === current && !TERMINAL.includes(deployment.status ?? ''));
            const isCurrent = i === current;
            const isTerminalFailed = deployment.status === 'FAILED' && i === current;
            const isTerminalSuccess = deployment.status === 'SUCCESS' && i === current;

            return (
              <div key={step.key} className="flex items-center gap-1">
                <div className="flex flex-col items-center">
                  <div
                    className={`w-7 h-7 rounded-full flex items-center justify-center text-[var(--text)] text-xs font-bold transition-all ${
                      reached ? step.color : 'bg-[var(--rail)]'
                    } ${isCurrent ? 'ring-2 ring-offset-1 ring-offset-[var(--surface-2)]' : ''} ${
                      isCurrent && deployment.status === 'FAILED' ? 'ring-[var(--danger)]/50' :
                      isCurrent ? 'ring-amber-500/50' : ''
                    }`}
                  >
                    {isTerminalFailed ? (
                      <HugeiconsIcon icon={AlertCircleIcon} size={14} />
                    ) : isTerminalSuccess ? (
                      <HugeiconsIcon icon={CheckmarkCircle02Icon} size={14} />
                    ) : isCurrent ? (
                      <Spinner size="sm" />
                    ) : reached ? (
                      <HugeiconsIcon icon={CheckmarkCircle02Icon} size={14} />
                    ) : ''}
                  </div>
                  <span className={`text-[11px] mt-1.5 whitespace-nowrap ${isCurrent ? 'text-[var(--text)] font-medium' : 'text-[var(--text-dim)]'}`}>
                    {step.label}
                  </span>
                </div>
                {i < STEPS.length - 1 && (
                  <div className={`h-0.5 mb-5 w-10 ${i < current ? STEPS[i].color : 'bg-[var(--rail)]'}`} />
                )}
              </div>
            );
          })}
        </div>

        {/* Terminal state indicator */}
        {TERMINAL.includes(deployment.status ?? '') && (
          <div className={`mt-4 flex items-center gap-2 text-xs px-3 py-2 rounded-lg border ${
            deployment.status === 'FAILED' ? 'border-[var(--danger)]/30/50 bg-[var(--danger)]/10 text-[var(--danger)]' :
            deployment.status === 'ROLLED_BACK' ? 'border-purple-800/50 bg-purple-900/20 text-purple-400' :
            deployment.status === 'BLOCKED' ? 'border-orange-800/50 bg-orange-900/20 text-[var(--warning)]' :
            'border-[var(--rail)]/50 bg-[var(--surface-2)]/20 text-[var(--text-muted)]'
          }`}>
            {deployment.status === 'FAILED' ? <HugeiconsIcon icon={AlertCircleIcon} size={14} /> :
             deployment.status === 'STOPPED' ? <HugeiconsIcon icon={StopCircleIcon} size={14} /> :
             <HugeiconsIcon icon={RotateClockwiseIcon} size={14} />}
            <span>Deployment {deployment.status.toLowerCase().replace('_', ' ')}</span>
          </div>
        )}
      </Card>

      {/* Metadata panel */}
      {(deployment.branch || deployment.commitSha || deployment.imageTag || deployment.sourceUrl || deployment.createdBy) && (
        <Card className="border border-[var(--rail)] p-5">
          <h2 className="text-sm font-semibold text-[var(--text)] mb-4">Deployment details</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <MetadataRow icon={GitBranchIcon}  label="Branch"     value={deployment.branch}    mono copyable />
            <MetadataRow icon={GitCommitIcon} label="Commit"     value={deployment.commitSha?.slice(0, 7)} mono copyable />
            <MetadataRow icon={Image01Icon}   label="Image tag"  value={deployment.imageTag}   mono copyable />
            <MetadataRow icon={User02Icon}    label="Triggered by" value={deployment.createdBy} />
            <MetadataRow icon={ExternalLinkIcon} label="Source URL" value={deployment.sourceUrl} copyable className="sm:col-span-2" />
          </div>
        </Card>
      )}

      {/* Build logs */}
      {logs !== undefined && <LogViewer logs={logs} inFlight={inFlight} />}

      {/* Live preview — shown when deployment is live with a URL */}
      {deployment.status === 'SUCCESS' && deployment.deploymentUrl && (
        <LivePreview url={deployment.deploymentUrl} />
      )}

      {/* Rollback picker modal */}
      {showRollbackPicker && (
        <Modal isOpen={true} title="Roll back deployment" onClose={() => setShowRollbackPicker(false)}>
          <RollbackPicker
            projectId={projectId}
            currentId={deploymentId}
            onPicked={() => { setShowRollbackPicker(false); showToast({ type: 'success', message: 'Rollback initiated.' }); load(); }}
            onClose={() => setShowRollbackPicker(false)}
          />
        </Modal>
      )}

      {/* Delete confirm dialog */}
      {showDeleteConfirm && (
        <ConfirmDialog
          title="Delete deployment"
          message="This will permanently delete this deployment and remove it from the list. This action cannot be undone."
          confirmLabel="Delete deployment"
          variant="danger"
          onConfirm={() => { setShowDeleteConfirm(false); handleAction('delete'); }}
          onClose={() => setShowDeleteConfirm(false)}
        />
      )}
    </div>
  );
}

export default function DeploymentDetailPage() {
  return (
    <ToastProvider>
      <DeploymentDetailInner />
    </ToastProvider>
  );
}
