import { AxiosInstance } from 'axios';
import { EmailMessage } from '../index.js';

export class EmailModule {
  private client: AxiosInstance;
  private projectId?: string;

  constructor(client: AxiosInstance) {
    this.client = client;
  }

  setProject(projectId: string) {
    this.projectId = projectId;
  }

  async send(projectId: string, data: { to: string; subject: string; text?: string; html?: string }) {
    const response = await this.client.post(`/projects/${projectId}/email/send`, data);
    return response.data;
  }

  async listMailboxes(projectId: string) {
    const response = await this.client.get(`/projects/${projectId}/email/mailboxes`);
    return response.data.mailboxes;
  }

  async createMailbox(projectId: string, email: string, name?: string) {
    const response = await this.client.post(`/projects/${projectId}/email/mailboxes`, { email, name });
    return response.data;
  }

  async deleteMailbox(projectId: string, mailboxId: string) {
    const response = await this.client.delete(`/projects/${projectId}/email/mailboxes/${mailboxId}`);
    return response.data;
  }

  async listAliases(projectId: string) {
    const response = await this.client.get(`/projects/${projectId}/email/aliases`);
    return response.data.aliases;
  }

  async createAlias(projectId: string, alias: string, forwardsTo: string[]) {
    const response = await this.client.post(`/projects/${projectId}/email/aliases`, { alias, forwardsTo });
    return response.data;
  }

  async verifyDomain(projectId: string, domain: string) {
    const response = await this.client.post(`/projects/${projectId}/email/verify-domain`, { domain });
    return response.data;
  }

  async getLogs(projectId: string, limit = 50) {
    const response = await this.client.get(`/projects/${projectId}/email/logs`, { params: { limit } });
    return response.data.logs as EmailMessage[];
  }
}