'use client';

import { useEffect, useState, useCallback } from 'react';
import { Card, Button, Input, Spinner } from '@fidscript/ui';

import { useAuth } from '@/contexts/auth-context';
import { useToast } from '@/components/toast-provider';
import type { Project } from '@/types';

interface BuildConfig {
  strategy?: string;
  buildCommand?: string;
  outputDirectory?: string;
  healthCheckPath?: string;
  healthCheckPort?: number;
  startupTimeoutSeconds?: number;
}

export function BuildTab({ project }: { project: Project }) {
  const { getSdk } = useAuth();
  const { showToast } = useToast();
  const [config, setConfig] = useState<BuildConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      const cfg = await getSdk().deployments.getBuildConfig(project.id);
      setConfig(cfg);
    } catch {
      showToast({ type: 'error', message: 'Failed to load build config' });
    } finally {
      setLoading(false);
    }
  }, [project.id, getSdk, showToast]);

  useEffect(() => { load(); }, [load]);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!config) return;
    setSaving(true);
    try {
      const updated = await getSdk().deployments.updateBuildConfig(project.id, config);
      setConfig(updated);
      showToast({ type: 'success', message: 'Build config saved.' });
    } catch (err) {
      showToast({ type: 'error', message: err instanceof Error ? err.message : 'Failed to save' });
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <div className="flex justify-center py-8"><Spinner /></div>;

  return (
    <Card className="border border-[var(--rail)] p-5">
      <form onSubmit={handleSave} className="space-y-4">
        <h2 className="text-sm font-semibold text-[var(--text)]">Build Configuration</h2>
        <div>
          <label className="block text-xs font-medium text-[var(--text-muted)] mb-1.5 uppercase tracking-wider">Strategy</label>
          <select
            value={config?.strategy ?? 'dockerfile'}
            onChange={e => setConfig(prev => prev ? { ...prev, strategy: e.target.value } : prev)}
            className="w-full bg-[var(--surface-2)] border border-[var(--rail)] text-[var(--text)] rounded-lg px-3 py-2 text-sm"
          >
            <option value="dockerfile">Dockerfile</option>
            <option value="buildpack">Buildpack</option>
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-[var(--text-muted)] mb-1.5 uppercase tracking-wider">Build command <span className="text-[var(--text-dim)] normal-case font-normal">(optional)</span></label>
          <Input value={config?.buildCommand ?? ''} onChange={e => setConfig(prev => prev ? { ...prev, buildCommand: e.target.value } : prev)} placeholder="npm run build" className="bg-[var(--surface-2)] border border-[var(--rail)] text-[var(--text)] font-mono" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-[var(--text-muted)] mb-1.5 uppercase tracking-wider">Health check path</label>
            <Input value={config?.healthCheckPath ?? ''} onChange={e => setConfig(prev => prev ? { ...prev, healthCheckPath: e.target.value } : prev)} placeholder="/health" className="bg-[var(--surface-2)] border border-[var(--rail)] text-[var(--text)] font-mono" />
          </div>
          <div>
            <label className="block text-xs font-medium text-[var(--text-muted)] mb-1.5 uppercase tracking-wider">Health check port</label>
            <Input type="number" value={config?.healthCheckPort ?? 3000} onChange={e => setConfig(prev => prev ? { ...prev, healthCheckPort: parseInt(e.target.value) || 3000 } : prev)} className="bg-[var(--surface-2)] border border-[var(--rail)] text-[var(--text)]" />
          </div>
        </div>
        <div>
          <label className="block text-xs font-medium text-[var(--text-muted)] mb-1.5 uppercase tracking-wider">Startup timeout (seconds)</label>
          <Input type="number" value={config?.startupTimeoutSeconds ?? 120} onChange={e => setConfig(prev => prev ? { ...prev, startupTimeoutSeconds: parseInt(e.target.value) || 120 } : prev)} className="bg-[var(--surface-2)] border border-[var(--rail)] text-[var(--text)]" />
          <p className="text-[10px] text-[var(--text-dim)] mt-1">How long to wait for the container to become healthy before marking the deployment as failed.</p>
        </div>
        <Button type="submit" variant="primary" size="sm" loading={saving}>Save build config</Button>
      </form>
    </Card>
  );
}
