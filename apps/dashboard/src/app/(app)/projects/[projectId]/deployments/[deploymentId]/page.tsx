'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Card, Button, Spinner, Modal } from '@fidscript/ui';
import { HugeiconsIcon } from '@hugeicons/react';
import { ChevronRightIcon, GitBranchIcon, GitCommitIcon, Image01Icon, ExternalLinkIcon, Copy01Icon, CheckmarkCircle02Icon, AlertCircleIcon, StopCircleIcon, PlayCircleIcon, Delete01Icon, RotateClockwiseIcon, Download01Icon, RefreshIcon, User02Icon, Clock02Icon, CheckmarkCircle03Icon } from '@hugeicons/core-free-icons';

import { useAuth } from '@/contexts/auth-context';
import type { Deployment } from '@/types';
import { ToastProvider, useToast } from '@/components/toast-provider';

// ── State machine ─────────────────────────────────────────────────────────────

const STEPS = [
  { key: 'PENDING',      label: 'Pending',    color: 'bg-blue-500' },
  { key: 'QUEUED',       label: 'Queued',     color: 'bg-blue-500' },
  { key: 'BUILDING',     label: 'Building',   color: 'bg-amber-500' },
  { key: 'DEPLOYING',    label: 'Deploying',  color: 'bg-amber-500' },
  { key: 'SUCCESS',      label: 'Success',    color: 'bg-emerald-500' },
];

const TERMINAL = ['FAILED', 'STOPPED', 'ROLLED_BACK', 'BLOCKED'];

function stepIndex(status?: string): number {
  return STEPS.findIndex(s => s.key === status?.toUpperCase()) ?? 0;
}

function statusColor(status?: string) {
  switch (status?.toUpperCase()) {
    case 'SUCCESS':     return 'bg-emerald-900/60 text-emerald-400 border-emerald-800';
    case 'FAILED':      return 'bg-red-900/60 text-red-400 border-red-800';
    case 'PENDING':
    case 'QUEUED':      return 'bg-blue-900/60 text-blue-400 border-blue-800';
    case 'BUILDING':
    case 'DEPLOYING':   return 'bg-amber-900/60 text-amber-400 border-amber-800';
    case 'STOPPED':     return 'bg-slate-800 text-slate-400 border-slate-700';
    case 'ROLLED_BACK': return 'bg-purple-900/60 text-purple-400 border-purple-800';
    case 'BLOCKED':     return 'bg-orange-900/60 text-orange-400 border-orange-800';
    default:            return 'bg-slate-800 text-slate-400 border-slate-700';
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
      <HugeiconsIcon icon={Icon} size={13} className="text-slate-600 mt-0.5 flex-shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-xs text-slate-600">{label}</p>
        <div className="flex items-center gap-1.5">
          <p className={`text-xs text-slate-300 truncate ${mono ? 'font-mono' : ''}`}>{value}</p>
          {copyable && (
            <button
              onClick={() => { navigator.clipboard.writeText(value); setCopied(true); setTimeout(() => setCopied(false), 1500); }}
              className="text-slate-600 hover:text-slate-400 transition-colors flex-shrink-0"
              title="Copy"
            >
              <HugeiconsIcon icon={copied ? CheckmarkCircle03Icon : Copy01Icon} size={11} className={copied ? 'text-emerald-500' : ''} />
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
  debug: 'text-slate-500',
  info:  'text-blue-400',
  warn:  'text-amber-400',
  error: 'text-red-400',
  fatal: 'text-red-400 font-bold',
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

function LogViewer({ logs }: { logs: string }) {
  const [show, setShow] = useState(false);
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
    <div className="rounded-lg border border-[#1e2130] overflow-hidden">
      {/* Toolbar */}
      <div className="flex items-center gap-3 px-4 py-2.5 bg-[#0f1117] border-b border-[#1e2130] flex-wrap">
        <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">Build logs</span>
        <div className="flex items-center gap-1">
          {LOG_LEVELS.map(lvl => (
            <button
              key={lvl}
              onClick={() => toggleLevel(lvl)}
              className={`text-[10px] font-mono uppercase px-2 py-1 rounded border transition-colors ${
                activeLevels.has(lvl)
                  ? `${LEVEL_STYLE[lvl]} border-transparent`
                  : 'text-slate-700 border-slate-700 bg-transparent hover:text-slate-500'
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
          className="w-40 text-xs px-2.5 py-1.5 rounded bg-[#080a0d] border border-[#1e2130] text-slate-300 placeholder:text-slate-600 focus:outline-none focus:border-[#2a2d3a]"
        />
        <button onClick={copyAll}   title="Copy all"  className="text-slate-600 hover:text-slate-300 transition-colors"><HugeiconsIcon icon={Copy01Icon}      size={13} /></button>
        <button onClick={downloadLogs} title="Download" className="text-slate-600 hover:text-slate-300 transition-colors"><HugeiconsIcon icon={Download01Icon} size={13} /></button>
        <button onClick={() => setAutoScroll(s => !s)} title={autoScroll ? 'Auto-scroll on' : 'Auto-scroll off'}
          className={`text-xs transition-colors ${autoScroll ? 'text-blue-400' : 'text-slate-600 hover:text-slate-400'}`}>
          <HugeiconsIcon icon={RefreshIcon} size={13} />
        </button>
      </div>

      {/* Log body */}
      <button
        onClick={() => setShow(s => !s)}
        className="w-full flex items-center justify-between px-4 py-2.5 bg-[#0f1117] border-b border-[#1e2130] text-xs text-slate-500 hover:text-slate-300 transition-colors text-left"
      >
        <span>{show ? 'Hide' : 'Show'} {filtered.length} log lines</span>
        <span className="text-slate-700">{show ? '▲' : '▼'}</span>
      </button>

      {show && (
        <div
          ref={containerRef}
          className="bg-[#080a0d] overflow-y-auto"
          style={{ maxHeight: '400px' }}
          onScroll={() => {
            const el = containerRef.current;
            if (!el) return;
            setAutoScroll(el.scrollHeight - el.scrollTop - el.clientHeight < 32);
          }}
        >
          {filtered.length === 0 ? (
            <p className="p-6 text-xs text-slate-600">No log entries match your filters.</p>
          ) : (
            <div className="divide-y divide-[#1e2130]/40">
              {filtered.map(line => (
                <div key={line.id} className="flex items-start gap-3 px-4 py-1.5 hover:bg-[#1e2130]/20">
                  {line.ts && (
                    <span className="text-[10px] font-mono text-slate-600 flex-shrink-0 mt-0.5 w-36">
                      {new Date(line.ts).toLocaleTimeString()}
                    </span>
                  )}
                  <span className={`text-[10px] font-mono uppercase px-1.5 py-0.5 rounded flex-shrink-0 mt-0.5 ${LEVEL_STYLE[line.level]}`}>
                    {line.level}
                  </span>
                  <span className="text-xs font-mono text-slate-300 leading-relaxed whitespace-pre-wrap break-all">
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
        <p className="text-sm text-slate-300 mb-1">Select a deployment to roll back to</p>
        <p className="text-xs text-slate-500">A new deployment will be created using the image from the selected release.</p>
      </div>

      {loading ? (
        <div className="flex justify-center py-6"><Spinner size="md" /></div>
      ) : deployments.length === 0 ? (
        <p className="text-xs text-slate-500 py-4 text-center">No prior successful deployments found.</p>
      ) : (
        <div className="flex flex-col gap-1.5 max-h-60 overflow-y-auto">
          {deployments.slice(0, 10).map(d => (
            <button
              key={d.id}
              onClick={() => setSelected(d.id)}
              className={`flex items-center gap-3 p-3 rounded-lg border text-left transition-all ${
                selected === d.id
                  ? 'border-red-500/40 bg-red-500/5'
                  : 'border-[#1e2130] hover:border-[#2a2d3a] bg-[#080a0d]'
              }`}
            >
              <div className={`w-3 h-3 rounded-full flex-shrink-0 ${selected === d.id ? 'bg-red-500' : 'bg-slate-700'}`} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono text-slate-300">{d.commitSha?.slice(0, 7) ?? d.id.slice(0, 8)}</span>
                  {d.branch && <span className="text-xs text-slate-600">· {d.branch}</span>}
                </div>
                <p className="text-[10px] text-slate-600">
                  {new Date(d.createdAt).toLocaleString()}
                  {d.imageTag && <span className="ml-2 font-mono">{d.imageTag}</span>}
                </p>
              </div>
            </button>
          ))}
        </div>
      )}

      {error && <p className="text-xs text-red-400">{error}</p>}

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
      <div className="relative bg-[#0f1117] border border-[#1e2130] rounded-xl shadow-2xl w-full max-w-md mx-4 p-6 space-y-4">
        <h2 className="text-sm font-semibold text-slate-200">{title}</h2>
        <p className="text-sm text-slate-400 leading-relaxed">{message}</p>
        {requiresText && (
          <input
            value={confirmText}
            onChange={e => setConfirmText(e.target.value)}
            placeholder='Type "delete" to confirm'
            className="w-full px-3 py-2 rounded-lg bg-[#080a0d] border border-[#1e2130] text-sm text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-red-500"
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
      <p className="text-red-400 text-sm">{error ?? 'Not found'}</p>
      <Link href={`/projects/${projectId}?section=deployments`} className="text-xs text-slate-500 hover:text-slate-300 mt-2 inline-block">← Back</Link>
    </div>
  );

  const inFlight = ['PENDING', 'QUEUED', 'BUILDING', 'DEPLOYING'].includes(deployment.status);
  const canRollback = deployment.status === 'SUCCESS';
  const canDelete = ['SUCCESS', 'STOPPED', 'FAILED'].includes(deployment.status);

  return (
    <div className="p-6 space-y-6 max-w-4xl">
      {/* Back link */}
      <Link href={`/projects/${projectId}?section=deployments`}
        className="text-xs text-slate-600 hover:text-slate-300 inline-flex items-center gap-1 transition-colors">
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
            {logStream && <span className="text-xs text-blue-400 animate-pulse">● Streaming</span>}
          </div>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500">
            <span className="flex items-center gap-1.5">
              <HugeiconsIcon icon={Clock02Icon} size={12} className="text-slate-600" />
              {new Date(deployment.createdAt).toLocaleString()}
            </span>
            {deployment.completedAt && (
              <span>{formatDuration(deployment.createdAt, deployment.completedAt)}</span>
            )}
          </div>
          {deployment.deploymentUrl && (
            <div className="flex items-center gap-2">
              <a href={deployment.deploymentUrl} target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-1.5 text-sm text-blue-500 hover:text-blue-400 transition-colors">
                <HugeiconsIcon icon={ExternalLinkIcon} size={12} />
                {deployment.deploymentUrl.replace(/^https?:\/\//, '')}
              </a>
              <button onClick={() => { navigator.clipboard.writeText(deployment.deploymentUrl!); showToast({ type: 'success', message: 'URL copied.' }); }}
                className="text-slate-600 hover:text-slate-400 transition-colors" title="Copy URL">
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
      <Card className="border border-[#1e2130] p-5">
        <h2 className="text-sm font-semibold text-slate-200 mb-5" id="deployment-progress">Deployment Progress</h2>
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
                    className={`w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold transition-all ${
                      reached ? step.color : 'bg-slate-800'
                    } ${isCurrent ? 'ring-2 ring-offset-1 ring-offset-[#0f1117]' : ''} ${
                      isCurrent && deployment.status === 'FAILED' ? 'ring-red-500/50' :
                      isCurrent ? 'ring-amber-500/50' : ''
                    }`}
                  >
                    {isTerminalFailed ? (
                      <HugeiconsIcon icon={AlertCircleIcon} size={14} />
                    ) : isTerminalSuccess || reached ? (
                      <HugeiconsIcon icon={CheckmarkCircle02Icon} size={14} />
                    ) : ''}
                  </div>
                  <span className={`text-[11px] mt-1.5 whitespace-nowrap ${isCurrent ? 'text-slate-200 font-medium' : 'text-slate-600'}`}>
                    {step.label}
                  </span>
                </div>
                {i < STEPS.length - 1 && (
                  <div className={`h-0.5 mb-5 w-10 ${i < current ? STEPS[i].color : 'bg-slate-800'}`} />
                )}
              </div>
            );
          })}
        </div>

        {/* Terminal state indicator */}
        {TERMINAL.includes(deployment.status ?? '') && (
          <div className={`mt-4 flex items-center gap-2 text-xs px-3 py-2 rounded-lg border ${
            deployment.status === 'FAILED' ? 'border-red-800/50 bg-red-900/20 text-red-400' :
            deployment.status === 'ROLLED_BACK' ? 'border-purple-800/50 bg-purple-900/20 text-purple-400' :
            deployment.status === 'BLOCKED' ? 'border-orange-800/50 bg-orange-900/20 text-orange-400' :
            'border-slate-800/50 bg-slate-900/20 text-slate-400'
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
        <Card className="border border-[#1e2130] p-5">
          <h2 className="text-sm font-semibold text-slate-200 mb-4">Deployment details</h2>
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
      {logs && <LogViewer logs={logs} />}

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
