'use client';

import { useEffect, useState } from 'react';
import { Button, Card, EmptyState, Input, Modal, Spinner } from '@fidscript/ui';
import { useParams, useSearchParams } from 'next/navigation';

import { useAuth } from '@/contexts/auth-context';
import type { CronJob, CronJobRun } from '@/types';

export default function JobDetailPage() {
  const { getSdk } = useAuth();
  const params = useParams();
  const searchParams = useSearchParams();
  const jobId = params.id as string;
  const projectId = searchParams.get('project') ?? '';

  const [job, setJob] = useState<CronJob | null>(null);
  const [runs, setRuns] = useState<CronJobRun[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [running, setRunning] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Form state
  const [formName, setFormName] = useState('');
  const [formExpression, setFormExpression] = useState('');
  const [formTargetType, setFormTargetType] = useState<'endpoint' | 'function'>('endpoint');
  const [formEndpoint, setFormEndpoint] = useState('');
  const [formFunctionId, setFormFunctionId] = useState('');

  useEffect(() => {
    if (!projectId || !jobId) return;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const sdk = getSdk();
        const [jobData, runsData] = await Promise.all([
          sdk.cron.get(projectId, jobId),
          sdk.cron.getRuns(projectId, jobId),
        ]);
        setJob(jobData);
        setRuns(runsData);
        populateForm(jobData);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load job');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [projectId, jobId, getSdk]);

  function populateForm(j: CronJob) {
    setFormName(j.name);
    setFormExpression(j.cronExpression);
    setFormTargetType((j.targetType as 'endpoint' | 'function') ?? 'endpoint');
    setFormEndpoint(j.endpoint ?? '');
    setFormFunctionId(j.functionId ?? '');
  }

  async function handleRunNow() {
    if (!projectId || !jobId) return;
    setRunning(true);
    try {
      const sdk = getSdk();
      await sdk.cron.trigger(projectId, jobId);
      const runsData = await sdk.cron.getRuns(projectId, jobId);
      setRuns(runsData);
    } finally {
      setRunning(false);
    }
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!projectId || !jobId || !formName.trim() || !formExpression.trim()) return;
    setSaving(true);
    setSaveError(null);
    try {
      const sdk = getSdk();
      const data: Parameters<typeof sdk.cron.update>[2] = {
        name: formName.trim(),
        cronExpression: formExpression.trim(),
        targetType: formTargetType,
        ...(formTargetType === 'endpoint' ? { endpoint: formEndpoint } : { functionId: formFunctionId }),
      };
      const updated = await sdk.cron.update(projectId, jobId, data);
      setJob(updated);
      setShowEdit(false);
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
        <Button variant="ghost" size="sm" onClick={() => history.back()}>
          Go back
        </Button>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h1 className="text-xl font-bold text-[var(--text)]">{job.name}</h1>
            <span className={`text-xs px-2 py-0.5 rounded ${
              job.enabled
                ? 'bg-[var(--success)]/10 text-[var(--success)]'
                : 'bg-[var(--rail)] text-[var(--text-muted)]'
            }`}>
              {job.enabled ? 'Enabled' : 'Disabled'}
            </span>
          </div>
          <p className="text-sm text-[var(--text-muted)] font-mono">{job.cronExpression}</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="secondary" size="sm" onClick={() => { populateForm(job!); setShowEdit(true); }}>
            Edit
          </Button>
          <Button variant="primary" size="sm" onClick={handleRunNow} loading={running}>
            Run Now
          </Button>
        </div>
      </div>

      {/* Job config */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Card className="border border-[var(--rail)]" padding="md">
          <p className="text-xs text-[var(--text-muted)] mb-1">Expression</p>
          <p className="text-sm font-mono text-[var(--text)]">{job.cronExpression}</p>
        </Card>
        <Card className="border border-[var(--rail)]" padding="md">
          <p className="text-xs text-[var(--text-muted)] mb-1">Target</p>
          <p className="text-sm text-[var(--text)]">
            {job.targetType === 'function' ? `Function: ${job.functionId}` : job.endpoint ?? '—'}
          </p>
        </Card>
        <Card className="border border-[var(--rail)]" padding="md">
          <p className="text-xs text-[var(--text-muted)] mb-1">Last Run</p>
          <p className="text-sm text-[var(--text)]">
            {job.lastRunAt ? new Date(job.lastRunAt).toLocaleString() : 'Never'}
          </p>
        </Card>
      </div>

      {/* Execution history */}
      <h2 className="text-sm font-semibold text-[var(--text)] mb-3">Execution History</h2>
      {runs.length === 0 ? (
        <Card className="border border-[var(--rail)]">
          <EmptyState
            title="No runs yet"
            description="Trigger the job manually or wait for the next scheduled run."
          />
        </Card>
      ) : (
        <Card className="border border-[var(--rail)] overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--rail)]">
                <th className="text-left text-xs text-[var(--text-muted)] font-medium px-4 py-3">Run ID</th>
                <th className="text-left text-xs text-[var(--text-muted)] font-medium px-4 py-3">Triggered</th>
                <th className="text-left text-xs text-[var(--text-muted)] font-medium px-4 py-3">Status</th>
                <th className="text-left text-xs text-[var(--text-muted)] font-medium px-4 py-3">Duration</th>
                <th className="text-left text-xs text-[var(--text-muted)] font-medium px-4 py-3">Error</th>
              </tr>
            </thead>
            <tbody>
              {runs.map(run => {
                const duration = run.completedAt && run.startedAt
                  ? `${Math.round((new Date(run.completedAt).getTime() - new Date(run.startedAt).getTime()) / 1000)}s`
                  : '—';
                return (
                  <tr key={run.id} className="border-b border-[var(--rail)] last:border-0 hover:bg-[var(--rail)]/30">
                    <td className="px-4 py-3">
                      <span className="font-mono text-xs text-[var(--text-muted)]">{run.id.slice(0, 12)}…</span>
                    </td>
                    <td className="px-4 py-3 text-[var(--text-muted)] text-xs">
                      {new Date(run.startedAt).toLocaleString()}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-0.5 rounded ${
                        run.status === 'completed'
                          ? 'bg-[var(--success)]/10 text-[var(--success)]'
                          : run.status === 'failed'
                            ? 'bg-[var(--danger)]/10 text-[var(--danger)]'
                            : 'bg-[var(--accent)]/10 text-[var(--accent)]'
                      }`}>
                        {run.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-[var(--text-muted)] text-xs">{duration}</td>
                    <td className="px-4 py-3 text-xs text-[var(--danger)] max-w-xs truncate">
                      {run.errorMessage ?? '—'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </Card>
      )}

      <Modal isOpen={showEdit} onClose={() => setShowEdit(false)} title="Edit Cron Job" size="lg">
        <form onSubmit={handleSave} noValidate>
          <div className="space-y-4">
            <div>
              <label className="block text-xs text-[var(--text-muted)] mb-1">Job name</label>
              <Input
                value={formName}
                onChange={e => setFormName(e.target.value)}
                className="bg-[var(--surface-2)] border border-[var(--rail)] text-[var(--text)] w-full"
              />
            </div>
            <div>
              <label className="block text-xs text-[var(--text-muted)] mb-1">Cron expression</label>
              <Input
                value={formExpression}
                onChange={e => setFormExpression(e.target.value)}
                className="bg-[var(--surface-2)] border border-[var(--rail)] text-[var(--text)] w-full font-mono"
              />
            </div>
            <div>
              <label className="block text-xs text-[var(--text-muted)] mb-1">Target type</label>
              <div className="flex gap-4">
                {(['endpoint', 'function'] as const).map(t => (
                  <label key={t} className="flex items-center gap-2 text-sm text-[var(--text-muted)] cursor-pointer">
                    <input
                      type="radio"
                      name="editTargetType"
                      value={t}
                      checked={formTargetType === t}
                      onChange={() => setFormTargetType(t)}
                      className="accent-[var(--danger)]"
                    />
                    {t.charAt(0).toUpperCase() + t.slice(1)}
                  </label>
                ))}
              </div>
            </div>
            {formTargetType === 'endpoint' ? (
              <div>
                <label className="block text-xs text-[var(--text-muted)] mb-1">URL</label>
                <Input
                  value={formEndpoint}
                  onChange={e => setFormEndpoint(e.target.value)}
                  className="bg-[var(--surface-2)] border border-[var(--rail)] text-[var(--text)] w-full"
                />
              </div>
            ) : (
              <div>
                <label className="block text-xs text-[var(--text-muted)] mb-1">Function ID</label>
                <Input
                  value={formFunctionId}
                  onChange={e => setFormFunctionId(e.target.value)}
                  className="bg-[var(--surface-2)] border border-[var(--rail)] text-[var(--text)] w-full"
                />
              </div>
            )}
            {saveError && (
              <p className="text-[var(--danger)] text-xs">{saveError}</p>
            )}
            <div className="flex justify-end gap-3 pt-2">
              <Button variant="ghost" size="sm" type="button" onClick={() => setShowEdit(false)}>
                Cancel
              </Button>
              <Button variant="primary" size="sm" type="submit" loading={saving}>
                {saving ? 'Saving...' : 'Save'}
              </Button>
            </div>
          </div>
        </form>
      </Modal>
    </div>
  );
}
