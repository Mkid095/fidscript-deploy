import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { EventService } from '@/modules/events/event.service';
import { WebhookService } from '@/modules/email/services/webhook.service';
import { BounceHandlerService } from '@/modules/email/services/bounce-handler.service';
import { EmailCatchallDeliveryService } from '@/modules/email/services/email-catchall-delivery.service';

/**
 * Inbound email ingestion: receives mail from Stalwart webhook,
 * creates metadata rows, fires webhooks, dispatches catch-all rules.
 * Bounce/complaint handling is delegated to BounceHandlerService.
 * Catch-all delivery is delegated to EmailCatchallDeliveryService.
 * Catch-all CRUD lives in EmailCatchallCrudService.
 */
@Injectable()
export class EmailInboundService {
  constructor(
    private prisma: PrismaService,
    private eventService: EventService,
    private webhookService: WebhookService,
    private bounceHandler: BounceHandlerService,
    private catchallDelivery: EmailCatchallDeliveryService,
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
        from: payload.from, to: payload.to, subject: payload.subject,
        sizeBytes: BigInt(payload.sizeBytes),
        spamScore: payload.spamScore ?? null, status: 'RECEIVED',
      },
    });

    await this.eventService.emit('email.received', domain.projectId, {
      messageId: emailMessage.id,
      // jmapMessageId may be populated by the Stalwart Sieve notify payload;
      // inbound attachment extraction guards on its presence.
      jmapMessageId: undefined as string | undefined,
      mailboxId: mailbox?.id,
      // Mailbox localPart is needed by the listener to resolve JMAP credentials.
      mailboxLocal: mailbox?.localPart ?? localPart,
      from: payload.from, to: payload.to, subject: payload.subject,
    }, {});

    if (alias) await this.deliverAliasWebhooks(alias, emailMessage.id, domain.projectId, mailbox?.id, payload);

    if (!mailbox && !alias) {
      await this.deliverCatchAllIfAny(domain.id, emailMessage.id, domain.projectId, payload);
    }

    return { success: true, messageId: emailMessage.id };
  }

  private async deliverAliasWebhooks(
    alias: { targets: unknown },
    emailMessageId: string,
    projectId: string,
    mailboxId: string | undefined,
    payload: { from: string; to: string; subject: string },
  ): Promise<void> {
    const targets = (alias.targets as Array<{ type: string; url?: string }>)
      .filter(t => t.type === 'webhook' && t.url);
    for (const target of targets) {
      const result = await this.webhookService.deliver(target.url!, {
        event: 'received', messageId: emailMessageId, projectId,
        mailboxId, to: payload.to, from: payload.from, subject: payload.subject,
        timestamp: new Date().toISOString(),
      });
      if (result.delivered) {
        await this.eventService.emit('email.webhook_triggered', projectId, {
          messageId: emailMessageId, url: target.url, attempts: result.attempts,
        }, {});
      }
    }
  }

  private async deliverCatchAllIfAny(
    domainId: string,
    emailMessageId: string,
    projectId: string,
    payload: { from: string; to: string; subject: string },
  ): Promise<void> {
    const catchAll = await this.prisma.catchAllRule.findUnique({ where: { domainId } });
    if (!catchAll) return;
    const raw = catchAll.target as unknown as {
      type?: string; mailboxId?: string; address?: string; url?: string;
    } | null;
    if (!raw?.type) return;
    const target = { type: raw.type, mailboxId: raw.mailboxId, address: raw.address, url: raw.url };
    if (!this.catchallDelivery.isActive(target)) return;
    await this.catchallDelivery.deliver(target, {
      messageId: emailMessageId, projectId,
      from: payload.from, to: payload.to, subject: payload.subject,
    });
  }

  handleBounce(payload: { messageId: string; to: string; error: string; code?: string }) {
    return this.bounceHandler.handleBounce(payload);
  }

  handleComplaint(payload: { email: string; userAgent?: string }) {
    return this.bounceHandler.handleComplaint(payload);
  }
}
