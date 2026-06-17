import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { SmtpSendService } from '@/modules/email/smtp/smtp-send.service';
import { ListMessagesDto } from '@/modules/email/dto/list-messages.dto';
import { MarkMessagesReadDto } from '@/modules/email/dto/mark-messages-read.dto';
import { DeleteMessagesDto } from '@/modules/email/dto/delete-messages.dto';
import { SendEmailDto } from '@/modules/email/dto/send-email.dto';

/**
 * Message metadata operations: list, get, mark read/starred, delete.
 * SMTP sending is handled by SmtpSendService.
 */
@Injectable()
export class EmailMessageService {
  constructor(
    private prisma: PrismaService,
    private smtpSend: SmtpSendService,
  ) {}

  sendEmail(projectId: string, dto: SendEmailDto) {
    return this.smtpSend.send(projectId, dto);
  }

  async listMessages(projectId: string, dto: ListMessagesDto) {
    const where: Record<string, unknown> = { projectId };
    if (dto.mailboxId) where.mailboxId = dto.mailboxId;
    if (dto.folder) {
      if (dto.folder === 'inbox') where.isDraft = false;
      else if (dto.folder === 'drafts') where.isDraft = true;
    }
    if (dto.unread !== undefined) where.isRead = !dto.unread;

    return this.prisma.emailMessage.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: dto.limit ?? 50,
      skip: dto.offset ?? 0,
    });
  }

  async getMessage(projectId: string, messageId: string) {
    const message = await this.prisma.emailMessage.findFirst({
      where: { id: messageId, projectId },
    });
    if (!message) throw new NotFoundException('Message not found');
    return message;
  }

  async markMessagesRead(projectId: string, dto: MarkMessagesReadDto) {
    await this.prisma.emailMessage.updateMany({
      where: { id: { in: dto.messageIds }, projectId },
      data: { isRead: dto.isRead },
    });
    return { updated: dto.messageIds.length };
  }

  async markMessageStarred(projectId: string, messageId: string, starred: boolean) {
    const message = await this.prisma.emailMessage.findFirst({ where: { id: messageId, projectId } });
    if (!message) throw new NotFoundException('Message not found');
    return this.prisma.emailMessage.update({ where: { id: messageId }, data: { isStarred: starred } });
  }

  async deleteMessages(projectId: string, dto: DeleteMessagesDto) {
    await this.prisma.emailMessage.deleteMany({
      where: { id: { in: dto.messageIds }, projectId },
    });
    return { deleted: dto.messageIds.length };
  }
}
