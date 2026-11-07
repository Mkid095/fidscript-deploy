/**
 * Platform-mailbox message mapping helpers — pure functions that take raw
 * JMAP response shapes and produce our `PlatformMessage` DTOs. Extracted
 * from PlatformMailboxMessageQueryService to keep the orchestration file
 * under the 150-line ANPAS limit.
 */
import { Injectable } from '@nestjs/common';
import { PlatformMessage, JmapAttachment, PlatformFolder } from './platform-mailbox-message.types';

interface JmapAddress {
  name?: string;
  email: string;
}
interface JmapMailbox {
  id: string;
  name: string;
  role: string | null;
}
interface JmapEmailSummary {
  id: string;
  from?: JmapAddress;
  to?: JmapAddress[];
  cc?: JmapAddress[];
  subject?: string;
  preview?: string;
  receivedAt?: string;
  sentAt?: string;
  keywords?: Record<string, boolean>;
  mailboxIds?: Record<string, boolean>;
  hasAttachment?: boolean;
  size?: number;
  attachments?: JmapAttachment[];
}
interface JmapEmailDetail extends JmapEmailSummary {
  bodyValues?: Record<string, { value: string; isEncodingProblem?: boolean; isTruncated?: boolean }>;
}

@Injectable()
export class PlatformMailboxMessageQueryHelpers {
  /** Map a folder-listing JMAP email to our `PlatformMessage` DTO. */
  mapFolderMessage(
    m: JmapEmailSummary,
    mailboxLocalPart: string,
    mailboxes: JmapMailbox[],
  ): PlatformMessage {
    const mbId = Object.keys(m.mailboxIds ?? {}).find((k) => m.mailboxIds?.[k]);
    const mb = mbId ? mailboxes.find((x) => x.id === mbId) : undefined;
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
      folder: ((mb?.role ?? mb?.name ?? 'inbox').toLowerCase() as PlatformFolder),
      hasAttachments: !!m.hasAttachment,
      attachmentCount: (m.attachments ?? []).length,
      sizeBytes: m.size ?? 0,
    };
  }

  /** Map a JMAP email detail response to `PlatformMessage` + body. */
  mapDetailMessage(
    m: JmapEmailDetail,
    mailboxLocalPart: string,
    text: string | undefined,
    html: string | undefined,
  ): PlatformMessage & { bodyHtml?: string; bodyText?: string } {
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
      attachments: (m.attachments ?? []).map((a) => ({
        blobId: a.blobId, name: a.name, type: a.type, size: a.size, disposition: a.disposition,
      })),
      sizeBytes: m.size ?? 0,
      bodyText: text,
      bodyHtml: html,
    };
  }

  /** Extract text + html bodies from JMAP `bodyValues` (RFC 8621 §4.1.3). */
  extractBodies(bodyValues?: Record<string, { value: string; isEncodingProblem?: boolean; isTruncated?: boolean }>) {
    const text = Object.values(bodyValues ?? {}).find(
      (b) => typeof b.value === 'string' && !b.value.startsWith('<'),
    )?.value;
    const html = Object.values(bodyValues ?? {}).find(
      (b) => typeof b.value === 'string' && b.value.startsWith('<'),
    )?.value;
    return { text, html };
  }
}
