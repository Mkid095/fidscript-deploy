/**
 * Email sync email mapper — pure functions that map a raw JMAP Email/get
 * row to a `MappedEmail` and resolve the destination mailbox record. The
 * actual Prisma upsert lives in EmailSyncMessageStoreService.
 */
import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';

export interface EmailRow {
  id?: string;
  messageId?: string;
  from?: unknown;
  to?: unknown;
  cc?: unknown;
  bcc?: unknown;
  subject?: unknown;
  preview?: unknown;
  bodyValues?: unknown;
  textBody?: unknown;
  htmlBody?: unknown;
  attachments?: unknown;
  headers?: unknown;
  keywords?: unknown;
  size?: unknown;
  receivedAt?: unknown;
  mailboxIds?: unknown;
}

export interface MappedEmail {
  blobId: string;
  jmapMessageId: string;
  from: string;
  to: string;
  subject: string;
  textBody: string;
  htmlBody: string;
  sizeBytes: number;
  receivedAt: string;
  isDraft: boolean;
  isRead: boolean;
  isStarred: boolean;
}

@Injectable()
export class EmailSyncEmailMapperService {
  constructor(private prisma: PrismaService) {}

  /** Extract the canonical fields we need from a raw Email/get row. */
  mapEmailRow(email: EmailRow): MappedEmail | null {
    const blobId: string = email.id ?? '';
    if (!blobId) return null;
    const jmapMessageId: string = (email.messageId as string) ?? email.id ?? '';

    const rawFrom = Array.isArray(email.from) ? email.from[0] : email.from;
    const rawTo = Array.isArray(email.to) ? email.to[0] : email.to;
    const from: string = typeof rawFrom === 'string'
      ? rawFrom
      : (rawFrom as Record<string, string>)?.email ?? '';
    const to: string = typeof rawTo === 'string'
      ? rawTo
      : (rawTo as Record<string, string>)?.email ?? '';

    let textBody = '';
    let htmlBody = '';
    const bodyValues = email.bodyValues as Record<string, { value: string; type: string }> | undefined;
    if (bodyValues) {
      for (const part of Object.values(bodyValues)) {
        if (part.type === 'text/plain') textBody = part.value;
        else if (part.type === 'text/html') htmlBody = part.value;
      }
    }
    if (!textBody && typeof email.textBody === 'string') textBody = email.textBody;
    if (!htmlBody && typeof email.htmlBody === 'string') htmlBody = email.htmlBody;

    const subject: string = (email.subject as string) ?? '';
    const sizeBytes: number = typeof email.size === 'number' ? email.size : 0;
    const receivedAt: string = (email.receivedAt as string) ?? new Date().toISOString();
    const keywords: Record<string, boolean> = (email.keywords as Record<string, boolean>) ?? {};

    return {
      blobId, jmapMessageId, from, to, subject,
      textBody: textBody.slice(0, 100_000),
      htmlBody: htmlBody.slice(0, 200_000),
      sizeBytes, receivedAt,
      isDraft: keywords['$draft'] ?? false,
      isRead: keywords['$seen'] ?? false,
      isStarred: keywords['$flagged'] ?? false,
    };
  }

  /**
   * Resolve which EmailMailbox row received this email.
   */
  async resolveMailbox(
    accountId: string,
    email: EmailRow,
  ): Promise<{ id: string; localPart: string; domainId: string; projectId: string } | null> {
    const mailboxIds: string[] = Array.isArray(email.mailboxIds)
      ? (email.mailboxIds as string[])
      : Object.keys(email.mailboxIds as Record<string, boolean>);

    for (const mboxId of mailboxIds) {
      const mbox = await this.prisma.emailMailbox.findFirst({
        where: { stalwartAccountId: accountId, id: mboxId },
        include: { domain: true },
      });
      if (mbox) {
        return {
          id: mbox.id, localPart: mbox.localPart, domainId: mbox.domainId, projectId: mbox.domain.projectId,
        };
      }
    }
    const fallback = await this.prisma.emailMailbox.findFirst({
      where: { stalwartAccountId: accountId },
      include: { domain: true },
    });
    if (fallback) {
      return {
        id: fallback.id, localPart: fallback.localPart,
        domainId: fallback.domainId, projectId: fallback.domain.projectId,
      };
    }
    return null;
  }
}
