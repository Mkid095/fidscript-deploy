/**
 * Platform-mailbox message operations — facade.
 *
 * Distinct from `EmailMessageService` (which is project-scoped — it tracks
 * emails SENT through the platform's `Email/send` endpoint, persisted in
 * `email.messages`). This service is for managing the messages that live
 * inside the platform's own mailboxes (alert@, noreply@, postmaster@,
 * and any custom mailbox on the PLATFORM_DOMAIN) — they live in Stalwart,
 * not in the platform DB.
 *
 * Split into:
 *   - PlatformMailboxJmapClientService — shared JMAP client/auth factory
 *   - PlatformMailboxMessageQueryService — list / get / listAttachments (read)
 *   - PlatformMailboxMessageActionService — set read/starred/move/delete/download (write)
 *
 * The platform-mailbox message controllers depend on this facade (re-export
 * via `import { PlatformMailboxMessageService } from './platform-mailbox-message.service';`)
 * which still exposes the same public surface as before the split.
 */
import { Injectable } from '@nestjs/common';
import { PlatformMailboxMessageQueryService } from './platform-mailbox-message-query.service';
import { PlatformMailboxMessageActionService } from './platform-mailbox-message-action.service';
import {
  PlatformMessage,
  JmapAttachment,
  PlatformFolder,
} from './platform-mailbox-message.types';

@Injectable()
export class PlatformMailboxMessageService {
  constructor(
    private readonly query: PlatformMailboxMessageQueryService,
    private readonly action: PlatformMailboxMessageActionService,
  ) {}

  // ─── Query (read) ──────────────────────────────────────────────────────

  list(
    mailboxLocalPart: string,
    folder: PlatformFolder = 'inbox',
    opts: { limit?: number; offset?: number; unreadOnly?: boolean } = {},
  ): Promise<{ messages: PlatformMessage[]; total: number }> {
    return this.query.list(mailboxLocalPart, folder, opts);
  }

  get(
    mailboxLocalPart: string,
    messageId: string,
  ): Promise<PlatformMessage & { bodyHtml?: string; bodyText?: string }> {
    return this.query.get(mailboxLocalPart, messageId);
  }

  listAttachments(mailboxLocalPart: string, messageId: string): Promise<JmapAttachment[]> {
    return this.action.listAttachments(mailboxLocalPart, messageId);
  }

  // ─── Action (write) ────────────────────────────────────────────────────

  setRead(mailboxLocalPart: string, messageId: string, isRead: boolean): Promise<void> {
    return this.action.setRead(mailboxLocalPart, messageId, isRead);
  }

  setStarred(mailboxLocalPart: string, messageId: string, starred: boolean): Promise<void> {
    return this.action.setStarred(mailboxLocalPart, messageId, starred);
  }

  moveTo(
    mailboxLocalPart: string,
    messageId: string,
    folder: 'inbox' | 'trash' | 'junk' | 'archive',
  ): Promise<void> {
    return this.action.moveTo(mailboxLocalPart, messageId, folder);
  }

  delete(mailboxLocalPart: string, messageId: string): Promise<void> {
    return this.action.delete(mailboxLocalPart, messageId);
  }

  downloadAttachment(
    mailboxLocalPart: string,
    messageId: string,
    blobId: string,
  ): Promise<{ bytes: Buffer; type: string; name?: string; size: number }> {
    return this.action.downloadAttachment(mailboxLocalPart, messageId, blobId);
  }
}

// Re-export types so existing consumers keep their import paths.
export { PlatformMessage, JmapAttachment, PlatformFolder } from './platform-mailbox-message.types';
