import { AxiosInstance } from 'axios';

export class CronModule {
  private client: AxiosInstance;
  private projectId?: string;

  constructor(client: AxiosInstance) {
    this.client = client;
  }

  setProject(projectId: string) {
    this.projectId = projectId;
  }

  async list(projectId: string) {
    const response = await this.client.get(`/projects/${projectId}/cron`);
    return response.data.jobs;
  }

  async get(projectId: string, jobId: string) {
    const response = await this.client.get(`/projects/${projectId}/cron/${jobId}`);
    return response.data;
  }

  async create(projectId: string, data: { name: string; cronExpression: string; endpoint?: string; functionId?: string; timezone?: string }) {
    const response = await this.client.post(`/projects/${projectId}/cron`, data);
    return response.data;
  }

  async update(projectId: string, jobId: string, data: any) {
    const response = await this.client.patch(`/projects/${projectId}/cron/${jobId}`, data);
    return response.data;
  }

  async delete(projectId: string, jobId: string) {
    const response = await this.client.delete(`/projects/${projectId}/cron/${jobId}`);
    return response.data;
  }

  async trigger(projectId: string, jobId: string, payload?: any) {
    const response = await this.client.post(`/projects/${projectId}/cron/${jobId}/trigger`, { payload });
    return response.data;
  }

  async getRuns(projectId: string, jobId: string, limit = 50) {
    const response = await this.client.get(`/projects/${projectId}/cron/${jobId}/runs`, { params: { limit } });
    return response.data.runs;
  }

  async getNextRun(projectId: string, jobId: string) {
    const response = await this.client.get(`/projects/${projectId}/cron/${jobId}/next-run`);
    return response.data;
  }
}