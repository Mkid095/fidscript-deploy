'use client';

import { useEffect, useState } from 'react';
import type { EnvVar, ProjectMember } from '@/types';

interface UseProjectOverviewDataOptions {
  projectId: string;
  getSdk: () => ReturnType<ReturnType<typeof import('@/contexts/auth-context').useAuth>['getSdk']>;
}

export function useProjectOverviewData({ projectId, getSdk }: UseProjectOverviewDataOptions) {
  const [envVars, setEnvVars] = useState<EnvVar[]>([]);
  const [members, setMembers] = useState<ProjectMember[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      const sdk = getSdk();
      const [envRes, membersRes] = await Promise.allSettled([
        sdk.projects.getEnvVars(projectId),
        sdk.projects.listMembers(projectId),
      ]);
      if (!cancelled) {
        if (envRes.status === 'fulfilled') setEnvVars(envRes.value);
        if (membersRes.status === 'fulfilled') {
          const val = membersRes.value;
          setMembers(Array.isArray(val) ? val : []);
        }
        setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [projectId, getSdk]);

  return { envVars, members, loading };
}
