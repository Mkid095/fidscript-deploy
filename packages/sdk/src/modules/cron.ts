import { FidscriptClient } from '../client';

export interface CronJob {
  id: string;
  name: string;
  cronExpression: string;
  timezone: string;
  targetType?: string;
  endpoint?: string;
  functionId?: string;
  enabled: boolean;
  lastRunAt?: string;
  nextRunAt?: string;
  createdAt: string;
}

export interface CronJobRun {
  id: string;
  status: 'running' | 'completed' | 'failed';
  startedAt: string;
  completedAt?: string;
  errorMessage?: string;
}

export class CronModule {
  constructor(private client: FidscriptClient) {}

  async list(projectId: string) {
    const res = await this.client.get<{ jobs: CronJob[] }>(`/api/v1/projects/${projectId}/cron`);
    return res.jobs;
  }

  async get(projectId: string, jobId: string) {
    return this.client.get<CronJob>(`/api/v1/projects/${projectId}/cron/${jobId}`);
  }

  async create(
    projectId: string,
    data: {
      name: string;
      cronExpression: string;
      endpoint?: string;
      functionId?: string;
      timezone?: string;
      targetType?: string;
    },
  ) {
    return this.client.post<CronJob>(`/api/v1/projects/${projectId}/cron`, data);
  }

  async update(projectId: string, jobId: string, data: Partial<CronJob>) {
    return this.client.patch<CronJob>(`/api/v1/projects/${projectId}/cron/${jobId}`, data);
  }

  async delete(projectId: string, jobId: string) {
    return this.client.delete(`/api/v1/projects/${projectId}/cron/${jobId}`);
  }

  async trigger(projectId: string, jobId: string, payload?: unknown) {
    return this.client.post(`/api/v1/projects/${projectId}/cron/${jobId}/trigger`, { payload });
  }

  async getRuns(projectId: string, jobId: string, limit = 50) {
    const res = await this.client.get<{ runs: CronJobRun[] }>(
      `/api/v1/projects/${projectId}/cron/${jobId}/runs`,
      { limit },
    );
    return res.runs;
  }

  async getNextRun(projectId: string, jobId: string) {
    return this.client.get<{ nextRunAt: string | null }>(`/api/v1/projects/${projectId}/cron/${jobId}/next-run`);
  }
}
