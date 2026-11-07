/**
 * Platform-mailbox message action operations — mutating operations against
 * Stalwart JMAP (set keywords, move, delete, download attachments).
 *
 * Auth: per-mailbox Stalwart credentials (see EmailBootstrapService).
 *
 * Distinct from `PlatformMailboxMessageQueryService` (read-only).
 */
import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PlatformMailboxJmapClientService } from './platform-mailbox-jmap-client.service';
import { JmapAttachment, PlatformFolder } from './platform-mailbox-message.types';

@Injectable()
export class PlatformMailboxMessageActionService {
  private readonly logger = new Logger(PlatformMailboxMessageActionService.name);

  constructor(private readonly jmapClient: PlatformMailboxJmapClientService) {}

  /** Mark a message read or unread. */
  async setRead(mailboxLocalPart: string, messageId: string, isRead: boolean): Promise<void> {
    const { client, accountId } = await this.jmapClient.clientFor(mailboxLocalPart);
    await this.jmapClient.call(
      client,
      'Email/set',
      { accountId, update: { [messageId]: { keywords: { $seen: isRead, $unread: !isRead } } } },
      ['urn:ietf:params:jmap:core', 'urn:ietf:params:jmap:mail'],
    );
  }

  /** Star/unstar a message. */
  async setStarred(mailboxLocalPart: string, messageId: string, starred: boolean): Promise<void> {
    const { client, accountId } = await this.jmapClient.clientFor(mailboxLocalPart);
    await this.jmapClient.call(
      client,
      'Email/set',
      { accountId, update: { [messageId]: { keywords: { $flagged: starred } } } },
      ['urn:ietf:params:jmap:core', 'urn:ietf:params:jmap:mail'],
    );
  }

  /** Move a message to a folder (inbox / trash / junk / archive). */
  async moveTo(
    mailboxLocalPart: string,
    messageId: string,
    folder: 'inbox' | 'trash' | 'junk' | 'archive',
  ): Promise<void> {
    const { client, accountId } = await this.jmapClient.clientFor(mailboxLocalPart);
    const mbRes = await this.jmapClient.call<{
      list: Array<{ id: string; role: string | null }>;
    }>(client, 'Mailbox/get', { accountId, ids: null }, [
      'urn:ietf:params:jmap:core',
      'urn:ietf:params:jmap:mail',
    ]);
    const target = (mbRes.list ?? []).find((m) => (m.role ?? '').toLowerCase() === folder);
    if (!target) throw new NotFoundException(`Folder ${folder} not found`);
    await this.jmapClient.call(
      client,
      'Email/set',
      { accountId, update: { [messageId]: { mailboxIds: { [target.id]: true } } } },
      ['urn:ietf:params:jmap:core', 'urn:ietf:params:jmap:mail'],
    );
  }

  /**
   * Download a single attachment's bytes from Stalwart via JMAP Blob/get
   * (RFC 8620 §4.2). Bytes are returned as a Buffer (decoded from base64).
   */
  async downloadAttachment(
    mailboxLocalPart: string,
    messageId: string,
    blobId: string,
  ): Promise<{ bytes: Buffer; type: string; name?: string; size: number }> {
    const { client, accountId } = await this.jmapClient.clientFor(mailboxLocalPart);

    const blobData = await this.jmapClient.call<{
      list: Array<{ id: string; data?: string; size?: number }>;
    }>(client, 'Blob/get', { accountId, ids: [blobId], properties: ['data'] }, [
      'urn:ietf:params:jmap:core',
    ]);
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

  /** Delete a message permanently. */
  async delete(mailboxLocalPart: string, messageId: string): Promise<void> {
    const { client, accountId } = await this.jmapClient.clientFor(mailboxLocalPart);
    await this.jmapClient.call(
      client,
      'Email/set',
      { accountId, destroy: [messageId] },
      ['urn:ietf:params:jmap:core', 'urn:ietf:params:jmap:mail'],
    );
  }

  /** List attachments (read of message metadata only). */
  async listAttachments(mailboxLocalPart: string, messageId: string): Promise<JmapAttachment[]> {
    const { client, accountId } = await this.jmapClient.clientFor(mailboxLocalPart);
    const fetched = await this.jmapClient.call<{
      list: Array<{ id: string; hasAttachment?: boolean; attachments?: JmapAttachment[] }>;
    }>(
      client,
      'Email/get',
      { accountId, ids: [messageId], properties: ['id', 'hasAttachment', 'attachments'] },
      ['urn:ietf:params:jmap:core', 'urn:ietf:params:jmap:mail'],
    );
    const m = (fetched.list ?? [])[0];
    if (!m) throw new NotFoundException(`Message ${messageId} not found in ${mailboxLocalPart}`);
    return m.attachments ?? [];
  }
}
