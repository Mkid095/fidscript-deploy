import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { EventService } from '@/modules/events/event.service';

/**
 * Handles bounce and complaint (FBL) webhook ingestion from Stalwart.
 * Both write to the suppression list rather than mutating sender identities.
 */
@Injectable()
export class BounceHandlerService {
  private readonly logger = new Logger(BounceHandlerService.name);

  constructor(
    private prisma: PrismaService,
    private eventService: EventService,
  ) {}

  async handleBounce(payload: { messageId: string; to: string; error: string; code?: string }) {
    const message = await this.prisma.emailMessage.findFirst({
      where: { OR: [{ id: payload.messageId }, { to: payload.to }] },
      orderBy: { createdAt: 'desc' },
    });

    if (!message) {
      this.logger.warn(`Bounce received for unknown message: ${payload.to}`);
      return { updated: false };
    }

    const isHardBounce =
      payload.code === '550' ||
      payload.error.includes('User unknown') ||
      payload.error.includes('mailbox not found');

    await this.prisma.emailMessage.update({
      where: { id: message.id },
      data: { status: 'BOUNCED', error: payload.error },
    });

    if (isHardBounce) {
      const [, domainName] = payload.to.split('@');
      const emailDomain = domainName
        ? await this.prisma.emailDomain.findFirst({ where: { domain: domainName } })
        : null;
      if (emailDomain) {
        await this.prisma.emailSuppression.upsert({
          where: {
            domainId_email: { domainId: emailDomain.id, email: payload.to.toLowerCase() },
          },
          create: { domainId: emailDomain.id, email: payload.to.toLowerCase(), reason: 'BOUNCE' },
          update: { reason: 'BOUNCE' },
        }).catch(() => {/* already suppressed */});
      }
    }

    await this.eventService.emit('email.bounced', {
      messageId: message.id,
      projectId: message.projectId,
      to: payload.to,
      error: payload.error,
      isHardBounce,
    });

    return { updated: true };
  }

  async handleComplaint(payload: { email: string; userAgent?: string }) {
    const [, domainName] = payload.email.split('@');
    if (!domainName) return { added: false };

    const emailDomain = await this.prisma.emailDomain.findFirst({ where: { domain: domainName } });
    if (!emailDomain) return { added: false };

    await this.prisma.emailSuppression.upsert({
      where: {
        domainId_email: { domainId: emailDomain.id, email: payload.email.toLowerCase() },
      },
      create: { domainId: emailDomain.id, email: payload.email.toLowerCase(), reason: 'COMPLAINT' },
      update: { reason: 'COMPLAINT' },
    }).catch(() => {/* already suppressed */});

    await this.eventService.emit('email.complained', {
      projectId: emailDomain.projectId,
      email: payload.email,
    });

    return { added: true };
  }
}
