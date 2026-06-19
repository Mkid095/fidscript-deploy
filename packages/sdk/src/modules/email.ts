import { FidscriptClient } from '../client';

export interface EmailMessage {
  id: string;
  to: string;
  from?: string;
  subject: string;
  status: string;
  createdAt: string;
}

export interface Mailbox {
  id: string;
  email: string;
  name?: string;
  createdAt: string;
}

export interface EmailAlias {
  id: string;
  alias: string;
  forwardsTo: string[];
  createdAt: string;
}

export class EmailModule {
  constructor(private client: FidscriptClient) {}

  async send(projectId: string, data: { to: string; subject: string; text?: string; html?: string }) {
    return this.client.post<{ id: string }>(`/api/v1/projects/${projectId}/email/send`, data);
  }

  async listMailboxes(projectId: string) {
    const res = await this.client.get<{ mailboxes: Mailbox[] }>(`/api/v1/projects/${projectId}/email/mailboxes`);
    return res.mailboxes;
  }

  async createMailbox(projectId: string, email: string, name?: string) {
    return this.client.post<Mailbox>(`/api/v1/projects/${projectId}/email/mailboxes`, { email, name });
  }

  async deleteMailbox(projectId: string, mailboxId: string) {
    return this.client.delete(`/api/v1/projects/${projectId}/email/mailboxes/${mailboxId}`);
  }

  async listAliases(projectId: string) {
    const res = await this.client.get<{ aliases: EmailAlias[] }>(`/api/v1/projects/${projectId}/email/aliases`);
    return res.aliases;
  }

  async createAlias(projectId: string, alias: string, forwardsTo: string[]) {
    return this.client.post<EmailAlias>(`/api/v1/projects/${projectId}/email/aliases`, { alias, forwardsTo });
  }

  async deleteAlias(projectId: string, aliasId: string) {
    return this.client.delete(`/api/v1/projects/${projectId}/email/aliases/${aliasId}`);
  }
}
