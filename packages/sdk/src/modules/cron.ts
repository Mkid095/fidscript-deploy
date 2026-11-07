import { FidscriptClient } from '../client';
import { CronJob, CronJobRun, CronJobStats, CronJobActionType, CronJobEmailConfig, CronJobQueueConfig, CronActionType } from './cron-types';

export type { CronJob, CronJobRun, CronJobStats, CronJobActionType, CronJobEmailConfig, CronJobQueueConfig };
export { CronActionType };

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
      actionType?: CronJobActionType;
      endpoint?: string;
      httpMethod?: string;
      httpHeaders?: { key: string; value: string }[];
      functionId?: string;
      emailConfig?: CronJobEmailConfig;
      queueConfig?: CronJobQueueConfig;
      timezone?: string;
      payload?: Record<string, unknown>;
      enabled?: boolean;
      retryAttempts?: number;
      retryDelaySeconds?: number;
      timeoutSeconds?: number;
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

  /** Simulate next N execution times for this cron job (dry-run). */
  async simulate(projectId: string, jobId: string, count = 5) {
    return this.client.get<{ scheduledAt: string }[]>(
      `/api/v1/projects/${projectId}/cron/${jobId}/simulate`,
      { count },
    );
  }

  /** Simulate next N execution times for any cron expression (dry-run). */
  async simulateExpression(projectId: string, cronExpression: string, timezone = 'UTC', count = 5) {
    return this.client.post<{ scheduledAt: string }[]>(
      `/api/v1/projects/${projectId}/cron/simulate-expression`,
      { cronExpression, timezone, count },
    );
  }

  /** Lightweight run statistics for a cron job. */
  async stats(projectId: string, jobId: string, window = 50) {
    return this.client.get<CronJobStats>(
      `/api/v1/projects/${projectId}/cron/${jobId}/stats`,
      { window },
    );
  }

  /** Replay a run with its stored payload snapshot. */
  async replay(projectId: string, jobId: string, runId: string) {
    return this.client.post<{ runId: string; replayedFrom: string; status: string }>(
      `/api/v1/projects/${projectId}/cron/${jobId}/runs/${runId}/replay`,
      {},
    );
  }

  /** Create a cron job that sends an email on schedule. */
  async createEmailJob(
    projectId: string,
    data: {
      name: string;
      cronExpression: string;
      emailConfig: CronJobEmailConfig;
      timezone?: string;
      payload?: Record<string, unknown>;
      enabled?: boolean;
      retryAttempts?: number;
      retryDelaySeconds?: number;
      timeoutSeconds?: number;
    },
  ) {
    return this.create(projectId, { ...data, actionType: CronActionType.Email });
  }

  /** Create a cron job that publishes a queue message on schedule. */
  async createQueueJob(
    projectId: string,
    data: {
      name: string;
      cronExpression: string;
      queueConfig: CronJobQueueConfig;
      timezone?: string;
      payload?: Record<string, unknown>;
      enabled?: boolean;
      retryAttempts?: number;
      retryDelaySeconds?: number;
      timeoutSeconds?: number;
    },
  ) {
    return this.create(projectId, { ...data, actionType: CronActionType.Queue });
  }
}
