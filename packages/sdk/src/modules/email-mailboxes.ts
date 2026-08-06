/**
 * Email mailboxes, aliases, domains, messages — per-project operations.
 * Split out of email.ts for ANPAS 150-line limit.
 */

import type { FidscriptClient } from '../client';
import type {
  Mailbox,
  EmailAlias,
  EmailDomain,
} from '@fidscript-deploy/types';

export interface EmailMailboxesHost {
  readonly client: FidscriptClient;
  send(projectId: string, data: {
    to: string;
    from?: string;
    subject: string;
    text?: string;
    html?: string;
    replyTo?: string;
    apiKeyId?: string;
  }): Promise<{ messageId: string; accepted: string[]; status: string; error?: string }>;
  listMailboxes(projectId: string): Promise<Mailbox[]>;
  createMailbox(projectId: string, data: {
    domain: string;
    localPart: string;
    password: string;
    name?: string;
    quotaMb?: number;
  }): Promise<Mailbox>;
  deleteMailbox(projectId: string, mailboxId: string): Promise<unknown>;
  listAliases(projectId: string): Promise<EmailAlias[]>;
  createAlias(projectId: string, data: {
    domain: string;
    localPart: string;
    targets: Array<{ type: 'mailbox' | 'external' | 'webhook'; mailboxId?: string; address?: string; url?: string }>;
    description?: string;
  }): Promise<EmailAlias>;
  deleteAlias(projectId: string, aliasId: string): Promise<unknown>;
  listMessages(
    projectId: string,
    params?: { mailboxId?: string; folder?: 'inbox' | 'sent' | 'drafts' | 'trash' | 'spam'; limit?: number; offset?: number; unread?: boolean },
  ): Promise<import('@fidscript-deploy/types').MailboxMessage[]>;
  getMessage(projectId: string, messageId: string): Promise<import('@fidscript-deploy/types').MailboxMessage>;
  markMessagesRead(projectId: string, messageIds: string[], isRead: boolean): Promise<{ updated: number }>;
  starMessage(projectId: string, messageId: string, starred: boolean): Promise<import('@fidscript-deploy/types').MailboxMessage>;
  deleteMessages(projectId: string, messageIds: string[]): Promise<{ deleted: number }>;
  listDomains(projectId: string): Promise<EmailDomain[]>;
  getDomain(projectId: string, domainId: string): Promise<unknown>;
  createDomain(projectId: string, domain: string): Promise<unknown>;
  verifyDomain(projectId: string, domainId: string): Promise<unknown>;
  deleteDomain(projectId: string, domainId: string): Promise<void>;
  getCatchAll(projectId: string, domainId: string): Promise<unknown>;
  setCatchAll(projectId: string, domainId: string, target: unknown): Promise<{ ok: boolean }>;
  deleteCatchAll(projectId: string, domainId: string): Promise<{ deleted: boolean }>;
  getMessageStatus(projectId: string, messageId: string): Promise<unknown>;
}

export function applyMailboxesMethods(host: EmailMailboxesHost): void {
  const client = host.client;

  host.send = (projectId, data) =>
    client.post<{ messageId: string; accepted: string[]; status: string; error?: string }>(`/api/v1/projects/${projectId}/email/send`, data);

  host.listMailboxes = async (projectId) => {
    const res = await client.get<{ mailboxes: Mailbox[] }>(`/api/v1/projects/${projectId}/email/mailboxes`);
    return res.mailboxes;
  };

  host.createMailbox = (projectId, data) =>
    client.post<Mailbox>(`/api/v1/projects/${projectId}/email/mailboxes`, data);

  host.deleteMailbox = (projectId, mailboxId) =>
    client.delete(`/api/v1/projects/${projectId}/email/mailboxes/${mailboxId}`);

  host.listAliases = async (projectId) => {
    const res = await client.get<{ aliases: EmailAlias[] }>(`/api/v1/projects/${projectId}/email/aliases`);
    return res.aliases;
  };

  host.createAlias = (projectId, data) =>
    client.post<EmailAlias>(`/api/v1/projects/${projectId}/email/aliases`, data);

  host.deleteAlias = (projectId, aliasId) =>
    client.delete(`/api/v1/projects/${projectId}/email/aliases/${aliasId}`);

  host.listMessages = (projectId, params = {}) =>
    client.get(`/api/v1/projects/${projectId}/email/messages`, params);

  host.getMessage = (projectId, messageId) =>
    client.get(`/api/v1/projects/${projectId}/email/messages/${messageId}`);

  host.markMessagesRead = (projectId, messageIds, isRead) =>
    client.patch(`/api/v1/projects/${projectId}/email/messages/read`, { messageIds, isRead });

  host.starMessage = (projectId, messageId, starred) =>
    client.patch(`/api/v1/projects/${projectId}/email/messages/${messageId}/star?starred=${starred}`);

  host.deleteMessages = (projectId, messageIds) =>
    client.delete(`/api/v1/projects/${projectId}/email/messages`, { messageIds });

  host.listDomains = async (projectId) => {
    const res = await client.get<{ domains: EmailDomain[] }>(`/api/v1/projects/${projectId}/email/domains`);
    return res.domains ?? [];
  };

  host.getDomain = (projectId, domainId) =>
    client.get(`/api/v1/projects/${projectId}/email/domains/${domainId}`);

  host.createDomain = (projectId, domain) =>
    client.post(`/api/v1/projects/${projectId}/email/domains`, { domain });

  host.verifyDomain = (projectId, domainId) =>
    client.post(`/api/v1/projects/${projectId}/email/domains/${domainId}/verify`);

  host.deleteDomain = (projectId, domainId) =>
    client.delete(`/api/v1/projects/${projectId}/email/domains/${domainId}`);

  host.getCatchAll = (projectId, domainId) =>
    client.get(`/api/v1/projects/${projectId}/email/domains/${domainId}/catch-all`);

  host.setCatchAll = (projectId, domainId, target) =>
    client.post(`/api/v1/projects/${projectId}/email/domains/${domainId}/catch-all`, target);

  host.deleteCatchAll = (projectId, domainId) =>
    client.delete(`/api/v1/projects/${projectId}/email/domains/${domainId}/catch-all`);

  host.getMessageStatus = (projectId, messageId) =>
    client.get(`/api/v1/projects/${projectId}/email/messages/${messageId}/status`);
}