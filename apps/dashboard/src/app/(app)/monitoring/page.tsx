'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createFidscript } from '@fidscript/sdk';
import { Card } from '@fidscript/ui';
import { Button } from '@fidscript/ui';
import { Input } from '@fidscript/ui';
import { Modal } from '@fidscript/ui';
import { Spinner } from '@fidscript/ui';
import { EmptyState } from '@fidscript/ui';
import type { Project, AlertRule } from '@/types';

const SEVERITY_COLORS: Record<string, string> = {
  warning: 'bg-amber-500/10 text-amber-400',
  critical: 'bg-red-500/10 text-red-400',
  info: 'bg-blue-500/10 text-blue-400',
};

export default function MonitoringPage() {
  const router = useRouter();
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState('');
  const [rules, setRules] = useState<AlertRule[]>([]);
  const [loadingProjects, setLoadingProjects] = useState(true);
  const [loadingRules, setLoadingRules] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  // Form state
  const [formName, setFormName] = useState('');
  const [formMetric, setFormMetric] = useState('');
  const [formCondition, setFormCondition] = useState('>');
  const [formThreshold, setFormThreshold] = useState('');
  const [formSeverity, setFormSeverity] = useState('warning');
  const [formDuration, setFormDuration] = useState('60');

  const METRICS = [
    'cpu.usage',
    'memory.usage',
    'disk.usage',
    'http.request.duration',
    'http.request.count',
    'http.error.rate',
    'queue.depth',
    'queue consumer lag',
    'db.query.duration',
    'db.connections',
  ];

  useEffect(() => {
    async function loadProjects() {
      const token = localStorage.getItem('fidscript_token');
      if (!token) { setLoadingProjects(false); return; }
      try {
        const sdk = createFidscript({ apiKey: token });
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
  }, []);

  useEffect(() => {
    if (!selectedProjectId) return;
    async function loadRules() {
      setLoadingRules(true);
      setError(null);
      try {
        const token = localStorage.getItem('fidscript_token');
        if (!token) return;
        const sdk = createFidscript({ apiKey: token });
        const data = await sdk.monitoring.listAlertRules(selectedProjectId);
        setRules(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load alert rules');
      } finally {
        setLoadingRules(false);
      }
    }
    loadRules();
  }, [selectedProjectId]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!formName.trim() || !formMetric || !formThreshold || !selectedProjectId) return;
    setCreating(true);
    setCreateError(null);
    try {
      const token = localStorage.getItem('fidscript_token');
      if (!token) return;
      const sdk = createFidscript({ apiKey: token });
      await sdk.monitoring.createAlertRule(selectedProjectId, {
        name: formName.trim(),
        metric: formMetric,
        condition: formCondition,
        threshold: parseFloat(formThreshold),
        severity: formSeverity,
        durationSeconds: parseInt(formDuration, 10),
      });
      const data = await sdk.monitoring.listAlertRules(selectedProjectId);
      setRules(data);
      resetForm();
      setShowCreate(false);
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : 'Failed to create alert rule');
    } finally {
      setCreating(false);
    }
  }

  function resetForm() {
    setFormName('');
    setFormMetric('');
    setFormCondition('>');
    setFormThreshold('');
    setFormSeverity('warning');
    setFormDuration('60');
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
          <h1 className="text-xl font-bold text-slate-200 mb-1">Monitoring</h1>
          <p className="text-sm text-slate-500">
            {rules.length} alert rule{rules.length !== 1 ? 's' : ''}
          </p>
        </div>
        <Button variant="primary" size="sm" onClick={() => setShowCreate(true)}>
          Create Alert
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

      {loadingRules ? (
        <div className="flex items-center justify-center min-h-48">
          <Spinner size="lg" />
        </div>
      ) : rules.length === 0 ? (
        <Card className="border border-[#1e2130]">
          <EmptyState
            title="No alert rules"
            description="Create an alert rule to get notified when metrics cross thresholds."
            action={
              <Button variant="primary" size="sm" onClick={() => setShowCreate(true)}>
                Create Alert
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
                <th className="text-left text-xs text-slate-500 font-medium px-4 py-3">Metric</th>
                <th className="text-left text-xs text-slate-500 font-medium px-4 py-3">Condition</th>
                <th className="text-left text-xs text-slate-500 font-medium px-4 py-3">Severity</th>
                <th className="text-left text-xs text-slate-500 font-medium px-4 py-3">Status</th>
                <th className="text-left text-xs text-slate-500 font-medium px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {rules.map(rule => (
                <tr
                  key={rule.id}
                  className="border-b border-[#1e2130] last:border-0 hover:bg-[#1e2130]/30 cursor-pointer"
                  onClick={() => router.push(`/monitoring/${rule.id}?project=${selectedProjectId}`)}
                >
                  <td className="px-4 py-3">
                    <span className="font-medium text-slate-200">{rule.name}</span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="font-mono text-xs text-slate-400 bg-[#080a0d] px-2 py-0.5 rounded">
                      {rule.metric}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-400 text-xs">
                    {rule.condition} {rule.threshold}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-0.5 rounded ${SEVERITY_COLORS[rule.severity] ?? 'bg-slate-700 text-slate-400'}`}>
                      {rule.severity}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-0.5 rounded ${
                      rule.enabled
                        ? 'bg-emerald-500/10 text-emerald-400'
                        : 'bg-slate-700 text-slate-400'
                    }`}>
                      {rule.enabled ? 'Active' : 'Disabled'}
                    </span>
                  </td>
                  <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => router.push(`/monitoring/${rule.id}?project=${selectedProjectId}`)}
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

      <Modal isOpen={showCreate} onClose={() => { setShowCreate(false); resetForm(); }} title="Create Alert Rule" size="md">
        <form onSubmit={handleCreate} noValidate>
          <div className="space-y-4">
            <div>
              <label className="block text-xs text-slate-400 mb-1">Rule name</label>
              <Input
                value={formName}
                onChange={e => setFormName(e.target.value)}
                placeholder="High CPU usage"
                className="bg-[#080a0d] border border-[#1e2130] text-slate-200 placeholder:text-slate-600 w-full"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">Metric</label>
              <select
                value={formMetric}
                onChange={e => setFormMetric(e.target.value)}
                className="bg-[#080a0d] border border-[#1e2130] text-slate-200 rounded-lg px-3 py-2 text-sm w-full"
              >
                <option value="">Select a metric...</option>
                {METRICS.map(m => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-slate-400 mb-1">Condition</label>
                <select
                  value={formCondition}
                  onChange={e => setFormCondition(e.target.value)}
                  className="bg-[#080a0d] border border-[#1e2130] text-slate-200 rounded-lg px-3 py-2 text-sm w-full"
                >
                  {['>', '>=', '<', '<=', '=='].map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">Threshold</label>
                <Input
                  value={formThreshold}
                  onChange={e => setFormThreshold(e.target.value)}
                  placeholder="80"
                  type="number"
                  step="any"
                  className="bg-[#080a0d] border border-[#1e2130] text-slate-200 placeholder:text-slate-600 w-full"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-slate-400 mb-1">Severity</label>
                <select
                  value={formSeverity}
                  onChange={e => setFormSeverity(e.target.value)}
                  className="bg-[#080a0d] border border-[#1e2130] text-slate-200 rounded-lg px-3 py-2 text-sm w-full"
                >
                  <option value="info">Info</option>
                  <option value="warning">Warning</option>
                  <option value="critical">Critical</option>
                </select>
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">Duration (seconds)</label>
                <Input
                  value={formDuration}
                  onChange={e => setFormDuration(e.target.value)}
                  placeholder="60"
                  type="number"
                  className="bg-[#080a0d] border border-[#1e2130] text-slate-200 placeholder:text-slate-600 w-full"
                />
              </div>
            </div>
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