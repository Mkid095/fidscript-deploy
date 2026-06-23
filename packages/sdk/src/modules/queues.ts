import { FidscriptClient } from '../client';

export interface Queue {
  id: string;
  name: string;
  type: string;
  status: string;
  createdAt: string;
}

export interface QueueMessage {
  id: string;
  body: string;
  status: string;
  attempts: number;
  createdAt: string;
}

export class QueuesModule {
  constructor(private client: FidscriptClient) {}

  async list(projectId: string) {
    const res = await this.client.get<{ queues: Queue[] }>(`/api/v1/projects/${projectId}/queues`);
    return res.queues;
  }

  async get(projectId: string, queueId: string) {
    return this.client.get<Queue>(`/api/v1/projects/${projectId}/queues/${queueId}`);
  }

  async create(projectId: string, data: { name: string; type?: string }) {
    return this.client.post<Queue>(`/api/v1/projects/${projectId}/queues`, data);
  }

  async delete(projectId: string, queueId: string) {
    return this.client.delete(`/api/v1/projects/${projectId}/queues/${queueId}`);
  }

  async publish(projectId: string, queueId: string, body: string | object, headers?: Record<string, string>) {
    return this.client.post(`/api/v1/projects/${projectId}/queues/${queueId}/messages`, {
      body: typeof body === 'string' ? body : JSON.stringify(body),
      headers,
    });
  }

  async consume(projectId: string, queueId: string, maxMessages = 10, timeoutSeconds = 30) {
    const res = await this.client.post<{ messages: QueueMessage[] }>(
      `/api/v1/projects/${projectId}/queues/${queueId}/consume`,
      { queueId, maxMessages, timeoutSeconds },
    );
    return res.messages;
  }

  async ack(projectId: string, queueId: string, messageIds: string[]) {
    return this.client.post(`/api/v1/projects/${projectId}/queues/${queueId}/ack`, { messageIds });
  }

  async retry(projectId: string, queueId: string, messageIds: string[]) {
    return this.client.post(`/api/v1/projects/${projectId}/queues/${queueId}/retry`, { messageIds });
  }

  async getMessages(projectId: string, queueId: string, opts?: { status?: string; limit?: number; cursor?: string }) {
    const res = await this.client.get<{ messages: QueueMessage[]; nextCursor: string | null }>(
      `/api/v1/projects/${projectId}/queues/${queueId}/messages`,
      opts,
    );
    return res;
  }

  async purge(projectId: string, queueId: string, includeDlq = false) {
    return this.client.post<{ purged: number; dlqPurged: number }>(
      `/api/v1/projects/${projectId}/queues/${queueId}/purge`,
      { includeDlq },
    );
  }

  async getStats(projectId: string, queueId: string) {
    return this.client.get<{
      queueId: string;
      jsDepth: number;
      pending: number;
      delivered: number;
      acknowledged: number;
      failed: number;
      deadLettered: number;
      total: number;
    }>(`/api/v1/projects/${projectId}/queues/${queueId}/stats`);
  }
}
