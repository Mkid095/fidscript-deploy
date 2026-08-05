'use client';

import { useEffect, useState, useCallback } from 'react';
import type { FidscriptSDK } from '@fidscript-deploy/sdk';
import type { Function_ } from '@/types';

export function useFunctionsData(
  sdk: FidscriptSDK,
  projectId: string,
) {
  const [functions, setFunctions] = useState<Function_[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadFunctions = useCallback(async () => {
    if (!projectId) return;
    setLoading(true);
    try {
      const data = await sdk.functions.list(projectId);
      setFunctions(data as Function_[]);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load functions');
    } finally {
      setLoading(false);
    }
  }, [sdk, projectId]);

  useEffect(() => { loadFunctions(); }, [loadFunctions]);

  // Realtime subscription for function events
  useEffect(() => {
    if (!projectId) return;
    const rt = (sdk as any).realtime;
    if (!rt) return;

    const token = localStorage.getItem('fidscript_access_token')
      ?? localStorage.getItem('fidscript_token') ?? '';

    let cancelled = false;

    rt.connect(() => token, projectId).then(() => {
      if (cancelled) return;
      const unsub = rt.subscribeFunctions(projectId, (event: any) => {
        const et = event?.type;
        if (!et) return;
        if (et === 'function.created' || et === 'function.deleted') {
          loadFunctions();
        }
      });
      if (cancelled) unsub();
    });

    return () => { cancelled = true; };
  }, [projectId, sdk, loadFunctions]);

  const handleCreate = useCallback(async (data: { name: string; runtime: string }) => {
    const created = await sdk.functions.create(projectId, data) as Function_;
    setFunctions(prev => [...prev, created]);
    return created;
  }, [sdk, projectId]);

  const handleDelete = useCallback(async (fn: Function_) => {
    await sdk.functions.delete(projectId, fn.id);
  }, [sdk, projectId]);

  return {
    functions,
    loading,
    error,
    loadFunctions,
    handleCreate,
    handleDelete,
  };
}
