'use client';

import { useCallback, useEffect, useState } from 'react';
import { Card, Spinner } from '@fidscript/ui';

import { FunctionVersionsList } from './function-versions-list';
import type { FidscriptSDK } from '@fidscript-deploy/sdk';

interface FunctionVersionsProps {
  projectId: string;
  functionId: string;
  getSdk: () => FidscriptSDK;
}

interface FunctionVersion {
  version: string;
  createdAt: string;
  status: string;
}

export function FunctionVersions({ projectId, functionId, getSdk }: FunctionVersionsProps) {
  const [versions, setVersions] = useState<FunctionVersion[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadVersions = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getSdk().functions.listVersions(projectId, functionId);
      setVersions(data as FunctionVersion[]);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load versions');
    } finally {
      setLoading(false);
    }
  }, [projectId, functionId, getSdk]);

  useEffect(() => { loadVersions(); }, [loadVersions]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Spinner size="lg" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <p className="text-[var(--danger)] text-sm mb-3">{error}</p>
        <button onClick={loadVersions} className="text-sm text-[var(--accent)] hover:underline">
          Try again
        </button>
      </div>
    );
  }

  if (versions.length === 0) {
    return (
      <Card className="border border-dashed border-[var(--rail-light)] p-12 text-center">
        <p className="text-sm text-[var(--text-muted)]">No versions deployed yet.</p>
        <p className="text-xs text-[var(--text-dim)] mt-1">Deploy your function to create the first version.</p>
      </Card>
    );
  }

  return (
    <FunctionVersionsList
      projectId={projectId}
      functionId={functionId}
      versions={versions}
      getSdk={getSdk}
    />
  );
}
