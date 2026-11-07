/**
 * Email sync message store — Prisma upsert for `emailMessage` rows keyed
 * on the JMAP blob id. Extracted from EmailSyncEmailMapperService to keep
 * the mapper under the 150-line ANPAS limit.
 */
import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { EmailStatus } from '@prisma/client';
import { MappedEmail } from './email-sync-email-mapper.service';

export interface UpsertedMessage {
  id: string;
  preview: string;
  receivedAt: string;
  isRead: boolean;
  isStarred: boolean;
  isDraft: boolean;
}

@Injectable()
export class EmailSyncMessageStoreService {
  constructor(private prisma: PrismaService) {}

  async upsertMessage(args: {
    blobId: string;
    mapped: MappedEmail;
    mailboxId: string;
    projectId: string;
  }): Promise<UpsertedMessage> {
    const { blobId, mapped, mailboxId, projectId } = args;
    await this.prisma.emailMessage.upsert({
      where: { id: blobId },
      create: {
        id: blobId, mailboxId, projectId,
        from: mapped.from, to: mapped.to, subject: mapped.subject,
        textBody: mapped.textBody, htmlBody: mapped.htmlBody,
        sizeBytes: BigInt(mapped.sizeBytes),
        isRead: mapped.isRead, isStarred: mapped.isStarred, isDraft: mapped.isDraft,
        jmapMessageId: mapped.jmapMessageId || null,
        receivedAt: new Date(mapped.receivedAt),
        status: EmailStatus.RECEIVED,
      },
      update: {
        from: mapped.from, to: mapped.to, subject: mapped.subject,
        textBody: mapped.textBody, htmlBody: mapped.htmlBody,
        sizeBytes: BigInt(mapped.sizeBytes),
        isRead: mapped.isRead, isStarred: mapped.isStarred, isDraft: mapped.isDraft,
        jmapMessageId: mapped.jmapMessageId || null,
      },
    });
    return {
      id: blobId,
      preview: mapped.textBody.slice(0, 200),
      receivedAt: mapped.receivedAt,
      isRead: mapped.isRead,
      isStarred: mapped.isStarred,
      isDraft: mapped.isDraft,
    };
  }
}
