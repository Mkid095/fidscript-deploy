/**
 * Platform-mailbox message query — JMAP folder + message reads.
 * Listing is large because of the JMAP filter/sort/hydrate dance, so the
 * pure helpers (folder lookup + message mapping) live in
 * PlatformMailboxMessageQueryHelpers.
 */
import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PlatformMailboxJmapClientService } from './platform-mailbox-jmap-client.service';
import { PlatformMailboxMessageQueryHelpers } from './platform-mailbox-message-query.helpers';
import { PlatformMessage, JmapAttachment, PlatformFolder } from './platform-mailbox-message.types';

@Injectable()
export class PlatformMailboxMessageQueryService {
  private readonly logger = new Logger(PlatformMailboxMessageQueryService.name);

  constructor(
    private readonly jmapClient: PlatformMailboxJmapClientService,
    private readonly helpers: PlatformMailboxMessageQueryHelpers,
  ) {}

  async list(
    mailboxLocalPart: string,
    folder: PlatformFolder = 'inbox',
    opts: { limit?: number; offset?: number; unreadOnly?: boolean } = {},
  ): Promise<{ messages: PlatformMessage[]; total: number }> {
    const { client, accountId } = await this.jmapClient.clientFor(mailboxLocalPart);

    const mbRes = await this.jmapClient.call<{
      list: Array<{ id: string; name: string; role: string | null }>;
    }>(client, 'Mailbox/get', { accountId, ids: null }, [
      'urn:ietf:params:jmap:core', 'urn:ietf:params:jmap:mail',
    ]);
    const target = (mbRes.list ?? []).find((m) => (m.role ?? '').toLowerCase() === folder);
    if (!target) return { messages: [], total: 0 };

    const filter: Record<string, unknown> = { inMailbox: target.id };
    if (opts.unreadOnly) filter.unread = true;
    const queryRes = await this.jmapClient.call<{ ids: string[]; total: number }>(
      client, 'Email/query', {
        accountId, filter,
        limit: opts.limit ?? 50, position: opts.offset ?? 0,
        sort: [{ property: 'receivedAt', isAscending: false }],
      }, ['urn:ietf:params:jmap:core', 'urn:ietf:params:jmap:mail'],
    );
    if (!queryRes.ids?.length) return { messages: [], total: queryRes.total ?? 0 };

    const fetched = await this.jmapClient.call<{
      list: Array<{
        id: string; from?: { name?: string; email: string };
        to?: Array<{ name?: string; email: string }>;
        cc?: Array<{ name?: string; email: string }>;
        subject?: string; preview?: string; receivedAt?: string; sentAt?: string;
        keywords?: Record<string, boolean>;
        mailboxIds?: Record<string, boolean>;
        hasAttachment?: boolean; size?: number; attachments?: JmapAttachment[];
      }>;
    }>(client, 'Email/get', {
      accountId, ids: queryRes.ids,
      properties: [
        'id', 'from', 'to', 'cc', 'subject', 'preview', 'receivedAt', 'sentAt',
        'keywords', 'mailboxIds', 'hasAttachment', 'attachments', 'size',
      ],
    }, ['urn:ietf:params:jmap:core', 'urn:ietf:params:jmap:mail']);

    const messages = (fetched.list ?? []).map((m) =>
      this.helpers.mapFolderMessage(m, mailboxLocalPart, mbRes.list ?? []),
    );
    return { messages, total: queryRes.total ?? messages.length };
  }

  async get(
    mailboxLocalPart: string,
    messageId: string,
  ): Promise<PlatformMessage & { bodyHtml?: string; bodyText?: string }> {
    const { client, accountId } = await this.jmapClient.clientFor(mailboxLocalPart);
    const fetched = await this.jmapClient.call<{
      list: Array<{
        id: string; from?: { name?: string; email: string };
        to?: Array<{ name?: string; email: string }>;
        cc?: Array<{ name?: string; email: string }>;
        subject?: string; preview?: string; receivedAt?: string; sentAt?: string;
        keywords?: Record<string, boolean>;
        mailboxIds?: Record<string, boolean>;
        hasAttachment?: boolean; size?: number;
        bodyValues?: Record<string, { value: string; isEncodingProblem?: boolean; isTruncated?: boolean }>;
        attachments?: JmapAttachment[];
      }>;
    }>(client, 'Email/get', {
      accountId, ids: [messageId],
      properties: [
        'id', 'from', 'to', 'cc', 'subject', 'preview', 'receivedAt', 'sentAt',
        'keywords', 'mailboxIds', 'hasAttachment', 'attachments', 'size', 'bodyValues',
      ],
      fetchTextBodyValues: true, fetchHTMLBodyValues: true,
    }, ['urn:ietf:params:jmap:core', 'urn:ietf:params:jmap:mail']);

    const m = (fetched.list ?? [])[0];
    if (!m) throw new NotFoundException(`Message ${messageId} not found in ${mailboxLocalPart}`);

    const { text, html } = this.helpers.extractBodies(m.bodyValues);
    return this.helpers.mapDetailMessage(m, mailboxLocalPart, text, html);
  }

  async listAttachments(mailboxLocalPart: string, messageId: string): Promise<JmapAttachment[]> {
    const { client, accountId } = await this.jmapClient.clientFor(mailboxLocalPart);
    const fetched = await this.jmapClient.call<{
      list: Array<{ id: string; hasAttachment?: boolean; attachments?: JmapAttachment[] }>;
    }>(client, 'Email/get', {
      accountId, ids: [messageId], properties: ['id', 'hasAttachment', 'attachments'],
    }, ['urn:ietf:params:jmap:core', 'urn:ietf:params:jmap:mail']);
    const m = (fetched.list ?? [])[0];
    if (!m) throw new NotFoundException(`Message ${messageId} not found in ${mailboxLocalPart}`);
    return m.attachments ?? [];
  }
}
