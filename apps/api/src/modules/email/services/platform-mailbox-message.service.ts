/**
 * Platform-mailbox message operations.
 *
 * Distinct from `EmailMessageService` (which is project-scoped — it tracks
 * emails SENT through the platform's `Email/send` endpoint, persisted in
 * `email.messages`). This service is for managing the messages that live
 * inside the platform's own mailboxes (alert@, noreply@, postmaster@,
 * and any custom mailbox on the PLATFORM_DOMAIN) — they live in Stalwart,
 * not in the platform DB.
 *
 * Why a separate service:
 *   - The platform's outbound system mail (magic codes, alerts) is sent
 *     from these mailboxes. Operators need to see what was sent and
 *     what came back (bounces, replies, inbound alerts).
 *   - Project mailboxes (created by tenants) get their own UI later;
 *     this is the platform-admin view of the platform's own mail.
 *   - Project messages are rows in `email.messages`; platform messages
 *     are JMAP objects in Stalwart. Two different storage backends =
 *     two different services.
 *
 * Auth model: every operation needs the LOCAL PART of the mailbox (we
 * resolve the Stalwart accountId + credentials from the platform DB /
 * env), then we authenticate to Stalwart as that mailbox and run JMAP
 * calls against its data.
 */
import { Injectable, Logger, NotFoundException, Inject } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AxiosInstance } from 'axios';
import * as http from 'http';
import { IEmailProvider, EMAIL_PROVIDER, ProviderMessage } from '@/modules/email/providers/i-email-provider';
import { basicAuthHeader } from '@/common/basic-auth';

export interface PlatformMessage {
  id: string;
  mailbox: string;
  from: string;
  fromName?: string;
  to: string[];
  cc?: string[];
  subject: string;
  preview: string;
  receivedAt: string;
  sentAt?: string;
  isRead: boolean;
  isStarred: boolean;
  folder: 'inbox' | 'sent' | 'drafts' | 'trash' | 'junk' | 'archive';
  hasAttachments: boolean;
  attachmentCount: number;
  sizeBytes: number;
  /** Attachment metadata — populated on the message detail view (get()). */
  attachments?: JmapAttachment[];
}

/**
 * JMAP Email Body Part (RFC 8621 §4.1.3) — describes a single attachment on
 * a message. The `blobId` is the key to feed into Blob/get to download bytes.
 */
export interface JmapAttachment {
  blobId: string;
  type: string;
  name?: string;
  size: number;
  charset?: string;
  cid?: string;        // content-id for inline (embedded) images
  disposition?: string; // "attachment" | "inline"
  partId?: string;
}

@Injectable()
export class PlatformMailboxMessageService {
  private readonly logger = new Logger(PlatformMailboxMessageService.name);
  private readonly smtpPassword: string;

  constructor(
    private config: ConfigService,
    @Inject(EMAIL_PROVIDER) private readonly email: IEmailProvider,
  ) {
    this.smtpPassword = this.config.get<string>('SYSTEM_MAILBOX_PASSWORD', '');
  }

  /**
   * Authenticate to Stalwart as a specific platform mailbox and return an
   * axios client + that mailbox's accountId. Each platform mailbox has its
   * own credentials (see EmailBootstrapService), so we can't share the
   * admin's JMAP session.
   */
  private async clientFor(mailboxLocalPartOrEmail: string): Promise<{ client: AxiosInstance; accountId: string }> {
    const jmapUrl = this.config.get<string>('STALWART_JMAP_URL', 'http://fidscript_stalwart:8080').replace(/\/+$/, '');
    const domain = this.config.get<string>('PLATFORM_DOMAIN', 'deploy.fidscript.com');
    // Accept either "alert" or "alert@deploy.fidscript.com" — strip the domain if present
    const localPart = mailboxLocalPartOrEmail.includes('@')
      ? mailboxLocalPartOrEmail.split('@')[0]
      : mailboxLocalPartOrEmail;
    const user = `${localPart}@${domain}`;
    const pass = this.smtpPassword;
    const creds = basicAuthHeader(user, pass);

    // 1. Hit /jmap/session to get the accountId
    const session = await new Promise<{ primaryAccounts: Record<string, string>; accounts: Record<string, unknown> }>(
      (resolve, reject) => {
        const req = http.request(
          {
            host: jmapUrl.replace(/^https?:\/\//, '').split(':')[0],
            port: 8080,
            path: '/jmap/session',
            method: 'GET',
            headers: { authorization: `Basic ${creds}` },
          },
          (res) => {
            let d = '';
            res.on('data', (c) => (d += c));
            res.on('end', () => {
              if (res.statusCode !== 200) return reject(new Error(`JMAP session: ${res.statusCode} ${d}`));
              try { resolve(JSON.parse(d)); } catch (e) { reject(e); }
            });
          },
        );
        req.on('error', reject);
        req.end();
      },
    );
    const accountId = session.primaryAccounts?.['urn:ietf:params:jmap:mail'] ?? Object.keys(session.accounts)[0];
    if (!accountId) throw new NotFoundException(`No JMAP account for ${user}`);

    // 2. Lazy-import axios for the JMAP client
    const axios = require('axios') as typeof import('axios');
    const client = axios.create({
      baseURL: `${jmapUrl}/jmap`,
      headers: {
        'Content-Type': 'application/json',
        authorization: `Basic ${creds}`,
      },
      timeout: 15000,
    });
    return { client, accountId };
  }

  /**
   * List messages in a platform mailbox's folder.
   */
  async list(
    mailboxLocalPart: string,
    folder: 'inbox' | 'sent' | 'drafts' | 'trash' | 'junk' | 'archive' = 'inbox',
    opts: { limit?: number; offset?: number; unreadOnly?: boolean } = {},
  ): Promise<{ messages: PlatformMessage[]; total: number }> {
    const { client, accountId } = await this.clientFor(mailboxLocalPart);

    // Resolve folder → mailbox id (JMAP's Mailbox/get returns role-keyed folders)
    const mbRes = await this.call<{ list: Array<{ id: string; name: string; role: string | null }> }>(
      client,
      'Mailbox/get',
      { accountId, ids: null },
      ['urn:ietf:params:jmap:core', 'urn:ietf:params:jmap:mail'],
    );
    const target = (mbRes.list ?? []).find((m) => (m.role ?? '').toLowerCase() === folder);
    if (!target) return { messages: [], total: 0 };

    // Query the email ids
    const filter: Record<string, unknown> = { inMailbox: target.id };
    if (opts.unreadOnly) filter.unread = true;
    const queryRes = await this.call<{ ids: string[]; total: number }>(
      client,
      'Email/query',
      { accountId, filter, limit: opts.limit ?? 50, position: opts.offset ?? 0, sort: [{ property: 'receivedAt', isAscending: false }] },
      ['urn:ietf:params:jmap:core', 'urn:ietf:params:jmap:mail'],
    );
    if (!queryRes.ids?.length) return { messages: [], total: queryRes.total ?? 0 };

    // Hydrate the message metadata
    const fetched = await this.call<{
      list: Array<{
        id: string;
        from?: { name?: string; email: string };
        to?: Array<{ name?: string; email: string }>;
        cc?: Array<{ name?: string; email: string }>;
        subject?: string;
        preview?: string;
        receivedAt?: string;
        sentAt?: string;
        keywords?: Record<string, boolean>;
        mailboxIds?: Record<string, boolean>;
        hasAttachment?: boolean;
        size?: number;
        attachments?: JmapAttachment[];
      }>;
    }>(
      client,
      'Email/get',
      {
        accountId,
        ids: queryRes.ids,
        properties: [
          'id', 'from', 'to', 'cc', 'subject', 'preview', 'receivedAt', 'sentAt',
          'keywords', 'mailboxIds', 'hasAttachment', 'attachments', 'size',
        ],
      },
      ['urn:ietf:params:jmap:core', 'urn:ietf:params:jmap:mail'],
    );

    const messages: PlatformMessage[] = (fetched.list ?? []).map((m) => {
      // Resolve folder name from the first true mailbox id
      const mbId = Object.keys(m.mailboxIds ?? {}).find((k) => m.mailboxIds?.[k]);
      const mb = mbId ? (mbRes.list ?? []).find((x) => x.id === mbId) : undefined;
      return {
        id: m.id,
        mailbox: mailboxLocalPart,
        from: m.from?.email ?? '',
        fromName: m.from?.name ?? undefined,
        to: (m.to ?? []).map((t) => t.email),
        cc: (m.cc ?? []).map((t) => t.email),
        subject: m.subject ?? '(no subject)',
        preview: m.preview ?? '',
        receivedAt: m.receivedAt ?? '',
        sentAt: m.sentAt ?? undefined,
        isRead: !m.keywords?.$unread,
        isStarred: !!m.keywords?.$flagged,
        folder: ((mb?.role ?? mb?.name ?? 'inbox').toLowerCase() as PlatformMessage['folder']),
        hasAttachments: !!m.hasAttachment,
        attachmentCount: (m.attachments ?? []).length,
        sizeBytes: m.size ?? 0,
      };
    });

    return { messages, total: queryRes.total ?? messages.length };
  }

  /**
   * Get a single message including its body (text + html).
   */
  async get(mailboxLocalPart: string, messageId: string): Promise<PlatformMessage & { bodyHtml?: string; bodyText?: string }> {
    const { client, accountId } = await this.clientFor(mailboxLocalPart);
    const fetched = await this.call<{
      list: Array<{
        id: string;
        from?: { name?: string; email: string };
        to?: Array<{ name?: string; email: string }>;
        cc?: Array<{ name?: string; email: string }>;
        subject?: string;
        preview?: string;
        receivedAt?: string;
        sentAt?: string;
        keywords?: Record<string, boolean>;
        mailboxIds?: Record<string, boolean>;
        hasAttachment?: boolean;
        size?: number;
        bodyValues?: Record<string, { value: string; isEncodingProblem?: boolean; isTruncated?: boolean }>;
        attachments?: JmapAttachment[];
      }>;
    }>(
      client,
      'Email/get',
      {
        accountId,
        ids: [messageId],
        properties: [
          'id', 'from', 'to', 'cc', 'subject', 'preview', 'receivedAt', 'sentAt',
          'keywords', 'mailboxIds', 'hasAttachment', 'attachments', 'size', 'bodyValues',
        ],
        fetchTextBodyValues: true,
        fetchHTMLBodyValues: true,
      },
      ['urn:ietf:params:jmap:core', 'urn:ietf:params:jmap:mail'],
    );
    const m = (fetched.list ?? [])[0];
    if (!m) throw new NotFoundException(`Message ${messageId} not found in ${mailboxLocalPart}`);

    const text = Object.values(m.bodyValues ?? {}).find((b) => typeof b.value === 'string' && !b.value.startsWith('<'))?.value;
    const html = Object.values(m.bodyValues ?? {}).find((b) => typeof b.value === 'string' && b.value.startsWith('<'))?.value;

    return {
      id: m.id,
      mailbox: mailboxLocalPart,
      from: m.from?.email ?? '',
      fromName: m.from?.name ?? undefined,
      to: (m.to ?? []).map((t) => t.email),
      cc: (m.cc ?? []).map((t) => t.email),
      subject: m.subject ?? '(no subject)',
      preview: m.preview ?? '',
      receivedAt: m.receivedAt ?? '',
      sentAt: m.sentAt ?? undefined,
      isRead: !m.keywords?.$unread,
      isStarred: !!m.keywords?.$flagged,
      folder: 'inbox',
      hasAttachments: !!m.hasAttachment,
      attachmentCount: (m.attachments ?? []).length,
      attachments: (m.attachments ?? []).map(a => ({
        blobId: a.blobId,
        name: a.name,
        type: a.type,
        size: a.size,
        disposition: a.disposition,
      })),
      sizeBytes: m.size ?? 0,
      bodyText: text,
      bodyHtml: html,
    };
  }

  /**
   * Mark a message read or unread.
   */
  async setRead(mailboxLocalPart: string, messageId: string, isRead: boolean): Promise<void> {
    const { client, accountId } = await this.clientFor(mailboxLocalPart);
    await this.call(
      client,
      'Email/set',
      {
        accountId,
        update: { [messageId]: { keywords: { $seen: isRead, $unread: !isRead } } },
      },
      ['urn:ietf:params:jmap:core', 'urn:ietf:params:jmap:mail'],
    );
  }

  /**
   * Star/unstar a message.
   */
  async setStarred(mailboxLocalPart: string, messageId: string, starred: boolean): Promise<void> {
    const { client, accountId } = await this.clientFor(mailboxLocalPart);
    await this.call(
      client,
      'Email/set',
      { accountId, update: { [messageId]: { keywords: { $flagged: starred } } } },
      ['urn:ietf:params:jmap:core', 'urn:ietf:params:jmap:mail'],
    );
  }

  /**
   * Move a message to a folder (inbox / trash / junk / archive).
   */
  async moveTo(mailboxLocalPart: string, messageId: string, folder: 'inbox' | 'trash' | 'junk' | 'archive'): Promise<void> {
    const { client, accountId } = await this.clientFor(mailboxLocalPart);
    const mbRes = await this.call<{ list: Array<{ id: string; role: string | null }> }>(
      client,
      'Mailbox/get',
      { accountId, ids: null },
      ['urn:ietf:params:jmap:core', 'urn:ietf:params:jmap:mail'],
    );
    const target = (mbRes.list ?? []).find((m) => (m.role ?? '').toLowerCase() === folder);
    if (!target) throw new NotFoundException(`Folder ${folder} not found`);
    await this.call(
      client,
      'Email/set',
      { accountId, update: { [messageId]: { mailboxIds: { [target.id]: true } } } },
      ['urn:ietf:params:jmap:core', 'urn:ietf:params:jmap:mail'],
    );
  }

  /**
   * List all attachments on a message.
   * @returns JmapAttachment[] — each has a blobId to feed into downloadAttachment().
   */
  async listAttachments(mailboxLocalPart: string, messageId: string): Promise<JmapAttachment[]> {
    const { client, accountId } = await this.clientFor(mailboxLocalPart);
    const fetched = await this.call<{
      list: Array<{ id: string; hasAttachment?: boolean; attachments?: JmapAttachment[] }>;
    }>(
      client,
      'Email/get',
      {
        accountId,
        ids: [messageId],
        properties: ['id', 'hasAttachment', 'attachments'],
      },
      ['urn:ietf:params:jmap:core', 'urn:ietf:params:jmap:mail'],
    );
    const m = (fetched.list ?? [])[0];
    if (!m) throw new NotFoundException(`Message ${messageId} not found in ${mailboxLocalPart}`);
    return m.attachments ?? [];
  }

  /**
   * Download a single attachment's bytes from Stalwart via JMAP Blob/get (RFC 8620 §4.2).
   * The bytes are returned as a Buffer (decoded from base64).
   */
  async downloadAttachment(
    mailboxLocalPart: string,
    messageId: string,
    blobId: string,
  ): Promise<{ bytes: Buffer; type: string; name?: string; size: number }> {
    const { client, accountId } = await this.clientFor(mailboxLocalPart);

    // Fetch blob bytes (base64-encoded inline in the response)
    const blobData = await this.call<{ list: Array<{ id: string; data?: string; size?: number }> }>(
      client,
      'Blob/get',
      { accountId, ids: [blobId], properties: ['data'] },
      ['urn:ietf:params:jmap:core'],
    );
    const blob = (blobData.list ?? [])[0];
    if (!blob || !blob.data) {
      throw new NotFoundException(`Blob ${blobId} not found or has no inline data`);
    }

    // Resolve human-readable metadata from the message's attachments list
    const atts = await this.listAttachments(mailboxLocalPart, messageId);
    const meta = atts.find((a) => a.blobId === blobId);

    return {
      bytes: Buffer.from(blob.data, 'base64'),
      type: meta?.type ?? 'application/octet-stream',
      name: meta?.name,
      size: meta?.size ?? blob.size ?? 0,
    };
  }

  /**
   * Delete a message permanently.
   */
  async delete(mailboxLocalPart: string, messageId: string): Promise<void> {
    const { client, accountId } = await this.clientFor(mailboxLocalPart);
    await this.call(
      client,
      'Email/set',
      { accountId, destroy: [messageId] },
      ['urn:ietf:params:jmap:core', 'urn:ietf:params:jmap:mail'],
    );
  }

  /**
   * Issue a JMAP call against a per-mailbox client.
   */
  private async call<T>(
    client: AxiosInstance,
    method: string,
    args: Record<string, unknown>,
    using: string[],
  ): Promise<T> {
    const response = await client.post<{ methodResponses: Array<[string, Record<string, unknown>, string]> }>(
      '',
      { using, methodCalls: [[method, args, '0']] },
    );
    const [name, result] = response.data.methodResponses[0];
    if (name !== method) {
      throw new Error(`JMAP method mismatch: expected ${method}, got ${name}`);
    }
    if ((result as { type?: string }).type === 'error') {
      const err = result as { type: string; description?: string };
      throw new Error(`JMAP ${method} error: ${err.description ?? err.type}`);
    }
    return result as T;
  }
}
