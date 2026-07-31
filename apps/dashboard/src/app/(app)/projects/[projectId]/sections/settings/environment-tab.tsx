'use client';

import { useEffect, useState, useCallback } from 'react';
import { Card, Button, Spinner, EmptyState } from '@fidscript/ui';
import { HugeiconsIcon } from '@hugeicons/react';
import { EyeIcon, EyeOffIcon } from '@hugeicons/core-free-icons';

import { useAuth } from '@/contexts/auth-context';
import { useToast } from '@/components/toast-provider';
import { AddEnvModal } from './add-env-modal';
import type { Project } from '@/types';

interface EnvVar { key: string; value: string; }

export function EnvironmentTab({ project }: { project: Project }) {
  const { getSdk } = useAuth();
  const { showToast } = useToast();
  const [envVars, setEnvVars] = useState<EnvVar[]>([]);
  const [loading, setLoading] = useState(true);
  const [revealed, setRevealed] = useState<Record<string, boolean>>({});
  const [showAdd, setShowAdd] = useState(false);
  const [editKey, setEditKey] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');

  const load = useCallback(async () => {
    try {
      const vars = await getSdk().projects.getEnvVars(project.id);
      setEnvVars(Array.isArray(vars) ? vars : []);
    } catch {
      showToast({ type: 'error', message: 'Failed to load env vars' });
    } finally {
      setLoading(false);
    }
  }, [project.id, getSdk, showToast]);

  useEffect(() => { load(); }, [load]);

  async function handleSaveEdit(key: string) {
    try {
      const varMap: Record<string, string> = {};
      for (const v of envVars) varMap[v.key] = v.key === key ? editValue : v.value;
      await getSdk().projects.setEnvVars(project.id, varMap);
      setEnvVars(prev => prev.map(v => v.key === key ? { ...v, value: editValue } : v));
      setEditKey(null);
      showToast({ type: 'success', message: 'Environment variable updated.' });
    } catch (err) {
      showToast({ type: 'error', message: err instanceof Error ? err.message : 'Failed to update' });
    }
  }

  async function handleDelete(key: string) {
    try {
      await getSdk().projects.deleteEnvVar(project.id, key);
      setEnvVars(prev => prev.filter(v => v.key !== key));
      showToast({ type: 'success', message: 'Environment variable deleted.' });
    } catch (err) {
      showToast({ type: 'error', message: err instanceof Error ? err.message : 'Failed to delete' });
    }
  }

  if (loading) return <div className="flex justify-center py-8"><Spinner /></div>;

  return (
    <div className="space-y-4">
      <Card className="border border-[var(--rail)] p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-sm font-semibold text-[var(--text)]">Environment Variables</h2>
            <p className="text-xs text-[var(--text-muted)] mt-0.5">Encrypted at rest (AES-256-GCM). Applied to all deployments.</p>
          </div>
          <Button variant="secondary" size="sm" onClick={() => setShowAdd(true)}>+ Add</Button>
        </div>

        {envVars.length === 0 ? (
          <EmptyState title="No environment variables" description="Add your first environment variable to configure your deployment." />
        ) : (
          <div className="space-y-1.5">
            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 text-[10px] text-[var(--text-dim)] uppercase tracking-wider font-medium">
              <span className="min-w-[140px]">Key</span>
              <span className="flex-1">Value</span>
              <span className="w-24" />
            </div>
            {envVars.map(env => (
              <div key={env.key} className="flex items-center gap-2 px-3 py-2 bg-[var(--surface-2)] border border-[var(--rail)] rounded-md">
                <span className="text-xs font-mono text-[var(--text-muted)] min-w-[140px] truncate">{env.key}</span>
                {editKey === env.key ? (
                  <>
                    <input
                      value={editValue}
                      onChange={e => setEditValue(e.target.value)}
                      autoFocus
                      className="flex-1 bg-[var(--surface-2)] border border-[var(--accent)]/50 text-[var(--text)] rounded px-2 py-1 text-xs font-mono min-w-0"
                    />
                    <button onClick={() => handleSaveEdit(env.key)} className="text-xs text-[var(--success)] hover:text-[var(--success)] px-2 flex-shrink-0">Save</button>
                    <button onClick={() => setEditKey(null)} className="text-xs text-[var(--text-muted)] hover:text-[var(--text-muted)] px-1 flex-shrink-0">Cancel</button>
                  </>
                ) : (
                  <>
                    <span className="text-xs font-mono text-[var(--text)] flex-1 truncate">
                      {revealed[env.key] ? env.value : '••••••••••••'}
                    </span>
                    <button onClick={() => setRevealed(prev => ({ ...prev, [env.key]: !prev[env.key] }))} className="text-[var(--text-muted)] hover:text-[var(--text-muted)] p-1 flex-shrink-0" title={revealed[env.key] ? 'Hide' : 'Reveal'}>
                      <HugeiconsIcon icon={revealed[env.key] ? EyeOffIcon : EyeIcon} size={12} />
                    </button>
                    <button onClick={() => { setEditKey(env.key); setEditValue(env.value); }} className="text-xs text-[var(--accent)] hover:text-[var(--accent)] px-2 flex-shrink-0">Edit</button>
                    <button onClick={() => handleDelete(env.key)} className="text-xs text-[var(--danger)] hover:text-[var(--danger)] px-1 flex-shrink-0">Delete</button>
                  </>
                )}
              </div>
            ))}
          </div>
        )}
      </Card>

      {showAdd && (
        <AddEnvModal
          projectId={project.id}
          existingVars={envVars}
          onAdded={v => setEnvVars(prev => [...prev, v])}
          onClose={() => setShowAdd(false)}
        />
      )}
    </div>
  );
}
