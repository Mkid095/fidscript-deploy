import { AxiosInstance } from 'axios';

export class LoggingModule {
  private client: AxiosInstance;
  private projectId?: string;

  constructor(client: AxiosInstance) {
    this.client = client;
  }

  setProject(projectId: string) {
    this.projectId = projectId;
  }

  async writeLog(projectId: string, stream: string, level: string, message: string, metadata?: Record<string, unknown>) {
    const response = await this.client.post(`/projects/${projectId}/logs`, { stream, level, message, metadata });
    return response.data;
  }

  async writeBatchLogs(projectId: string, logs: Array<{ stream: string; level: string; message: string; metadata?: Record<string, unknown> }>) {
    const response = await this.client.post(`/projects/${projectId}/logs/batch`, { logs });
    return response.data;
  }

  async getLogs(projectId: string, options?: { stream?: string; level?: string; search?: string; limit?: number }) {
    const response = await this.client.get(`/projects/${projectId}/logs`, { params: options });
    return response.data.logs;
  }

  async getLogsByStream(projectId: string, streamName: string, options?: { level?: string; search?: string; limit?: number }) {
    const response = await this.client.get(`/projects/${projectId}/logs/streams/${streamName}`, { params: options });
    return response.data.logs;
  }

  async getLogStats(projectId: string, stream?: string) {
    const response = await this.client.get(`/projects/${projectId}/logs/stats`, { params: { stream } });
    return response.data;
  }

  async getLogTimeline(projectId: string, streamName: string, interval = '1h') {
    const response = await this.client.get(`/projects/${projectId}/logs/streams/${streamName}/timeline`, { params: { interval } });
    return response.data;
  }

  async listStreams(projectId: string) {
    const response = await this.client.get(`/projects/${projectId}/logs/streams`);
    return response.data.streams;
  }

  async createStream(projectId: string, name: string, type: string, retentionDays?: number) {
    const response = await this.client.post(`/projects/${projectId}/logs/streams`, { name, type, retentionDays });
    return response.data;
  }
}