'use client';

import { useEffect, useState } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import { createFidscript } from '@fidscript/sdk';
import { Card } from '@fidscript/ui';
import { Button } from '@fidscript/ui';
import { Input } from '@fidscript/ui';
import { Modal } from '@fidscript/ui';
import { Spinner } from '@fidscript/ui';
import { EmptyState } from '@fidscript/ui';
import type { CronJob, CronJobRun } from '@/types';

export default function JobDetailPage() {
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
        const token = localStorage.getItem('fidscript_token');
        if (!token) return;
        const sdk = createFidscript({ apiKey: token });
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
  }, [projectId, jobId]);

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
      const token = localStorage.getItem('fidscript_token');
      if (!token) return;
      const sdk = createFidscript({ apiKey: token });
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
      const token = localStorage.getItem('fidscript_token');
      if (!token) return;
      const sdk = createFidscript({ apiKey: token });
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
        <p className="text-red-400 text-sm">{error ?? 'Job not found'}</p>
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
            <h1 className="text-xl font-bold text-slate-200">{job.name}</h1>
            <span className={`text-xs px-2 py-0.5 rounded ${
              job.enabled
                ? 'bg-emerald-500/10 text-emerald-400'
                : 'bg-slate-700 text-slate-400'
            }`}>
              {job.enabled ? 'Enabled' : 'Disabled'}
            </span>
          </div>
          <p className="text-sm text-slate-500 font-mono">{job.cronExpression}</p>
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
        <Card className="border border-[#1e2130]" padding="md">
          <p className="text-xs text-slate-500 mb-1">Expression</p>
          <p className="text-sm font-mono text-slate-200">{job.cronExpression}</p>
        </Card>
        <Card className="border border-[#1e2130]" padding="md">
          <p className="text-xs text-slate-500 mb-1">Target</p>
          <p className="text-sm text-slate-200">
            {job.targetType === 'function' ? `Function: ${job.functionId}` : job.endpoint ?? '—'}
          </p>
        </Card>
        <Card className="border border-[#1e2130]" padding="md">
          <p className="text-xs text-slate-500 mb-1">Last Run</p>
          <p className="text-sm text-slate-200">
            {job.lastRunAt ? new Date(job.lastRunAt).toLocaleString() : 'Never'}
          </p>
        </Card>
      </div>

      {/* Execution history */}
      <h2 className="text-sm font-semibold text-slate-200 mb-3">Execution History</h2>
      {runs.length === 0 ? (
        <Card className="border border-[#1e2130]">
          <EmptyState
            title="No runs yet"
            description="Trigger the job manually or wait for the next scheduled run."
          />
        </Card>
      ) : (
        <Card className="border border-[#1e2130] overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#1e2130]">
                <th className="text-left text-xs text-slate-500 font-medium px-4 py-3">Run ID</th>
                <th className="text-left text-xs text-slate-500 font-medium px-4 py-3">Triggered</th>
                <th className="text-left text-xs text-slate-500 font-medium px-4 py-3">Status</th>
                <th className="text-left text-xs text-slate-500 font-medium px-4 py-3">Duration</th>
                <th className="text-left text-xs text-slate-500 font-medium px-4 py-3">Error</th>
              </tr>
            </thead>
            <tbody>
              {runs.map(run => {
                const duration = run.completedAt && run.startedAt
                  ? `${Math.round((new Date(run.completedAt).getTime() - new Date(run.startedAt).getTime()) / 1000)}s`
                  : '—';
                return (
                  <tr key={run.id} className="border-b border-[#1e2130] last:border-0 hover:bg-[#1e2130]/30">
                    <td className="px-4 py-3">
                      <span className="font-mono text-xs text-slate-400">{run.id.slice(0, 12)}…</span>
                    </td>
                    <td className="px-4 py-3 text-slate-400 text-xs">
                      {new Date(run.startedAt).toLocaleString()}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-0.5 rounded ${
                        run.status === 'completed'
                          ? 'bg-emerald-500/10 text-emerald-400'
                          : run.status === 'failed'
                            ? 'bg-red-500/10 text-red-400'
                            : 'bg-blue-500/10 text-blue-400'
                      }`}>
                        {run.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-400 text-xs">{duration}</td>
                    <td className="px-4 py-3 text-xs text-red-400 max-w-xs truncate">
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
              <label className="block text-xs text-slate-400 mb-1">Job name</label>
              <Input
                value={formName}
                onChange={e => setFormName(e.target.value)}
                className="bg-[#080a0d] border border-[#1e2130] text-slate-200 w-full"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">Cron expression</label>
              <Input
                value={formExpression}
                onChange={e => setFormExpression(e.target.value)}
                className="bg-[#080a0d] border border-[#1e2130] text-slate-200 w-full font-mono"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">Target type</label>
              <div className="flex gap-4">
                {(['endpoint', 'function'] as const).map(t => (
                  <label key={t} className="flex items-center gap-2 text-sm text-slate-300 cursor-pointer">
                    <input
                      type="radio"
                      name="editTargetType"
                      value={t}
                      checked={formTargetType === t}
                      onChange={() => setFormTargetType(t)}
                      className="accent-red-500"
                    />
                    {t.charAt(0).toUpperCase() + t.slice(1)}
                  </label>
                ))}
              </div>
            </div>
            {formTargetType === 'endpoint' ? (
              <div>
                <label className="block text-xs text-slate-400 mb-1">URL</label>
                <Input
                  value={formEndpoint}
                  onChange={e => setFormEndpoint(e.target.value)}
                  className="bg-[#080a0d] border border-[#1e2130] text-slate-200 w-full"
                />
              </div>
            ) : (
              <div>
                <label className="block text-xs text-slate-400 mb-1">Function ID</label>
                <Input
                  value={formFunctionId}
                  onChange={e => setFormFunctionId(e.target.value)}
                  className="bg-[#080a0d] border border-[#1e2130] text-slate-200 w-full"
                />
              </div>
            )}
            {saveError && (
              <p className="text-red-400 text-xs">{saveError}</p>
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