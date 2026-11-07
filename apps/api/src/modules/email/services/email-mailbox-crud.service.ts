import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';

@Injectable()
export class EmailMailboxListService {
  constructor(private prisma: PrismaService) {}

  async listMailboxes(projectId: string, domainId?: string) {
    const domains = domainId
      ? [await this.prisma.emailDomain.findFirst({ where: { id: domainId, projectId } })]
      : await this.prisma.emailDomain.findMany({ where: { projectId } });

    const domainIds = domains.filter(Boolean).map((d) => d!.id);
    return this.prisma.emailMailbox.findMany({
      where: { domainId: { in: domainIds } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getMailbox(projectId: string, mailboxId: string) {
    const mailbox = await this.prisma.emailMailbox.findFirst({
      where: { id: mailboxId },
      include: { domain: { select: { domain: true, projectId: true } } },
    });
    if (!mailbox || mailbox.domain.projectId !== projectId) {
      throw new NotFoundException('Mailbox not found');
    }
    return mailbox;
  }
}
