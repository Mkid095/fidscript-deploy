'use client';

import { useEffect, useState, useCallback } from 'react';
import type { FidscriptSDK } from '@fidscript-deploy/sdk';
import type { Deployment } from '@/types';

export function useRollbackPicker(
  projectId: string,
  currentId: string,
  getSdk: () => FidscriptSDK,
) {
  const [deployments, setDeployments] = useState<Deployment[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getSdk().deployments.list(projectId, { limit: 50 })
      .then(data => {
        const all: Deployment[] = (data as any).deployments ?? data ?? [];
        setDeployments(all.filter((d: Deployment) => d.status === 'SUCCESS' && d.id !== currentId));
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [projectId, currentId, getSdk]);

  const handleRollback = useCallback(async (): Promise<string | null> => {
    if (!selected) return null;
    setSubmitting(true);
    setError(null);
    try {
      const sdk = getSdk();
      await sdk.deployments.rollback(projectId, currentId, selected);
      return selected;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Rollback failed');
      return null;
    } finally {
      setSubmitting(false);
    }
  }, [selected, projectId, currentId, getSdk]);

  return { deployments, loading, selected, setSelected, submitting, error, handleRollback };
}
