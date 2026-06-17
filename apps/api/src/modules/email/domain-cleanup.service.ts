import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { EventService } from '../events/event.service';
import { StalwartAccountService } from './stalwart-account.service';

/**
 * Domain cleanup: deletes all mailboxes in Stalwart before removing the domain.
 */
@Injectable()
export class DomainCleanupService {
  private readonly logger = new Logger(DomainCleanupService.name);

  constructor(
    private prisma: PrismaService,
    private eventService: EventService,
    private stalwartAccount: StalwartAccountService,
  ) {}

  async deleteDomain(projectId: string, domainId: string) {
    const domain = await this.prisma.emailDomain.findFirst({
      where: { id: domainId, projectId },
      include: { mailboxes: true },
    });
    if (!domain) throw new NotFoundException('Domain not found');

    for (const mailbox of domain.mailboxes) {
      if (mailbox.stalwartAccountId) {
        try {
          await this.stalwartAccount.deleteAccount(mailbox.stalwartAccountId);
        } catch (err) {
          this.logger.warn(`Failed to delete Stalwart account: ${err}`);
        }
      }
    }

    await this.prisma.emailDomain.delete({ where: { id: domainId } });

    await this.eventService.emit('email.domain_deleted', {
      domainId,
      projectId,
      domain: domain.domain,
    });

    return { deleted: true };
  }
}
