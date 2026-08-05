import type { FidscriptSDK } from '@fidscript-deploy/sdk';

import { useCallback, useEffect, useState } from 'react';

import { useAuth } from '@/contexts/auth-context';
import { useShellProjectId } from '@/contexts/project-context';

export interface Suppression {
  id: string;
  email: string;
  reason: string;
  createdAt: string;
}

export function useSuppressions() {
  const { getSdk } = useAuth();
  const projectId = useShellProjectId();
  const [items, setItems] = useState<Suppression[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!projectId) return;
    setLoading(true);
    try {
      const sdk = getSdk();
      const list = await sdk.email.listSuppressions(projectId);
      setItems(list);
    } catch { /* ignore */ } finally {
      setLoading(false);
    }
  }, [projectId, getSdk]);

  useEffect(() => { load(); }, [load]);

  const add = useCallback(async (email: string) => {
    if (!projectId) return;
    const sdk = getSdk();
    await sdk.email.addSuppression(projectId, email);
    await load();
  }, [projectId, getSdk, load]);

  const remove = useCallback(async (email: string) => {
    if (!projectId) return;
    const sdk = getSdk();
    await sdk.email.removeSuppression(projectId, email);
    setItems(prev => prev.filter(i => i.email !== email));
  }, [projectId, getSdk]);

  return { items, loading, add, remove, reload: load };
}
