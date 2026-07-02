'use client';

import { useEffect, useState } from 'react';
import { Button, Card, EmptyState, Input, Modal, Spinner } from '@fidscript/ui';
import { HugeiconsIcon } from '@hugeicons/react';
import { AlarmClockIcon, CheckmarkCircle02Icon, AlertCircleIcon, ArrowRight01Icon } from '@hugeicons/core-free-icons';
import { useRouter } from 'next/navigation';

import { useAuth } from '@/contexts/auth-context';
import { useShellProjectId } from '@/contexts/project-context';
import type { Project, CronJob } from '@/types';

// ── Cron presets for quick selection ─────────────────────────────────────────
const CRON_PRESETS = [
  { label: 'Every minute', value: '* * * * *' },
  { label: 'Every 5 minutes', value: '*/5 * * * *' },
  { label: 'Every hour', value: '0 * * * *' },
  { label: 'Daily at midnight', value: '0 0 * * *' },
  { label: 'Daily at 6am', value: '0 6 * * *' },
  { label: 'Weekly (Sunday)', value: '0 0 * * 0' },
  { label: 'Monthly', value: '0 0 1 * *' },
];

function formatNextRun(ts: string | undefined | null): string {
  if (!ts) return 'Not scheduled';
  try {
    const d = new Date(ts);
    const now = Date.now();
    const diff = d.getTime() - now;
    if (diff < 0) return 'Overdue';
    if (diff < 60_000) return 'Less than a minute';
    if (diff < 3_600_000) return `${Math.floor(diff / 60_000)} min`;
    if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)} hr`;
    return d.toLocaleDateString() + ' ' + d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  } catch { return '—'; }
}

function formatRelative(ts: string | undefined | null): string {
  if (!ts) return 'Never';
  try {
    const diff = Date.now() - new Date(ts).getTime();
    if (diff < 60_000) return 'Just now';
    if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`;
    if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`;
    return `${Math.floor(diff / 86_400_000)}d ago`;
  } catch { return '—'; }
}

// ── Cron helpers ──────────────────────────────────────────────────────────────

const DOW_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function describeCron(expr: string): string {
  const parts = expr.trim().split(/\s+/);
  if (parts.length < 5) return expr;
  const [min, hour, dom, mon, dow] = parts;
  if (expr === '* * * * *') return 'Every minute';
  if (min.startsWith('*/')) return `Every ${min.slice(2)} minutes`;
  if (hour === '*' && dom === '*' && mon === '*' && dow === '*')
    return `Every hour at minute ${min}`;
  if (dom === '*' && mon === '*' && dow === '*')
    return `Daily at ${String(hour).padStart(2,'0')}:${String(min).padStart(2,'0')}`;
  if (dom === '*' && mon === '*')
    return `Weekly on ${DOW_LABELS[parseInt(dow)]} at ${String(hour).padStart(2,'0')}:${String(min).padStart(2,'0')}`;
  if (mon === '*' && dow === '*')
    return `Monthly on day ${dom} at ${String(hour).padStart(2,'0')}:${String(min).padStart(2,'0')}`;
  return expr;
}

function addMinutes(date: Date, mins: number): Date {
  return new Date(date.getTime() + mins * 60_000);
}

function setDateTimeParts(date: Date, hour: number, minute: number): Date {
  const d = new Date(date);
  d.setHours(hour, minute, 0, 0);
  return d;
}

function getNextRuns(expr: string, timezone: string, count: number): Date[] {
  const parts = expr.trim().split(/\s+/);
  if (parts.length < 5) return [];
  const [min, hour, dom, mon, dow] = parts;
  const now = new Date();
  const runs: Date[] = [];
  const minVal = parseInt(min);
  const hourVal = parseInt(hour);
  const domVal = parseInt(dom);
  const monVal = parseInt(mon);
  const dowVal = parseInt(dow);

  // ── every minute ──────────────────────────────────────────────────────────
  if (expr === '* * * * *') {
    let cursor = addMinutes(now, 1);
    while (runs.length < count) { runs.push(new Date(cursor)); cursor = addMinutes(cursor, 1); }
    return runs;
  }

  // ── every N minutes ───────────────────────────────────────────────────────
  if (min.startsWith('*/')) {
    const step = parseInt(min.slice(2));
    let cursor = addMinutes(now, 1);
    while (runs.length < count) { runs.push(new Date(cursor)); cursor = addMinutes(cursor, step); }
    return runs;
  }

  // ── hourly at minute M ─────────────────────────────────────────────────────
  if (hour === '*' && dom === '*' && mon === '*' && dow === '*') {
    let cursor = setDateTimeParts(now, now.getHours(), minVal);
    if (cursor <= now) cursor = addMinutes(cursor, 60);
    while (runs.length < count) {
      runs.push(new Date(cursor));
      cursor = addMinutes(cursor, 60);
    }
    return runs;
  }

  // ── daily at H:M ───────────────────────────────────────────────────────────
  if (dom === '*' && mon === '*' && dow === '*') {
    let cursor = setDateTimeParts(now, hourVal, minVal);
    if (cursor <= now) cursor = addMinutes(cursor, 1440);
    while (runs.length < count) {
      runs.push(new Date(cursor));
      cursor = addMinutes(cursor, 1440);
    }
    return runs;
  }

  // ── weekly on DOW at H:M ───────────────────────────────────────────────────
  if (dom === '*' && mon === '*') {
    let cursor = setDateTimeParts(now, hourVal, minVal);
    while (cursor <= now || cursor.getDay() !== dowVal) cursor = addMinutes(cursor, 1);
    while (runs.length < count) {
      while (cursor.getDay() !== dowVal) cursor = addMinutes(cursor, 1);
      runs.push(new Date(cursor));
      cursor = addMinutes(cursor, 10080); // +7 days
    }
    return runs;
  }

  // ── monthly on DOM at H:M ─────────────────────────────────────────────────
  if (mon === '*' && dow === '*') {
    let cursor = setDateTimeParts(now, hourVal, minVal);
    cursor.setDate(domVal);
    if (cursor <= now) cursor = addMinutes(cursor, 43200);
    while (runs.length < count) {
      while (cursor.getDate() !== domVal) cursor = addMinutes(cursor, 1440);
      runs.push(new Date(cursor));
      cursor = addMinutes(cursor, 43200); // ~30 days
    }
    return runs;
  }

  // Fallback: iterate minute-by-minute (up to 525600 = 1 year)
  let cursor = addMinutes(now, 1);
  while (runs.length < count && cursor.getTime() - now.getTime() < 525600 * 60_000) {
    runs.push(new Date(cursor));
    cursor = addMinutes(cursor, 1);
  }
  return runs;
}

type Freq = 'minute' | 'hourly' | 'daily' | 'weekly' | 'monthly';

interface CronBuilderProps {
  value: string;
  timezone: string;
  onChange: (expr: string) => void;
}

function CronBuilder({ value, timezone, onChange }: CronBuilderProps) {
  const parts = value.trim().split(/\s+/);
  const isStandard = parts.length === 5;

  // Derive builder state from expression
  const [freq, setFreq] = useState<Freq>('daily');
  const [minute, setMinute] = useState(0);
  const [hour, setHour] = useState(0);
  const [dow, setDow] = useState(0);
  const [dom, setDom] = useState(1);

  // Sync state when value changes externally (e.g. preset click)
  useEffect(() => {
    if (!isStandard) return;
    const parse = (s: string) => s === '*' ? null : parseInt(s, 10);
    const [mS, hS, dS, moS, wS] = parts;
    const m = parse(mS), h = parse(hS), d = parse(dS), mo = parse(moS), w = parse(wS);
    if (value === '* * * * *') setFreq('minute');
    else if (m !== null && m % 5 === 0 && h === null && d === null && mo === null && w === null) setFreq('hourly');
    else if (d === null && mo === null && w === null) { setFreq('daily'); if (m !== null) setMinute(m); if (h !== null) setHour(h); }
    else if (d === null && mo === null) { setFreq('weekly'); if (m !== null) setMinute(m); if (h !== null) setHour(h); if (w !== null) setDow(w); }
    else if (mo === null && w === null) { setFreq('monthly'); if (m !== null) setMinute(m); if (h !== null) setHour(h); if (d !== null) setDom(d); }
    else { setFreq('daily'); if (m !== null) setMinute(m); if (h !== null) setHour(h); }
  }, [value, isStandard]);

  const buildExpr = (f: Freq, mi: number, hr: number, dowVal?: number, domVal?: number): string => {
    switch (f) {
      case 'minute': return '* * * * *';
      case 'hourly': return `${mi} * * * *`;
      case 'daily': return `${mi} ${hr} * * *`;
      case 'weekly': return `${mi} ${hr} * * ${dowVal ?? 0}`;
      case 'monthly': return `${mi} ${hr} ${domVal ?? 1} * *`;
    }
  };

  const handleFreqChange = (f: Freq) => {
    setFreq(f);
    onChange(buildExpr(f, minute, hour, dow, dom));
  };

  const handleMinuteChange = (v: number) => { setMinute(v); onChange(buildExpr(freq, v, hour, dow, dom)); };
  const handleHourChange = (v: number) => { setHour(v); onChange(buildExpr(freq, minute, v, dow, dom)); };
  const handleDowChange = (v: number) => { setDow(v); onChange(buildExpr(freq, minute, hour, v, dom)); };
  const handleDomChange = (v: number) => { setDom(v); onChange(buildExpr(freq, minute, hour, dow, v)); };

  const previewRuns = isStandard ? getNextRuns(value, timezone, 3) : [];
  const description = describeCron(value);

  const inputCls = 'bg-[var(--surface-2)] border border-[var(--rail)] text-[var(--text)] rounded px-2 py-1 text-xs w-14 text-center';
  const labelCls = 'text-[10px] text-[var(--text-muted)]';

  return (
    <div className="space-y-3">
      {/* Frequency selector */}
      <div className="flex flex-wrap gap-2">
        {(['minute','hourly','daily','weekly','monthly'] as Freq[]).map(f => (
          <button
            key={f}
            type="button"
            onClick={() => handleFreqChange(f)}
            className={`text-[10px] px-2.5 py-1 rounded border transition-colors ${
              freq === f
                ? 'border-[var(--accent)] text-[var(--accent)] bg-[var(--accent)]/10'
                : 'border-[var(--rail)] text-[var(--text-muted)] hover:border-[var(--accent)]'
            }`}
          >
            {f === 'minute' ? 'Every min' : f === 'hourly' ? 'Hourly' : f === 'daily' ? 'Daily' : f === 'weekly' ? 'Weekly' : 'Monthly'}
          </button>
        ))}
      </div>

      {/* Contextual time/day pickers */}
      {freq !== 'minute' && (
        <div className="flex flex-wrap items-center gap-3">
          {freq === 'hourly' && (
            <span className="flex items-center gap-1">
              <span className={labelCls}>minute</span>
              <input type="number" min={0} max={59} value={minute} onChange={e => handleMinuteChange(parseInt(e.target.value) || 0)}
                className={inputCls} />
            </span>
          )}
          {(freq === 'daily' || freq === 'weekly' || freq === 'monthly') && (
            <>
              <span className="flex items-center gap-1">
                <span className={labelCls}>hour</span>
                <input type="number" min={0} max={23} value={hour} onChange={e => handleHourChange(parseInt(e.target.value) || 0)}
                  className={inputCls} />
              </span>
              <span className="flex items-center gap-1">
                <span className={labelCls}>min</span>
                <input type="number" min={0} max={59} value={minute} onChange={e => handleMinuteChange(parseInt(e.target.value) || 0)}
                  className={inputCls} />
              </span>
            </>
          )}
          {freq === 'weekly' && (
            <span className="flex items-center gap-1">
              <span className={labelCls}>day</span>
              <select value={dow} onChange={e => handleDowChange(parseInt(e.target.value))}
                className="bg-[var(--surface-2)] border border-[var(--rail)] text-[var(--text)] rounded px-1.5 py-1 text-xs">
                {DOW_LABELS.map((l, i) => <option key={i} value={i}>{l}</option>)}
              </select>
            </span>
          )}
          {freq === 'monthly' && (
            <span className="flex items-center gap-1">
              <span className={labelCls}>day of month</span>
              <input type="number" min={1} max={31} value={dom} onChange={e => handleDomChange(parseInt(e.target.value) || 1)}
                className={inputCls} />
            </span>
          )}
        </div>
      )}

      {/* Generated expression display */}
      <div className="rounded border border-[var(--rail)] bg-[var(--surface-2)] px-3 py-2 font-mono text-xs text-[var(--text)]">
        <span className="text-[var(--text-muted)]">{description}</span>
        <span className="ml-3 text-[var(--accent)]">{value || '—'}</span>
      </div>

      {/* Next-run preview */}
      {previewRuns.length > 0 && (
        <div className="flex flex-col gap-1">
          <span className="text-[10px] text-[var(--text-muted)] font-medium">Next runs</span>
          {previewRuns.map((r, i) => (
            <span key={i} className="text-[10px] text-[var(--text-dim)] font-mono">
              {r.toLocaleDateString()} {r.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

export default function SchedulerPage() {
  const { getSdk } = useAuth();
  const router = useRouter();
  const shellProjectId = useShellProjectId();
  const [projects, setProjects] = useState<Project[]>([]);
  const [pickedProjectId, setPickedProjectId] = useState('');
  const selectedProjectId = shellProjectId ?? pickedProjectId;
  const [jobs, setJobs] = useState<CronJob[]>([]);
  const [jobStats, setJobStats] = useState<Record<string, {
    total: number; completed: number; failed: number;
    successRate: number | null; avgDurationMs: number | null;
    sparkline: { status: string; durationMs: number | null }[];
  }>>({});
  const [loadingProjects, setLoadingProjects] = useState(!shellProjectId);
  const [loadingJobs, setLoadingJobs] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);

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

  useEffect(() => {
    if (shellProjectId) return;
    async function loadProjects() {
      try {
        const sdk = getSdk();
        const data = await sdk.projects.list();
        setProjects(data.projects ?? []);
        if ((data.projects ?? []).length > 0) setPickedProjectId((data.projects ?? [])[0].id);
      } catch { /* ignore */ }
      finally { setLoadingProjects(false); }
    }
    loadProjects();
  }, [getSdk, shellProjectId]);

  useEffect(() => {
    if (!selectedProjectId) return;
    async function loadJobs() {
      setLoadingJobs(true);
      setError(null);
      try {
        const sdk = getSdk();
        const data = await sdk.cron.list(selectedProjectId);
        setJobs(data);
        // Fetch stats for all jobs in parallel
        const statsResults = await Promise.all(
          data.map(j => sdk.cron.stats(selectedProjectId, j.id).catch(() => null)),
        );
        const statsMap: typeof jobStats = {};
        data.forEach((j, i) => { if (statsResults[i]) statsMap[j.id] = statsResults[i]; });
        setJobStats(statsMap);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load cron jobs');
      } finally {
        setLoadingJobs(false);
      }
    }
    loadJobs();
  }, [selectedProjectId, getSdk]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!formName.trim() || !formExpression.trim() || !selectedProjectId) return;
    setCreating(true);
    setCreateError(null);
    try {
      const sdk = getSdk();
      let parsedPayload: Record<string, unknown> = {};
      try { parsedPayload = JSON.parse(formPayload); } catch { /* ignore */ }
      const createData: {
        name: string;
        cronExpression: string;
        timezone: string;
        payload: Record<string, unknown>;
        retryAttempts: number;
        retryDelaySeconds: number;
        timeoutSeconds: number;
        endpoint?: string;
        functionId?: string;
      } = {
        name: formName.trim(),
        cronExpression: formExpression.trim(),
        timezone: formTimezone,
        payload: parsedPayload,
        retryAttempts: formRetryAttempts,
        retryDelaySeconds: formRetryDelay,
        timeoutSeconds: formTimeout,
      };
      if (formTargetType === 'endpoint') {
        createData.endpoint = formEndpoint;
      } else {
        createData.functionId = formFunctionId;
      }
      await sdk.cron.create(selectedProjectId, createData);
      const updated = await sdk.cron.list(selectedProjectId);
      setJobs(updated);
      resetForm();
      setShowCreate(false);
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : 'Failed to create job');
    } finally {
      setCreating(false);
    }
  }

  async function handleToggle(job: CronJob) {
    if (!selectedProjectId) return;
    setTogglingId(job.id);
    try {
      const sdk = getSdk();
      await sdk.cron.update(selectedProjectId, job.id, { enabled: !job.enabled });
      setJobs(prev => prev.map(j => j.id === job.id ? { ...j, enabled: !j.enabled } : j));
    } finally {
      setTogglingId(null);
    }
  }

  async function handleTrigger(job: CronJob) {
    if (!selectedProjectId) return;
    try {
      const sdk = getSdk();
      await sdk.cron.trigger(selectedProjectId, job.id);
    } catch { /* fire and forget */ }
  }

  function resetForm() {
    setFormName('');
    setFormExpression('');
    setFormTimezone('UTC');
    setFormTargetType('endpoint');
    setFormEndpoint('');
    setFormFunctionId('');
    setFormPayload('{}');
    setFormRetryAttempts(3);
    setFormRetryDelay(60);
    setFormTimeout(300);
  }

  if (loadingProjects) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto">
      {/* Page header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-xl font-bold text-[var(--text)] mb-1">Scheduler</h1>
          <p className="text-sm text-[var(--text-muted)]">
            {loadingJobs ? 'Loading…' : `${jobs.length} cron job${jobs.length !== 1 ? 's' : ''}`}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {!shellProjectId && projects.length > 0 && (
            <select
              value={pickedProjectId}
              onChange={e => setPickedProjectId(e.target.value)}
              className="bg-[var(--surface-2)] border border-[var(--rail)] text-[var(--text)] rounded-lg px-3 py-2 text-sm"
            >
              {projects.map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          )}
          <Button variant="primary" size="sm" onClick={() => setShowCreate(true)}>
            New Job
          </Button>
        </div>
      </div>

      {error && (
        <div className="bg-[var(--danger)]/10 border border-[var(--danger)]/30 rounded-lg px-4 py-3 mb-6 text-sm text-[var(--danger)]">
          {error}
        </div>
      )}

      {loadingJobs ? (
        <div className="flex items-center justify-center min-h-48">
          <Spinner size="lg" />
        </div>
      ) : jobs.length === 0 ? (
        <Card className="border border-[var(--rail)]">
          <EmptyState
            icon={<HugeiconsIcon icon={AlarmClockIcon} size={48} className="text-[var(--text-dim)]" />}
            title="No cron jobs yet"
            description="Schedule recurring tasks with cron expressions. Trigger HTTP endpoints or invoke functions on a schedule."
            action={
              <Button variant="primary" size="sm" onClick={() => setShowCreate(true)}>
                Create your first job
              </Button>
            }
          />
        </Card>
      ) : (
        /* Job cards — responsive grid */
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {jobs.map(job => (
            <JobCard
              key={job.id}
              job={job}
              projectId={selectedProjectId}
              onToggle={() => handleToggle(job)}
              onTrigger={() => handleTrigger(job)}
              onView={() => router.push(`/projects/${selectedProjectId}/scheduler/${job.id}`)}
              toggling={togglingId === job.id}
              stats={jobStats[job.id]}
            />
          ))}
        </div>
      )}

      {/* Create Modal */}
      <Modal
        isOpen={showCreate}
        onClose={() => { setShowCreate(false); resetForm(); }}
        title="Create Cron Job"
        size="lg"
      >
        <form onSubmit={handleCreate} noValidate>
          <div className="space-y-5">
            {/* Name */}
            <div>
              <label className="block text-xs text-[var(--text-muted)] mb-1.5 font-medium">Job name</label>
              <Input
                value={formName}
                onChange={e => setFormName(e.target.value)}
                placeholder="e.g. daily-backup"
                className="bg-[var(--surface-2)] border border-[var(--rail)] text-[var(--text)] w-full"
              />
            </div>

            {/* Schedule — visual cron builder */}
            <div>
              <label className="block text-xs text-[var(--text-muted)] mb-1.5 font-medium">Schedule</label>
              <CronBuilder
                value={formExpression}
                timezone={formTimezone}
                onChange={setFormExpression}
              />
              {/* Manual presets row — still available as shortcuts */}
              <div className="flex flex-wrap gap-1.5 mt-3">
                {CRON_PRESETS.map(p => (
                  <button
                    key={p.value}
                    type="button"
                    onClick={() => setFormExpression(p.value)}
                    className="text-[10px] px-2 py-0.5 rounded border border-[var(--rail)] text-[var(--text-muted)] hover:border-[var(--accent)] hover:text-[var(--accent)] transition-colors"
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Timezone */}
            <div>
              <label className="block text-xs text-[var(--text-muted)] mb-1.5 font-medium">Timezone</label>
              <select
                value={formTimezone}
                onChange={e => setFormTimezone(e.target.value)}
                className="bg-[var(--surface-2)] border border-[var(--rail)] text-[var(--text)] rounded-lg px-3 py-2 text-sm w-full"
              >
                {['UTC', 'America/New_York', 'America/Chicago', 'America/Denver', 'America/Los_Angeles', 'Europe/London', 'Europe/Paris', 'Asia/Tokyo', 'Asia/Singapore', 'Australia/Sydney'].map(tz => (
                  <option key={tz} value={tz}>{tz}</option>
                ))}
              </select>
            </div>

            {/* Target type */}
            <div>
              <label className="block text-xs text-[var(--text-muted)] mb-1.5 font-medium">Target</label>
              <div className="flex gap-4">
                {(['endpoint', 'function'] as const).map(t => (
                  <label key={t} className="flex items-center gap-2 text-sm text-[var(--text-muted)] cursor-pointer">
                    <input
                      type="radio"
                      name="targetType"
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
                  placeholder="https://api.example.com/webhook"
                  className="bg-[var(--surface-2)] border border-[var(--rail)] text-[var(--text)] w-full text-sm"
                />
              </div>
            ) : (
              <div>
                <label className="block text-xs text-[var(--text-muted)] mb-1.5 font-medium">Function ID</label>
                <Input
                  value={formFunctionId}
                  onChange={e => setFormFunctionId(e.target.value)}
                  placeholder="func_xxxxxxxxxxxx"
                  className="bg-[var(--surface-2)] border border-[var(--rail)] text-[var(--text)] w-full"
                />
              </div>
            )}

            {/* Payload */}
            <div>
              <label className="block text-xs text-[var(--text-muted)] mb-1.5 font-medium">Payload (JSON, optional)</label>
              <textarea
                value={formPayload}
                onChange={e => setFormPayload(e.target.value)}
                placeholder="{}"
                rows={2}
                className="bg-[var(--surface-2)] border border-[var(--rail)] text-[var(--text)] w-full font-mono text-xs resize-none rounded-lg px-3 py-2 focus:outline-none focus:border-[var(--accent)]"
              />
            </div>

            {/* Retry config */}
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

            {createError && (
              <p className="text-sm text-[var(--danger)]">{createError}</p>
            )}

            <div className="flex justify-end gap-3 pt-3 border-t border-[var(--rail)]">
              <Button variant="ghost" size="sm" type="button" onClick={() => { setShowCreate(false); resetForm(); }}>
                Cancel
              </Button>
              <Button variant="primary" size="sm" type="submit" loading={creating} disabled={!formName.trim() || !formExpression.trim()}>
                {creating ? 'Creating…' : 'Create job'}
              </Button>
            </div>
          </div>
        </form>
      </Modal>
    </div>
  );
}

// ── Job card ──────────────────────────────────────────────────────────────────
interface JobCardProps {
  job: CronJob;
  projectId: string;
  onToggle: () => void;
  onTrigger: () => void;
  onView: () => void;
  toggling: boolean;
  stats?: {
    total: number; completed: number; failed: number;
    successRate: number | null; avgDurationMs: number | null;
    sparkline: { status: string; durationMs: number | null }[];
  };
}

function Sparkline({ sparkline }: { sparkline: { status: string; durationMs: number | null }[] }) {
  if (sparkline.length === 0) return null;
  const maxMs = Math.max(...sparkline.filter(s => s.durationMs != null).map(s => s.durationMs as number), 1);
  return (
    <div className="flex items-end gap-px h-4">
      {sparkline.map((s, i) => {
        const barH = s.durationMs != null
          ? Math.max(2, Math.round((s.durationMs / maxMs) * 14))
          : 4;
        const dotColor = s.status === 'completed' ? 'bg-[var(--success)]'
          : s.status === 'failed' ? 'bg-[var(--danger)]'
          : 'bg-[var(--text-dim)]';
        return (
          <div
            key={i}
            className={`flex-1 rounded-sm ${dotColor}`}
            style={{ height: `${barH}px` }}
          />
        );
      })}
    </div>
  );
}

function JobCard({ job, onToggle, onTrigger, onView, toggling, stats }: JobCardProps) {
  return (
    <div className="group rounded-xl border border-[var(--rail)] bg-[var(--surface-2)] hover:border-[var(--accent)]/40 transition-all duration-150 overflow-hidden">
      {/* Card body */}
      <button
        onClick={onView}
        className="w-full text-left p-4 pb-3"
      >
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 mb-0.5">
              <h3 className="text-sm font-semibold text-[var(--text)] truncate">{job.name}</h3>
            </div>
            <p className="font-mono text-[10px] text-[var(--text-dim)] bg-[var(--rail)] px-1.5 py-0.5 rounded w-fit">
              {job.cronExpression}
            </p>
          </div>
          <span className={`flex-shrink-0 text-[10px] px-2 py-0.5 rounded-full border font-medium ${
            job.enabled
              ? 'bg-[var(--success)]/10 text-[var(--success)] border-[var(--success)]/20'
              : 'bg-[var(--rail)] text-[var(--text-muted)] border-[var(--rail-light)]'
          }`}>
            {job.enabled ? 'Active' : 'Paused'}
          </span>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-3 gap-2 mb-3">
          <div className="bg-[var(--rail)]/50 rounded-lg px-2 py-1.5">
            <p className="text-[9px] text-[var(--text-dim)] uppercase tracking-wider mb-0.5">Next run</p>
            <p className="text-xs text-[var(--text-muted)] truncate">
              {formatNextRun(job.nextRunAt)}
            </p>
          </div>
          <div className="bg-[var(--rail)]/50 rounded-lg px-2 py-1.5">
            <p className="text-[9px] text-[var(--text-dim)] uppercase tracking-wider mb-0.5">Last run</p>
            <p className="text-xs text-[var(--text-muted)]">
              {formatRelative(job.lastRunAt)}
            </p>
          </div>
          <div className="bg-[var(--rail)]/50 rounded-lg px-2 py-1.5">
            <p className="text-[9px] text-[var(--text-dim)] uppercase tracking-wider mb-0.5">Success</p>
            <p className={`text-xs font-medium ${
              stats?.successRate == null ? 'text-content-dim'
              : stats.successRate >= 80 ? 'text-success'
              : stats.successRate >= 50 ? 'text-warning'
              : 'text-danger'
            }`}>
              {stats?.successRate != null ? `${stats.successRate}%` : '—'}
            </p>
          </div>
        </div>

        {/* Sparkline + target */}
        <div className="flex items-center gap-3 mb-2">
          {stats && stats.sparkline.length > 0 && (
            <Sparkline sparkline={stats.sparkline} />
          )}
          <div className="flex items-center gap-1.5">
            <HugeiconsIcon
              icon={job.targetType === 'function' ? ArrowRight01Icon : AlertCircleIcon}
              size={11}
              className="text-[var(--text-dim)] flex-shrink-0"
            />
            <p className="text-[10px] text-[var(--text-dim)] truncate font-mono">
              {job.targetType === 'function'
                ? `fn:${job.functionId}`
                : (job.endpoint ?? '—')}
            </p>
          </div>
        </div>

        {/* Retry info */}
        <div className="flex items-center gap-3">
          <span className="text-[9px] text-[var(--text-dim)]">
            {job.retryAttempts}× retry · {job.retryDelaySeconds}s delay · {job.timeoutSeconds}s timeout
          </span>
        </div>
      </button>

      {/* Card footer — actions */}
      <div className="flex items-center border-t border-[var(--rail)] px-3 py-2 gap-1">
        <button
          onClick={e => { e.stopPropagation(); onTrigger(); }}
          className="flex-1 text-[10px] text-[var(--text-muted)] hover:text-[var(--accent)] py-1 text-center transition-colors"
          title="Run now"
        >
          Run now
        </button>
        <div className="w-px h-3 bg-[var(--rail)]" />
        <button
          onClick={e => { e.stopPropagation(); onToggle(); }}
          disabled={toggling}
          className={`flex-1 text-[10px] py-1 text-center transition-colors disabled:opacity-50 ${
            job.enabled
              ? 'text-[var(--warning)] hover:text-[var(--warning)]/80'
              : 'text-[var(--success)] hover:text-[var(--success)]/80'
          }`}
        >
          {toggling ? '…' : job.enabled ? 'Pause' : 'Enable'}
        </button>
        <div className="w-px h-3 bg-[var(--rail)]" />
        <button
          onClick={e => { e.stopPropagation(); onView(); }}
          className="flex-1 text-[10px] text-[var(--text-muted)] hover:text-[var(--accent)] py-1 text-center transition-colors"
        >
          Details →
        </button>
      </div>
    </div>
  );
}
