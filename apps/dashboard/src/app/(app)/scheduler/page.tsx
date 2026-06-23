'use client';

import { useEffect, useState } from 'react';
import { Button, Card, EmptyState, Input, Modal, Spinner } from '@fidscript/ui';
import { useRouter } from 'next/navigation';

import { useAuth } from '@/contexts/auth-context';
import type { Project, CronJob } from '@/types';

function computeNextRun(expression: string): string {
  try {
    // Simple cron expression parser (5-field: min hour dom mon dow)
    // Only handles standard cron, not intervals or special chars
    const parts = expression.trim().split(/\s+/);
    if (parts.length < 5) return '—';
    const [min, hour, dom, mon, dow] = parts;
    const now = new Date();
    const currentYear = now.getFullYear();
    // Very simplified: just show "Based on: <expression>"
    return `Next: ${expression}`;
  } catch {
    return '—';
  }
}

export default function SchedulerPage() {
  const { getSdk } = useAuth();
  const router = useRouter();
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState('');
  const [jobs, setJobs] = useState<CronJob[]>([]);
  const [loadingProjects, setLoadingProjects] = useState(true);
  const [loadingJobs, setLoadingJobs] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  // Form state
  const [formName, setFormName] = useState('');
  const [formExpression, setFormExpression] = useState('');
  const [formTargetType, setFormTargetType] = useState<'endpoint' | 'function'>('endpoint');
  const [formEndpoint, setFormEndpoint] = useState('');
  const [formFunctionId, setFormFunctionId] = useState('');
  const [formMethod, setFormMethod] = useState('POST');
  const [formHeaders, setFormHeaders] = useState('{}');

  useEffect(() => {
    async function loadProjects() {
      try {
        const sdk = getSdk();
        const data = await sdk.projects.list();
        setProjects(data);
        if (data.length > 0) setSelectedProjectId(data[0].id);
      } catch {
        // ignore
      } finally {
        setLoadingProjects(false);
      }
    }
    loadProjects();
  }, [getSdk]);

  useEffect(() => {
    if (!selectedProjectId) return;
    async function loadJobs() {
      setLoadingJobs(true);
      setError(null);
      try {
        const sdk = getSdk();
        const data = await sdk.cron.list(selectedProjectId);
        setJobs(data);
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
      const data = {
        name: formName.trim(),
        cronExpression: formExpression.trim(),
        targetType: formTargetType,
        ...(formTargetType === 'endpoint' ? { endpoint: formEndpoint } : { functionId: formFunctionId }),
      };
      await sdk.cron.create(selectedProjectId, data);
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

  function resetForm() {
    setFormName('');
    setFormExpression('');
    setFormTargetType('endpoint');
    setFormEndpoint('');
    setFormFunctionId('');
    setFormMethod('POST');
    setFormHeaders('{}');
  }

  if (loadingProjects) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-slate-200 mb-1">Scheduler</h1>
          <p className="text-sm text-slate-500">
            {jobs.length} job{jobs.length !== 1 ? 's' : ''}
          </p>
        </div>
        <Button variant="primary" size="sm" onClick={() => setShowCreate(true)}>
          Create Job
        </Button>
      </div>

      <div className="mb-6">
        <label className="block text-xs text-slate-400 mb-1">Project</label>
        <select
          value={selectedProjectId}
          onChange={e => setSelectedProjectId(e.target.value)}
          className="bg-[#080a0d] border border-[#1e2130] text-slate-200 rounded-lg px-3 py-2 text-sm min-w-52"
        >
          {projects.map(p => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </select>
      </div>

      {error && (
        <p className="text-red-400 mb-4 text-sm">{error}</p>
      )}

      {loadingJobs ? (
        <div className="flex items-center justify-center min-h-48">
          <Spinner size="lg" />
        </div>
      ) : jobs.length === 0 ? (
        <Card className="border border-[#1e2130]">
          <EmptyState
            title="No cron jobs"
            description="Schedule recurring tasks with cron expressions."
            action={
              <Button variant="primary" size="sm" onClick={() => setShowCreate(true)}>
                Create Job
              </Button>
            }
          />
        </Card>
      ) : (
        <Card className="border border-[#1e2130] overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#1e2130]">
                <th className="text-left text-xs text-slate-500 font-medium px-4 py-3">Name</th>
                <th className="text-left text-xs text-slate-500 font-medium px-4 py-3">Expression</th>
                <th className="text-left text-xs text-slate-500 font-medium px-4 py-3">Target</th>
                <th className="text-left text-xs text-slate-500 font-medium px-4 py-3">Status</th>
                <th className="text-left text-xs text-slate-500 font-medium px-4 py-3">Last Run</th>
                <th className="text-left text-xs text-slate-500 font-medium px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {jobs.map(job => (
                <tr
                  key={job.id}
                  className="border-b border-[#1e2130] last:border-0 hover:bg-[#1e2130]/30 cursor-pointer"
                  onClick={() => router.push(`/scheduler/${job.id}?project=${selectedProjectId}`)}
                >
                  <td className="px-4 py-3">
                    <span className="font-medium text-slate-200">{job.name}</span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="font-mono text-xs text-slate-400 bg-[#080a0d] px-2 py-0.5 rounded">
                      {job.cronExpression}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-xs text-slate-500">
                      {job.targetType === 'function' ? `fn:${job.functionId}` : job.endpoint}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={e => { e.stopPropagation(); handleToggle(job); }}
                      disabled={togglingId === job.id}
                      className={`text-xs px-2 py-0.5 rounded border transition-colors disabled:opacity-50 ${
                        job.enabled
                          ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20 hover:border-emerald-500/40'
                          : 'bg-slate-700 text-slate-400 border-slate-700 hover:border-slate-600'
                      }`}
                    >
                      {job.enabled ? 'Enabled' : 'Disabled'}
                    </button>
                  </td>
                  <td className="px-4 py-3 text-slate-500 text-xs">
                    {job.lastRunAt ? new Date(job.lastRunAt).toLocaleString() : 'Never'}
                  </td>
                  <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => router.push(`/scheduler/${job.id}?project=${selectedProjectId}`)}
                        className="text-xs text-slate-400 hover:text-slate-200 bg-none border-none cursor-pointer p-0"
                      >
                        View
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}

      <Modal isOpen={showCreate} onClose={() => { setShowCreate(false); resetForm(); }} title="Create Cron Job" size="lg">
        <form onSubmit={handleCreate} noValidate>
          <div className="space-y-4">
            <div>
              <label className="block text-xs text-slate-400 mb-1">Job name</label>
              <Input
                value={formName}
                onChange={e => setFormName(e.target.value)}
                placeholder="daily-backup"
                className="bg-[#080a0d] border border-[#1e2130] text-slate-200 placeholder:text-slate-600 w-full"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">Cron expression</label>
              <Input
                value={formExpression}
                onChange={e => setFormExpression(e.target.value)}
                placeholder="0 0 * * *"
                className="bg-[#080a0d] border border-[#1e2130] text-slate-200 placeholder:text-slate-600 w-full font-mono"
              />
              <p className="text-xs text-slate-600 mt-1">5-field cron: min hour dom mon dow</p>
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">Target type</label>
              <div className="flex gap-4">
                {(['endpoint', 'function'] as const).map(t => (
                  <label key={t} className="flex items-center gap-2 text-sm text-slate-300 cursor-pointer">
                    <input
                      type="radio"
                      name="targetType"
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
              <>
                <div>
                  <label className="block text-xs text-slate-400 mb-1">URL</label>
                  <Input
                    value={formEndpoint}
                    onChange={e => setFormEndpoint(e.target.value)}
                    placeholder="https://api.example.com/webhook"
                    className="bg-[#080a0d] border border-[#1e2130] text-slate-200 placeholder:text-slate-600 w-full"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1">HTTP method</label>
                  <select
                    value={formMethod}
                    onChange={e => setFormMethod(e.target.value)}
                    className="bg-[#080a0d] border border-[#1e2130] text-slate-200 rounded-lg px-3 py-2 text-sm w-full"
                  >
                    {['POST', 'GET', 'PUT', 'PATCH', 'DELETE'].map(m => (
                      <option key={m} value={m}>{m}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Headers (JSON)</label>
                  <Input
                    value={formHeaders}
                    onChange={e => setFormHeaders(e.target.value)}
                    placeholder='{"Authorization": "Bearer ..."}'
                    className="bg-[#080a0d] border border-[#1e2130] text-slate-200 placeholder:text-slate-600 w-full font-mono"
                  />
                </div>
              </>
            ) : (
              <div>
                <label className="block text-xs text-slate-400 mb-1">Function ID</label>
                <Input
                  value={formFunctionId}
                  onChange={e => setFormFunctionId(e.target.value)}
                  placeholder="func_xxxxxxxxxxxx"
                  className="bg-[#080a0d] border border-[#1e2130] text-slate-200 placeholder:text-slate-600 w-full"
                />
              </div>
            )}
            {createError && (
              <p className="text-red-400 text-xs">{createError}</p>
            )}
            <div className="flex justify-end gap-3 pt-2">
              <Button variant="ghost" size="sm" type="button" onClick={() => { setShowCreate(false); resetForm(); }}>
                Cancel
              </Button>
              <Button variant="primary" size="sm" type="submit" loading={creating}>
                {creating ? 'Creating...' : 'Create'}
              </Button>
            </div>
          </div>
        </form>
      </Modal>
    </div>
  );
}
