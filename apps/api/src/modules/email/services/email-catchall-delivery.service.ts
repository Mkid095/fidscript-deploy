import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { EventService } from '@/modules/events/event.service';
import { WebhookService } from '@/modules/email/services/webhook.service';

/**
 * Catch-all delivery — handles the post-receive routing for unmatched
 * addresses. Falls into one of three target types:
 *
 *   - webhook: deliver to the configured URL via WebhookService
 *   - external: emit a forward-pending event (the SMTP send service
 *               will resend via the platform's outbound path)
 *   - mailbox: re-attribute the EmailMessage to the target mailbox
 *
 * Does NOT manage the catch-all rule itself; that lives in
 * EmailInboundService (CRUD endpoints).
 */
@Injectable()
export class EmailCatchallDeliveryService {
  constructor(
    private prisma: PrismaService,
    private eventService: EventService,
    private webhookService: WebhookService,
  ) {}

  isActive(target: unknown): boolean {
    if (!target || typeof target !== 'object') return false;
    const t = target as { type?: string; mailboxId?: string; address?: string; url?: string };
    if (t.type === 'mailbox') return !!t.mailboxId;
    if (t.type === 'external') return !!t.address;
    if (t.type === 'webhook') return !!t.url;
    return false;
  }

  async deliver(
    target: { type: string; mailboxId?: string; address?: string; url?: string },
    payload: {
      messageId: string;
      projectId: string;
      from: string;
      to: string;
      subject: string;
    },
  ): Promise<void> {
    if (target.type === 'webhook' && target.url) {
      const result = await this.webhookService.deliver(target.url, {
        event: 'received',
        messageId: payload.messageId,
        projectId: payload.projectId,
        from: payload.from,
        to: payload.to,
        subject: payload.subject,
        timestamp: new Date().toISOString(),
      });
      if (result.delivered) {
        await this.eventService.emit('email.webhook_triggered', payload.projectId, {
          messageId: payload.messageId,
          url: target.url,
          attempts: result.attempts,
          source: 'catchall',
        }, {});
      }
      return;
    }
    if (target.type === 'external' && target.address) {
      // External forwarding happens in the SMTP send service (resend via the
      // platform's outbound path). Emit a pending event so the audit log
      // stays truthful even before the resend is wired.
      await this.eventService.emit('email.catchall.forward_pending', payload.projectId, {
        messageId: payload.messageId,
        target: target.address,
      }, {});
      return;
    }
    if (target.type === 'mailbox' && target.mailboxId) {
      await this.prisma.emailMessage.update({
        where: { id: payload.messageId },
        data: { mailboxId: target.mailboxId, status: 'RECEIVED' },
      });
    }
  }
}
