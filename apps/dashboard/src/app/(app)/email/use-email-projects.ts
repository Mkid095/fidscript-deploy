'use client';

import { useEffect, useState } from 'react';
import type { FidscriptSDK } from '@fidscript-deploy/sdk';
import type { Project } from '@/types';

export function useEmailProjects(
  sdk: FidscriptSDK,
  shellProjectId: string | null,
) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [pickedProjectId, setPickedProjectId] = useState('');
  const [loading, setLoading] = useState(!shellProjectId);

  useEffect(() => {
    if (shellProjectId) return;
    async function load() {
      try {
        const data = await sdk.projects.list();
        setProjects(data.projects ?? []);
        if ((data.projects ?? []).length > 0 && !pickedProjectId) {
          setPickedProjectId((data.projects ?? [])[0].id);
        }
      } catch { /* ignore */ }
      finally { setLoading(false); }
    }
    load();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sdk, shellProjectId]);

  return {
    projects,
    pickedProjectId,
    setPickedProjectId,
    loading,
  };
}
