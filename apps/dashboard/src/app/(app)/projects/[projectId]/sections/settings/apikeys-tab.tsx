'use client';

import { useEffect, useState, useCallback } from 'react';
import { Card, Button, Spinner, EmptyState } from '@fidscript/ui';
import { HugeiconsIcon } from '@hugeicons/react';
import { SourceCodeIcon } from '@hugeicons/core-free-icons';

import { useAuth } from '@/contexts/auth-context';
import { useToast } from '@/components/toast-provider';
import { CreateApiKeyModal } from './create-api-key-modal';
import type { Project } from '@/types';

interface ApiKey { id: string; name: string; createdAt: string; lastUsedAt?: string; }

export function ApiKeysTab({ project }: { project: Project }) {
  const { getSdk } = useAuth();
  const { showToast } = useToast();
  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);

  const load = useCallback(async () => {
    try {
      const result = await getSdk().projects.listApiKeys(project.id);
      setKeys(result ?? []);
    } catch {
      showToast({ type: 'error', message: 'Failed to load API keys' });
    } finally {
      setLoading(false);
    }
  }, [project.id, getSdk, showToast]);

  useEffect(() => { load(); }, [load]);

  async function handleRevoke(keyId: string) {
    if (!confirm('Revoke this API key? Any services using it will lose access immediately.')) return;
    try {
      await getSdk().projects.revokeApiKey(project.id, keyId);
      setKeys(prev => prev.filter(k => k.id !== keyId));
      showToast({ type: 'success', message: 'API key revoked.' });
    } catch (err) {
      showToast({ type: 'error', message: err instanceof Error ? err.message : 'Failed to revoke' });
    }
  }

  if (loading) return <div className="flex justify-center py-8"><Spinner /></div>;

  return (
    <div className="space-y-4">
      <Card className="border border-[var(--rail)] p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-sm font-semibold text-[var(--text)]">Project API Keys</h2>
            <p className="text-xs text-[var(--text-muted)] mt-0.5">Use the <code className="text-[var(--text-muted)]">X-API-Key</code> header for programmatic access.</p>
          </div>
          <Button variant="secondary" size="sm" onClick={() => setShowCreate(true)}>+ New Key</Button>
        </div>

        {keys.length === 0 ? (
          <EmptyState title="No API keys" description="Create a key to access this project's services programmatically (storage, databases, logs, etc.)." />
        ) : (
          <div className="space-y-1.5">
            {keys.map(k => (
              <div key={k.id} className="flex items-center gap-3 px-3 py-2.5 bg-[var(--surface-2)] border border-[var(--rail)] rounded-md">
                <HugeiconsIcon icon={SourceCodeIcon} size={14} className="text-[var(--text-muted)] flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-[var(--text)] truncate">{k.name}</p>
                  <p className="text-[10px] text-[var(--text-dim)]">
                    Created {new Date(k.createdAt).toLocaleDateString()}
                    {k.lastUsedAt ? ` · Last used ${new Date(k.lastUsedAt).toLocaleDateString()}` : ''}
                  </p>
                </div>
                <button onClick={() => handleRevoke(k.id)} className="text-xs text-[var(--danger)] hover:text-[var(--danger)] flex-shrink-0">Revoke</button>
              </div>
            ))}
          </div>
        )}
      </Card>

      {keys.length > 0 && (
        <Card className="border border-[var(--rail)] p-4">
          <h3 className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-2">Usage</h3>
          <pre className="bg-[var(--surface-2)] border border-[var(--rail)] rounded-lg p-3 text-[11px] font-mono text-[var(--text-muted)] overflow-x-auto"><code>{`curl -H "X-API-Key: fpk_..." \\
  https://api.deploy.fidscript.com/api/v1/projects/${project.id}/storage/buckets`}</code></pre>
        </Card>
      )}

      {showCreate && (
        <CreateApiKeyModal
          projectId={project.id}
          onCreated={(key, apiKey) => { setKeys(prev => [...prev, apiKey]); setShowCreate(false); }}
          onClose={() => setShowCreate(false)}
        />
      )}
    </div>
  );
}
