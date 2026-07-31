'use client';

import { useEffect, useState } from 'react';
import type { FidscriptSDK } from '@fidscript-deploy/sdk';
import type { Project, CronJob } from '@/types';

export function useSchedulerData(
  sdk: FidscriptSDK,
  selectedProjectId: string,
  shellProjectId: string | null,
) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [pickedProjectId, setPickedProjectId] = useState('');
  const effectiveProjectId = shellProjectId ?? pickedProjectId;
  const [jobs, setJobs] = useState<CronJob[]>([]);
  const [jobStats, setJobStats] = useState<Record<string, {
    total: number; completed: number; failed: number;
    successRate: number | null; avgDurationMs: number | null;
    sparkline: { status: string; durationMs: number | null }[];
  }>>({});
  const [loadingProjects, setLoadingProjects] = useState(!shellProjectId);
  const [loadingJobs, setLoadingJobs] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (shellProjectId) return;
    async function loadProjects() {
      try {
        const data = await sdk.projects.list();
        setProjects(data.projects ?? []);
        if ((data.projects ?? []).length > 0) setPickedProjectId((data.projects ?? [])[0].id);
      } catch { /* ignore */ }
      finally { setLoadingProjects(false); }
    }
    loadProjects();
  }, [sdk, shellProjectId]);

  useEffect(() => {
    if (!effectiveProjectId) return;
    async function loadJobs() {
      setLoadingJobs(true);
      setError(null);
      try {
        const data = await sdk.cron.list(effectiveProjectId);
        setJobs(data);
        const statsResults = await Promise.all(
          data.map(j => sdk.cron.stats(effectiveProjectId, j.id).catch(() => null)),
        );
        const statsMap: typeof jobStats = {};
        data.forEach((j, i) => { if (statsResults[i]) statsMap[j.id] = statsResults[i]; });
        setJobStats(statsMap);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load cron jobs');
      } finally {
        setLoadingJobs(false);
      }
    }
    loadJobs();
  }, [effectiveProjectId, sdk]);

  return {
    projects, setProjects,
    pickedProjectId, setPickedProjectId,
    effectiveProjectId,
    jobs, setJobs,
    jobStats,
    loadingProjects,
    loadingJobs,
    error,
  };
}
