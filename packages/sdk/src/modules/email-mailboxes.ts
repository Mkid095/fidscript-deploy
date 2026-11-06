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
  createDomain(projectId: string, domain: string): Promise<import('@fidscript-deploy/types').EmailDomainCreated>;
  verifyDomain(projectId: string, domainId: string): Promise<unknown>;
  deleteDomain(projectId: string, domainId: string): Promise<void>;
  getCatchAll(projectId: string, domainId: string): Promise<unknown>;
  setCatchAll(
    projectId: string,
    domainId: string,
    target:
      | { type: 'mailbox'; mailboxId: string }
      | { type: 'external'; address: string }
      | { type: 'webhook'; url: string },
  ): Promise<{ ok: boolean }>;
  deleteCatchAll(projectId: string, domainId: string): Promise<{ deleted: boolean }>;
  getMessageStatus(projectId: string, messageId: string): Promise<unknown>;
}

export function applyMailboxesMethods(host: EmailMailboxesHost): void {
  const client = host.client;

  host.send = (projectId, data) =>
    client.post<{ messageId: string; accepted: string[]; status: string; error?: string }>(`/api/v1/projects/${projectId}/email/send`, data);

  /**
   * The project's mailboxes.
   *
   * The API answers with the list itself — not wrapped in an object — and
   * the SDK unwrapped an object that never came, so every mailbox list came
   * back empty. The unwrapping now accepts either shape, so a change on
   * either side cannot empty a list silently again.
   */
  host.listMailboxes = async (projectId) => {
    const res = await client.get<Mailbox[] | { mailboxes: Mailbox[] }>(
      `/api/v1/projects/${projectId}/email/mailboxes`,
    );
    return Array.isArray(res) ? res : res.mailboxes ?? [];
  };

  host.createMailbox = (projectId, data) =>
    client.post<Mailbox>(`/api/v1/projects/${projectId}/email/mailboxes`, data);

  host.deleteMailbox = (projectId, mailboxId) =>
    client.delete(`/api/v1/projects/${projectId}/email/mailboxes/${mailboxId}`);

  /** The project's aliases — the list itself, or the object that carries it. */
  host.listAliases = async (projectId) => {
    const res = await client.get<EmailAlias[] | { aliases: EmailAlias[] }>(
      `/api/v1/projects/${projectId}/email/aliases`,
    );
    return Array.isArray(res) ? res : res.aliases ?? [];
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

  /**
   * The project's email domains.
   *
   * This is the list that was empty everywhere: the API answers with the
   * list itself and the SDK unwrapped an object that never came.
   */
  host.getCatchAll = (projectId, domainId) =>
    client.get(`/api/v1/projects/${projectId}/email/domains/${domainId}/catch-all`);

  host.setCatchAll = (projectId, domainId, target) =>
    client.post(`/api/v1/projects/${projectId}/email/domains/${domainId}/catch-all`, target);

  host.deleteCatchAll = (projectId, domainId) =>
    client.delete(`/api/v1/projects/${projectId}/email/domains/${domainId}/catch-all`);

  host.getMessageStatus = (projectId, messageId) =>
    client.get(`/api/v1/projects/${projectId}/email/messages/${messageId}/status`);
}