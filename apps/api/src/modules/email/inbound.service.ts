import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { EventService } from '../events/event.service';
import { WebhookService } from './webhook.service';
import { BounceHandlerService } from './bounce-handler.service';

/**
 * Inbound email ingestion: receives mail from Stalwart sieve notify,
 * creates metadata rows, fires webhooks, manages catch-all rules.
 * Bounce/complaint handling is delegated to BounceHandlerService.
 */
@Injectable()
export class EmailInboundService {
  constructor(
    private prisma: PrismaService,
    private eventService: EventService,
    private webhookService: WebhookService,
    private bounceHandler: BounceHandlerService,
  ) {}

  async handleInboundEmail(payload: {
    from: string; to: string; subject: string; sizeBytes: number; spamScore?: number;
  }) {
    const [localPart, domainName] = payload.to.split('@');
    if (!domainName) return { success: false, reason: 'Invalid to address' };

    const domain = await this.prisma.emailDomain.findFirst({ where: { domain: domainName } });
    if (!domain) return { success: false, reason: 'Domain not found' };

    const mailbox = await this.prisma.emailMailbox.findFirst({
      where: { domainId: domain.id, localPart, isActive: true },
    });

    const alias = await this.prisma.emailAlias.findFirst({
      where: { domainId: domain.id, localPart, isActive: true },
    });

    const emailMessage = await this.prisma.emailMessage.create({
      data: {
        mailboxId: mailbox?.id,
        projectId: domain.projectId,
        from: payload.from,
        to: payload.to,
        subject: payload.subject,
        sizeBytes: BigInt(payload.sizeBytes),
        spamScore: payload.spamScore ?? null,
        status: 'ACCEPTED',
      },
    });

    await this.eventService.emit('email.received', {
      messageId: emailMessage.id,
      projectId: domain.projectId,
      mailboxId: mailbox?.id,
      from: payload.from,
      to: payload.to,
    });

    if (alias) {
      const webhookTargets = (alias.targets as Array<{ type: string; url?: string }>)
        .filter(t => t.type === 'webhook' && t.url);
      for (const target of webhookTargets) {
        const result = await this.webhookService.deliver(target.url!, {
          event: 'received',
          messageId: emailMessage.id,
          projectId: domain.projectId,
          mailboxId: mailbox?.id,
          to: payload.to,
          from: payload.from,
          subject: payload.subject,
          timestamp: new Date().toISOString(),
        });
        if (result.delivered) {
          await this.eventService.emit('email.webhook_triggered', {
            messageId: emailMessage.id,
            projectId: domain.projectId,
            url: target.url,
            attempts: result.attempts,
          });
        }
      }
    }

    return { success: true, messageId: emailMessage.id };
  }

  handleBounce(payload: { messageId: string; to: string; error: string; code?: string }) {
    return this.bounceHandler.handleBounce(payload);
  }

  handleComplaint(payload: { email: string; userAgent?: string }) {
    return this.bounceHandler.handleComplaint(payload);
  }

  async setCatchAll(projectId: string, domainId: string, dto: {
    targetType: 'mailbox' | 'external' | 'webhook';
    targetId?: string; targetAddress?: string; webhookUrl?: string;
  }) {
    const domain = await this.prisma.emailDomain.findFirst({ where: { id: domainId, projectId } });
    if (!domain) throw new NotFoundException('Domain not found');

    const target: Record<string, unknown> = { type: dto.targetType };
    if (dto.targetType === 'mailbox') target.mailboxId = dto.targetId;
    else if (dto.targetType === 'external') target.address = dto.targetAddress;
    else if (dto.targetType === 'webhook') target.url = dto.webhookUrl;

    return this.prisma.catchAllRule.upsert({
      where: { domainId },
      create: { domainId, target: target as unknown as object },
      update: { target: target as unknown as object },
    });
  }

  async deleteCatchAll(projectId: string, domainId: string) {
    const domain = await this.prisma.emailDomain.findFirst({ where: { id: domainId, projectId } });
    if (!domain) throw new NotFoundException('Domain not found');
    await this.prisma.catchAllRule.deleteMany({ where: { domainId } });
    return { deleted: true };
  }
}
