'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Button, Card, EmptyState, Input, Modal, Spinner } from '@fidscript/ui';
import { HugeiconsIcon } from '@hugeicons/react';
import { AlarmClockIcon, CheckmarkCircle02Icon, Cancel01Icon, AlertCircleIcon, Refresh01Icon } from '@hugeicons/core-free-icons';
import { useAuth } from '@/contexts/auth-context';
import type { CronJob, CronJobRun } from '@/types';

const CRON_PRESETS = [
  { label: 'Every minute', value: '* * * * *' },
  { label: 'Every 5 min', value: '*/5 * * * *' },
  { label: 'Hourly', value: '0 * * * *' },
  { label: 'Daily', value: '0 0 * * *' },
  { label: 'Weekly', value: '0 0 * * 0' },
];

function formatDuration(ms: number | undefined): string {
  if (!ms) return '—';
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60_000) return `${(ms / 1000).toFixed(1)}s`;
  return `${Math.floor(ms / 60_000)}m ${((ms % 60_000) / 1000).toFixed(0)}s`;
}

function statusColor(status: CronJobRun['status']): { bg: string; text: string; border: string; icon: typeof CheckmarkCircle02Icon; dot: string } {
  switch (status) {
    case 'completed': return { bg: 'bg-[var(--success)]/10', text: 'text-[var(--success)]', border: 'border-[var(--success)]/20', icon: CheckmarkCircle02Icon, dot: 'bg-[var(--success)]' };
    case 'failed':    return { bg: 'bg-[var(--danger)]/10',  text: 'text-[var(--danger)]',  border: 'border-[var(--danger)]/20',  icon: Cancel01Icon, dot: 'bg-[var(--danger)]' };
    case 'skipped':   return { bg: 'bg-[var(--warning)]/10',text: 'text-[var(--warning)]', border: 'border-[var(--warning)]/20',icon: AlertCircleIcon, dot: 'bg-[var(--warning)]' };
    default:          return { bg: 'bg-[var(--accent)]/10', text: 'text-[var(--accent)]', border: 'border-[var(--accent)]/20', icon: AlarmClockIcon, dot: 'bg-[var(--accent)]' };
  }
}

// ── Run detail modal ─────────────────────────────────────────────────────────
function RunDetailModal({ run, onClose }: { run: CronJobRun; onClose: () => void }) {
  const { bg, text, border, icon } = statusColor(run.status);
  const startedAt = new Date(run.startedAt);
  const completedAt = run.completedAt ? new Date(run.completedAt) : null;
  const copied = false;

  return (
    <Modal isOpen onClose={onClose} title="Execution detail" size="md">
      <div className="space-y-4">
        {/* Status banner */}
        <div className={`flex items-center gap-3 px-4 py-3 rounded-xl border ${bg} ${border}`}>
          <HugeiconsIcon icon={icon} size={20} className={text} />
          <div>
            <p className={`text-sm font-semibold ${text} capitalize`}>{run.status}</p>
            {run.statusReason && <p className="text-xs text-[var(--text-muted)] mt-0.5">{run.statusReason}</p>}
          </div>
          {run.attempt > 1 && (
            <span className="ml-auto text-[10px] bg-[var(--rail)] text-[var(--text-dim)] px-2 py-1 rounded">
              attempt {run.attempt}
            </span>
          )}
        </div>

        {/* Timestamps & duration */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-[var(--surface-2)] border border-[var(--rail)] rounded-lg px-3 py-2">
            <p className="text-[10px] text-[var(--text-dim)] uppercase tracking-wider mb-1">Started</p>
            <p className="text-xs text-[var(--text)] font-mono">{startedAt.toLocaleString()}</p>
          </div>
          <div className="bg-[var(--surface-2)] border border-[var(--rail)] rounded-lg px-3 py-2">
            <p className="text-[10px] text-[var(--text-dim)] uppercase tracking-wider mb-1">Duration</p>
            <p className="text-xs text-[var(--text)] font-mono">
              {run.durationMs != null ? formatDuration(run.durationMs) : '—'}
            </p>
            {completedAt && (
              <p className="text-[10px] text-[var(--text-dim)] font-mono mt-0.5">
                finished {completedAt.toLocaleTimeString()}
              </p>
            )}
          </div>
        </div>

        {/* Error message */}
        {run.errorMessage && (
          <div className="bg-[var(--danger)]/5 border border-[var(--danger)]/20 rounded-lg px-3 py-2">
            <p className="text-[10px] text-[var(--danger)] uppercase tracking-wider font-medium mb-1">Error</p>
            <pre className="text-xs text-[var(--danger)] whitespace-pre-wrap font-mono leading-relaxed">
              {run.errorMessage}
            </pre>
          </div>
        )}

        {/* Raw JSON */}
        <details className="group">
          <summary className="text-[10px] text-[var(--text-muted)] hover:text-[var(--accent)] cursor-pointer list-none flex items-center gap-1">
            <span className="group-open:hidden">▶</span>
            <span className="hidden group-open:block">▼</span>
            Raw record
          </summary>
          <pre className="mt-2 text-[10px] text-[var(--text-dim)] font-mono bg-[var(--surface-2)] border border-[var(--rail)] rounded-lg px-3 py-2 overflow-auto max-h-48">
            {JSON.stringify(run, null, 2)}
          </pre>
        </details>

        {/* Run ID */}
        <div className="flex items-center justify-between bg-[var(--surface-2)] border border-[var(--rail)] rounded-lg px-3 py-2">
          <div>
            <p className="text-[10px] text-[var(--text-dim)] uppercase tracking-wider">Run ID</p>
            <p className="text-xs text-[var(--text)] font-mono mt-0.5">{run.id}</p>
          </div>
          <button
            onClick={() => navigator.clipboard.writeText(run.id)}
            className="text-[10px] text-[var(--text-muted)] hover:text-[var(--accent)] transition-colors"
          >
            Copy
          </button>
        </div>

        <div className="flex justify-end pt-2 border-t border-[var(--rail)]">
          <Button variant="ghost" size="sm" onClick={onClose}>Close</Button>
        </div>
      </div>
    </Modal>
  );
}

// ── Run timeline ─────────────────────────────────────────────────────────────
function RunTimeline({ runs }: { runs: CronJobRun[] }) {
  const recent = [...runs].reverse().slice(-20);
  if (recent.length === 0) return null;
  const maxMs = Math.max(...recent.filter(r => r.durationMs != null).map(r => r.durationMs as number), 1);

  return (
    <div className="flex items-end gap-px h-10 mb-3">
      {recent.map((run, i) => {
        const { dot } = statusColor(run.status);
        const barH = run.durationMs != null
          ? Math.max(4, Math.round((run.durationMs / maxMs) * 36))
          : 6;
        return (
          <div
            key={run.id}
            title={`${run.status} · ${formatDuration(run.durationMs)} · ${new Date(run.startedAt).toLocaleString()}`}
            className={`flex-1 rounded-sm ${dot} opacity-80 hover:opacity-100 transition-opacity cursor-default`}
            style={{ height: `${barH}px` }}
          />
        );
      })}
    </div>
  );
}

export default function ProjectSchedulerJobDetailPage() {
  const { getSdk } = useAuth();
  const params = useParams();
  const router = useRouter();
  const projectId = params.projectId as string;
  const jobId = params.jobId as string;

  const [job, setJob] = useState<CronJob | null>(null);
  const [runs, setRuns] = useState<CronJobRun[]>([]);
  const [simulatedRuns, setSimulatedRuns] = useState<{ scheduledAt: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [triggering, setTriggering] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [simulating, setSimulating] = useState(false);
  const [runsPage, setRunsPage] = useState(1);
  const [selectedRun, setSelectedRun] = useState<CronJobRun | null>(null);
  const RUNS_PER_PAGE = 20;

  // Form state
  const [formName, setFormName] = useState('');
  const [formExpression, setFormExpression] = useState('');
  const [formTimezone, setFormTimezone] = useState('UTC');
  const [formTargetType, setFormTargetType] = useState<'endpoint' | 'function'>('endpoint');
  const [formEndpoint, setFormEndpoint] = useState('');
  const [formFunctionId, setFormFunctionId] = useState('');
  const [formPayload, setFormPayload] = useState('{}');
  const [formRetryAttempts, setFormRetryAttempts] = useState(3);
  const [formRetryDelay, setFormRetryDelay] = useState(60);
  const [formTimeout, setFormTimeout] = useState(300);

  const load = useCallback(async () => {
    if (!projectId || !jobId) return;
    setLoading(true);
    setError(null);
    try {
      const sdk = getSdk();
      const [jobData, runsData, simData] = await Promise.all([
        sdk.cron.get(projectId, jobId),
        sdk.cron.getRuns(projectId, jobId, 100),
        sdk.cron.simulate(projectId, jobId, 5),
      ]);
      setJob(jobData);
      setRuns(runsData);
      setSimulatedRuns(simData);
      populateForm(jobData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load job');
    } finally {
      setLoading(false);
    }
  }, [projectId, jobId, getSdk]);

  useEffect(() => { load(); }, [load]);

  function populateForm(j: CronJob) {
    setFormName(j.name);
    setFormExpression(j.cronExpression);
    setFormTimezone(j.timezone ?? 'UTC');
    setFormTargetType((j.targetType as 'endpoint' | 'function') ?? 'endpoint');
    setFormEndpoint(j.endpoint ?? '');
    setFormFunctionId(j.functionId ?? '');
    setFormPayload(JSON.stringify(j.payload ?? {}, null, 2));
    setFormRetryAttempts(j.retryAttempts ?? 3);
    setFormRetryDelay(j.retryDelaySeconds ?? 60);
    setFormTimeout(j.timeoutSeconds ?? 300);
  }

  async function handleTrigger() {
    if (!projectId || !jobId) return;
    setTriggering(true);
    try {
      const sdk = getSdk();
      await sdk.cron.trigger(projectId, jobId);
      const runsData = await sdk.cron.getRuns(projectId, jobId, 100);
      setRuns(runsData);
    } finally {
      setTriggering(false);
    }
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!projectId || !jobId || !formName.trim() || !formExpression.trim()) return;
    setSaving(true);
    setSaveError(null);
    try {
      const sdk = getSdk();
      let parsedPayload = {};
      try { parsedPayload = JSON.parse(formPayload); } catch { /* ignore */ }
      const updated = await sdk.cron.update(projectId, jobId, {
        name: formName.trim(),
        cronExpression: formExpression.trim(),
        timezone: formTimezone,
        targetType: formTargetType,
        ...(formTargetType === 'endpoint'
          ? { endpoint: formEndpoint }
          : { functionId: formFunctionId }),
        payload: parsedPayload,
        retryAttempts: formRetryAttempts,
        retryDelaySeconds: formRetryDelay,
        timeoutSeconds: formTimeout,
      } as any);
      setJob(updated);
      setShowEdit(false);
      // Re-simulate with new expression
      const simData = await sdk.cron.simulate(projectId, jobId, 5);
      setSimulatedRuns(simData);
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Failed to update job');
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <Spinner size="lg" />
      </div>
    );
  }

  if (error || !job) {
    return (
      <div className="flex flex-col items-center justify-center min-h-96 gap-4">
        <p className="text-[var(--danger)] text-sm">{error ?? 'Job not found'}</p>
        <Button variant="ghost" size="sm" onClick={() => router.back()}>
          Go back
        </Button>
      </div>
    );
  }

  const successRate = runs.length > 0
    ? Math.round((runs.filter(r => r.status === 'completed').length / runs.length) * 100)
    : null;

  const recentRuns = runs.slice(0, runsPage * RUNS_PER_PAGE);
  const hasMoreRuns = runs.length > recentRuns.length;

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div className="min-w-0">
          <button
            onClick={() => router.push(`/projects/${projectId}/scheduler`)}
            className="text-xs text-[var(--text-muted)] hover:text-[var(--accent)] transition-colors flex items-center gap-1 mb-2"
          >
            ← Scheduler
          </button>
          <div className="flex items-center gap-3 mb-1">
            <h1 className="text-xl font-bold text-[var(--text)] truncate">{job.name}</h1>
            <span className={`flex-shrink-0 text-[10px] px-2 py-0.5 rounded-full border font-medium ${
              job.enabled
                ? 'bg-[var(--success)]/10 text-[var(--success)] border-[var(--success)]/20'
                : 'bg-[var(--rail)] text-[var(--text-muted)] border-[var(--rail-light)]'
            }`}>
              {job.enabled ? 'Active' : 'Paused'}
            </span>
          </div>
          <p className="text-xs text-[var(--text-dim)] font-mono">
            {job.cronExpression} · {job.timezone ?? 'UTC'} · {job.retryAttempts} retries
          </p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <Button variant="secondary" size="sm" onClick={() => { populateForm(job!); setShowEdit(true); }}>
            Edit
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={handleTrigger}
            loading={triggering}
            disabled={!job.enabled}
          >
            Run now
          </Button>
        </div>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard label="Next run" value={job.nextRunAt ? new Date(job.nextRunAt).toLocaleString() : '—'} icon={AlarmClockIcon} />
        <StatCard label="Last run" value={job.lastRunAt ? new Date(job.lastRunAt).toLocaleString() : 'Never'} icon={AlarmClockIcon} />
        <StatCard
          label="Success rate"
          value={successRate !== null ? `${successRate}%` : '—'}
          valueColor={successRate !== null ? (successRate >= 80 ? 'text-[var(--success)]' : successRate >= 50 ? 'text-[var(--warning)]' : 'text-[var(--danger)]') : undefined}
          icon={CheckmarkCircle02Icon}
        />
        <StatCard label="Timeout" value={`${job.timeoutSeconds}s`} icon={AlertCircleIcon} />
      </div>

      {/* Dry-run: upcoming executions */}
      {simulatedRuns.length > 0 && (
        <Card className="border border-[var(--rail)]" padding="md">
          <div className="flex items-center gap-2 mb-3">
            <HugeiconsIcon icon={AlarmClockIcon} size={14} className="text-[var(--accent)]" />
            <h2 className="text-sm font-semibold text-[var(--text)]">Upcoming executions</h2>
          </div>
          <div className="flex flex-wrap gap-2">
            {simulatedRuns.map((r, i) => (
              <div key={i} className="bg-[var(--surface-2)] border border-[var(--rail)] rounded-lg px-3 py-1.5">
                <p className="text-xs text-[var(--text-muted)] font-mono">
                  {new Date(r.scheduledAt).toLocaleDateString()} {new Date(r.scheduledAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Execution history */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-[var(--text)]">Execution history</h2>
          {runs.length > 0 && (
            <span className="text-xs text-[var(--text-muted)]">{runs.length} runs recorded</span>
          )}
        </div>

        {runs.length === 0 ? (
          <Card className="border border-[var(--rail)]">
            <EmptyState
              title="No runs yet"
              description="Trigger the job manually or wait for the next scheduled run."
            />
          </Card>
        ) : (
          <>
            <RunTimeline runs={runs} />
            <div className="space-y-2">
              {recentRuns.map(run => {
                const { bg, text, border, icon } = statusColor(run.status);
                return (
                  <button
                    key={run.id}
                    onClick={() => setSelectedRun(run)}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border ${bg} ${border} transition-colors cursor-pointer text-left hover:brightness-110`}
                  >
                    <HugeiconsIcon icon={icon} size={16} className={text + ' flex-shrink-0'} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 flex-wrap">
                        <span className={`text-xs font-medium ${text}`}>{run.status}</span>
                        <span className="text-xs text-[var(--text-muted)] font-mono">{run.id.slice(0, 12)}…</span>
                        {run.attempt > 1 && (
                          <span className="text-[10px] text-[var(--text-dim)] bg-[var(--rail)] px-1.5 py-0.5 rounded">
                            attempt {run.attempt}
                          </span>
                        )}
                      </div>
                      {run.errorMessage && (
                        <p className="text-[10px] text-[var(--danger)] mt-0.5 truncate" title={run.errorMessage}>
                          {run.errorMessage}
                        </p>
                    )}
                  </div>
                  <div className="flex items-center gap-4 flex-shrink-0">
                    <span className="text-xs text-[var(--text-dim)]">
                      {new Date(run.startedAt).toLocaleString()}
                    </span>
                    {run.durationMs != null && (
                      <span className="text-xs text-[var(--text-dim)] font-mono tabular-nums">
                        {formatDuration(run.durationMs)}
                      </span>
                    )}
                  </div>
                  </button>
              );
            })}
            {hasMoreRuns && (
              <button
                onClick={() => setRunsPage(p => p + 1)}
                className="w-full py-2 text-xs text-[var(--text-muted)] hover:text-[var(--accent)] transition-colors flex items-center justify-center gap-1"
              >
                <HugeiconsIcon icon={Refresh01Icon} size={12} />
                Load more ({runs.length - recentRuns.length} remaining)
              </button>
            )}
          </div>
          </>
        )}
      </div>

      {/* Edit Modal */}
      <Modal isOpen={showEdit} onClose={() => setShowEdit(false)} title="Edit Cron Job" size="lg">
        <form onSubmit={handleSave} noValidate>
          <div className="space-y-5">
            <div>
              <label className="block text-xs text-[var(--text-muted)] mb-1.5 font-medium">Job name</label>
              <Input
                value={formName}
                onChange={e => setFormName(e.target.value)}
                className="bg-[var(--surface-2)] border border-[var(--rail)] text-[var(--text)] w-full"
              />
            </div>
            <div>
              <label className="block text-xs text-[var(--text-muted)] mb-1.5 font-medium">Cron expression</label>
              <Input
                value={formExpression}
                onChange={e => setFormExpression(e.target.value)}
                className="bg-[var(--surface-2)] border border-[var(--rail)] text-[var(--text)] w-full font-mono"
              />
              <div className="flex flex-wrap gap-1.5 mt-2">
                {CRON_PRESETS.map(p => (
                  <button
                    key={p.value}
                    type="button"
                    onClick={() => setFormExpression(p.value)}
                    className="text-[10px] px-2 py-0.5 rounded border border-[var(--rail)] text-[var(--text-muted)] hover:border-[var(--accent)] transition-colors"
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-xs text-[var(--text-muted)] mb-1.5 font-medium">Timezone</label>
              <select
                value={formTimezone}
                onChange={e => setFormTimezone(e.target.value)}
                className="bg-[var(--surface-2)] border border-[var(--rail)] text-[var(--text)] rounded-lg px-3 py-2 text-sm w-full"
              >
                {['UTC', 'America/New_York', 'Europe/London', 'Asia/Tokyo', 'Asia/Singapore'].map(tz => (
                  <option key={tz} value={tz}>{tz}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs text-[var(--text-muted)] mb-1.5 font-medium">Target</label>
              <div className="flex gap-4">
                {(['endpoint', 'function'] as const).map(t => (
                  <label key={t} className="flex items-center gap-2 text-sm text-[var(--text-muted)] cursor-pointer">
                    <input
                      type="radio"
                      name="editTargetType"
                      value={t}
                      checked={formTargetType === t}
                      onChange={() => setFormTargetType(t)}
                      className="accent-[var(--accent)]"
                    />
                    {t === 'endpoint' ? 'HTTP Endpoint' : 'Function'}
                  </label>
                ))}
              </div>
            </div>
            {formTargetType === 'endpoint' ? (
              <div>
                <label className="block text-xs text-[var(--text-muted)] mb-1.5 font-medium">URL</label>
                <Input
                  value={formEndpoint}
                  onChange={e => setFormEndpoint(e.target.value)}
                  className="bg-[var(--surface-2)] border border-[var(--rail)] text-[var(--text)] w-full"
                />
              </div>
            ) : (
              <div>
                <label className="block text-xs text-[var(--text-muted)] mb-1.5 font-medium">Function ID</label>
                <Input
                  value={formFunctionId}
                  onChange={e => setFormFunctionId(e.target.value)}
                  className="bg-[var(--surface-2)] border border-[var(--rail)] text-[var(--text)] w-full"
                />
              </div>
            )}
            <div>
              <label className="block text-xs text-[var(--text-muted)] mb-1.5 font-medium">Payload (JSON)</label>
              <textarea
                value={formPayload}
                onChange={e => setFormPayload(e.target.value)}
                rows={3}
                className="bg-[var(--surface-2)] border border-[var(--rail)] text-[var(--text)] w-full font-mono text-xs resize-none rounded-lg px-3 py-2 focus:outline-none focus:border-[var(--accent)]"
              />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-xs text-[var(--text-muted)] mb-1.5 font-medium">Retries</label>
                <Input
                  type="number"
                  min={0}
                  max={10}
                  value={formRetryAttempts}
                  onChange={e => setFormRetryAttempts(Math.max(0, parseInt(e.target.value) || 0))}
                  className="bg-[var(--surface-2)] border border-[var(--rail)] text-[var(--text)] w-full"
                />
              </div>
              <div>
                <label className="block text-xs text-[var(--text-muted)] mb-1.5 font-medium">Retry delay (s)</label>
                <Input
                  type="number"
                  min={1}
                  max={3600}
                  value={formRetryDelay}
                  onChange={e => setFormRetryDelay(Math.max(1, parseInt(e.target.value) || 60))}
                  className="bg-[var(--surface-2)] border border-[var(--rail)] text-[var(--text)] w-full"
                />
              </div>
              <div>
                <label className="block text-xs text-[var(--text-muted)] mb-1.5 font-medium">Timeout (s)</label>
                <Input
                  type="number"
                  min={1}
                  max={3600}
                  value={formTimeout}
                  onChange={e => setFormTimeout(Math.max(1, parseInt(e.target.value) || 300))}
                  className="bg-[var(--surface-2)] border border-[var(--rail)] text-[var(--text)] w-full"
                />
              </div>
            </div>
            {saveError && (
              <p className="text-sm text-[var(--danger)]">{saveError}</p>
            )}
            <div className="flex justify-end gap-3 pt-3 border-t border-[var(--rail)]">
              <Button variant="ghost" size="sm" type="button" onClick={() => setShowEdit(false)}>
                Cancel
              </Button>
              <Button variant="primary" size="sm" type="submit" loading={saving}>
                {saving ? 'Saving…' : 'Save changes'}
              </Button>
            </div>
          </div>
        </form>
      </Modal>

      {/* Run detail modal */}
      {selectedRun && (
        <RunDetailModal run={selectedRun} onClose={() => setSelectedRun(null)} />
      )}
    </div>
  );
}

// ── Stat card ────────────────────────────────────────────────────────────────
function StatCard({ label, value, icon: Icon, valueColor }: {
  label: string;
  value: string;
  icon: typeof AlarmClockIcon;
  valueColor?: string;
}) {
  return (
    <Card className="border border-[var(--rail)]" padding="sm">
      <div className="flex items-center gap-2 mb-1">
        <HugeiconsIcon icon={Icon} size={11} className="text-[var(--text-dim)]" />
        <p className="text-[9px] text-[var(--text-dim)] uppercase tracking-wider">{label}</p>
      </div>
      <p className={`text-sm font-medium text-[var(--text)] truncate ${valueColor ?? ''}`}>{value}</p>
    </Card>
  );
}
