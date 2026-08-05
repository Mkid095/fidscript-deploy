'use client';

import { useEffect, useState } from 'react';
import type { Project } from '@/types';

interface UseProjectAndProjectsOptions {
  projectId: string;
  getSdk: () => ReturnType<ReturnType<typeof import('@/contexts/auth-context').useAuth>['getSdk']>;
}

export function useProjectAndProjects({ projectId, getSdk }: UseProjectAndProjectsOptions) {
  const [project, setProject] = useState<Project | null>(null);
  const [allProjects, setAllProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      const sdk = getSdk();
      try {
        const [proj, list] = await Promise.all([
          sdk.projects.get(projectId),
          sdk.projects.list(),
        ]);
        if (!cancelled) {
          setProject(proj);
          setAllProjects(Array.isArray(list) ? list : (list as unknown as { projects?: Project[] }).projects ?? []);
          setLoading(false);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load project');
          setLoading(false);
        }
      }
    }
    load();
    return () => { cancelled = true; };
  }, [projectId, getSdk]);

  return { project, allProjects, loading, error };
}
