import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { EventService } from '@/modules/events/event.service';
import { StalwartAccountService } from '@/modules/email/stalwart/stalwart-account.service';

/**
 * Mailbox cleanup operations: delete mailbox + Stalwart account teardown.
 */
@Injectable()
export class MailboxCleanupService {
  constructor(
    private prisma: PrismaService,
    private eventService: EventService,
    private stalwartAccount: StalwartAccountService,
  ) {}

  async deleteMailbox(projectId: string, mailboxId: string) {
    const mailbox = await this.prisma.emailMailbox.findFirst({
      where: { id: mailboxId },
      include: { domain: { select: { domain: true, projectId: true } } },
    });
    if (!mailbox || mailbox.domain.projectId !== projectId) {
      throw new NotFoundException('Mailbox not found');
    }

    if (mailbox.stalwartAccountId) {
      try {
        await this.stalwartAccount.deleteAccount(mailbox.stalwartAccountId);
      } catch (err) {
        // Non-fatal — account may already be gone in Stalwart
      }
    }

    await this.prisma.emailMailbox.delete({ where: { id: mailboxId } });
    await this.eventService.emit('email.mailbox_deleted', { mailboxId, projectId });

    return { deleted: true };
  }
}
