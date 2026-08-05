'use client';

import { useEffect, useState } from 'react';
import type { FidscriptSDK } from '@fidscript-deploy/sdk';
import type { Database } from '@fidscript-deploy/sdk';
import type { Project } from '@/types';

export function useDatabasesData(
  sdk: FidscriptSDK,
  shellProjectId: string | null,
) {
  const [databases, setDatabases] = useState<Database[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loadingDatabases, setLoadingDatabases] = useState(true);
  const [loadingProjects, setLoadingProjects] = useState(!shellProjectId);
  const [error, setError] = useState<string | null>(null);

  // Determine the effective projectId for database operations
  const projectId = shellProjectId ?? projects[0]?.id ?? '';

  useEffect(() => {
    if (shellProjectId) return;
    async function loadProjects() {
      try {
        const data = await sdk.projects.list();
        setProjects(data.projects ?? []);
      } catch { /* ignore */ }
      finally { setLoadingProjects(false); }
    }
    loadProjects();
  }, [sdk, shellProjectId]);

  useEffect(() => {
    if (!projectId) return;
    async function loadDatabases() {
      setLoadingDatabases(true);
      setError(null);
      try {
        const data = await sdk.databases.list(projectId);
        setDatabases(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load databases');
      } finally {
        setLoadingDatabases(false);
      }
    }
    loadDatabases();
  }, [sdk, projectId]);

  return {
    databases,
    setDatabases,
    projects,
    projectId,
    loadingDatabases,
    loadingProjects,
    error,
  };
}
