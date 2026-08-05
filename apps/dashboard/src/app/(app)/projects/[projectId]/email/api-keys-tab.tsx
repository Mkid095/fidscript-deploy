'use client';

import { useCallback, useEffect, useState } from 'react';

import { useAuth } from '@/contexts/auth-context';
import { useShellProjectId } from '@/contexts/project-context';

import { API_BASE_URL } from '@/lib/sdk';
import { Button, EmptyState, Spinner, Toast } from '@fidscript/ui';
import { ApiKeyCard } from './api-key-card';
import { AddApiKeyModal, type EmailApiKey } from './add-api-key-modal';

type Flash = { type: 'success' | 'error'; message: string };

function errMsg(err: unknown): string {
  return err instanceof Error ? err.message : 'Unexpected error';
}

export function ApiKeysTab() {
  const { getToken } = useAuth();
  const projectId = useShellProjectId();
  const [keys, setKeys] = useState<EmailApiKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [flash, setFlash] = useState<Flash | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!projectId) return;
    setLoading(true);
    try {
      const token = getToken();
      if (!token) throw new Error('Not signed in');
      const res = await fetch(
        `${API_BASE_URL}/api/v1/projects/${projectId}/email/api-keys`,
        { headers: { Authorization: `Bearer ${token}` } },
      );
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const list = (await res.json()) as EmailApiKey[];
      setKeys(list);
    } catch (err) {
      setFlash({ type: 'error', message: errMsg(err) });
    } finally {
      setLoading(false);
    }
  }, [getToken, projectId]);

  useEffect(() => { void load(); }, [load]);

  async function handleDelete(id: string) {
    if (!projectId) return;
    setBusyId(id);
    try {
      const token = getToken();
      if (!token) throw new Error('Not signed in');
      const res = await fetch(
        `${API_BASE_URL}/api/v1/projects/${projectId}/email/api-keys/${id}`,
        { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } },
      );
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setKeys(prev => prev.filter(k => k.id !== id));
      setFlash({ type: 'success', message: 'API key deleted' });
    } catch (err) {
      setFlash({ type: 'error', message: errMsg(err) });
    } finally {
      setBusyId(null);
    }
  }

  if (!projectId) return null;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-xs text-[var(--text-dim)]">
          {loading ? 'Loading…' : `${keys.length} API key${keys.length !== 1 ? 's' : ''}`}
        </p>
        <Button size="sm" onClick={() => setShowAdd(true)}>+ Add API Key</Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><Spinner /></div>
      ) : keys.length === 0 ? (
        <EmptyState
          title="No email API keys"
          description="Create a key to send mail programmatically (POST /email/send with apiKeyId)."
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {keys.map(k => (
            <ApiKeyCard
              key={k.id}
              apiKey={k}
              busy={busyId === k.id}
              onDelete={() => handleDelete(k.id)}
            />
          ))}
        </div>
      )}

      {showAdd && (
        <AddApiKeyModal
          onClose={() => setShowAdd(false)}
          onCreated={(created: EmailApiKey) => {
            setKeys(prev => [...prev, created]);
            setShowAdd(false);
          }}
        />
      )}

      {flash && <Toast type={flash.type} message={flash.message} onClose={() => setFlash(null)} />}
    </div>
  );
}
