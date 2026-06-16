import { AxiosInstance } from 'axios';

export class QueuesModule {
  private client: AxiosInstance;
  private projectId?: string;

  constructor(client: AxiosInstance) {
    this.client = client;
  }

  setProject(projectId: string) {
    this.projectId = projectId;
  }

  async list(projectId: string) {
    const response = await this.client.get(`/projects/${projectId}/queues`);
    return response.data.queues;
  }

  async create(projectId: string, data: { name: string; type?: string; retentionDays?: number }) {
    const response = await this.client.post(`/projects/${projectId}/queues`, data);
    return response.data;
  }

  async publish(projectId: string, queueId: string, body: string | object, headers?: Record<string, string>) {
    const response = await this.client.post(`/projects/${projectId}/queues/${queueId}/messages`, {
      body: typeof body === 'string' ? body : JSON.stringify(body),
      headers,
    });
    return response.data;
  }

  async consume(projectId: string, queueId: string, maxMessages = 10, timeoutSeconds = 30) {
    const response = await this.client.post(`/projects/${projectId}/queues/${queueId}/consume`, {
      queueId,
      maxMessages,
      timeoutSeconds,
    });
    return response.data.messages;
  }

  async ack(projectId: string, queueId: string, messageIds: string[]) {
    const response = await this.client.post(`/projects/${projectId}/queues/${queueId}/ack`, { messageIds });
    return response.data;
  }

  async retry(projectId: string, queueId: string, messageIds: string[]) {
    const response = await this.client.post(`/projects/${projectId}/queues/${queueId}/retry`, { messageIds });
    return response.data;
  }

  async getStats(projectId: string, queueId: string) {
    const response = await this.client.get(`/projects/${projectId}/queues/${queueId}/stats`);
    return response.data;
  }

  async delete(projectId: string, queueId: string) {
    const response = await this.client.delete(`/projects/${projectId}/queues/${queueId}`);
    return response.data;
  }
}