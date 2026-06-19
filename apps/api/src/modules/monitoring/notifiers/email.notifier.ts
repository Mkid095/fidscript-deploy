import { Injectable } from '@nestjs/common';
import { SmtpSendService } from '@/modules/email/smtp/smtp-send.service';
import { Notifier, ChannelLike, AlertPayload, SendResult } from './notifier.interface';

/**
 * Phase 14 — email notifier. Reuses the Phase 09 Stalwart SMTP path
 * (SmtpSendService.send). The channel config is `{ to, from?, subject? }`;
 * `from` must be a verified sender identity with an ACTIVE domain (Phase 09
 * enforces this). On this VPS, Stalwart accepts the message locally; live
 * delivery to an external inbox needs external egress (documented gap).
 */
@Injectable()
export class EmailNotifier implements Notifier {
  readonly type = 'email';

  constructor(private readonly smtp: SmtpSendService) {}

  async send(channel: ChannelLike, alert: AlertPayload): Promise<SendResult> {
    const cfg = channel.config as { to?: string; from?: string; subject?: string };
    if (!cfg?.to) return { success: false, error: 'email channel missing "to" address' };
    try {
      await this.smtp.send(alert.projectId, {
        to: cfg.to,
        from: cfg.from,
        subject: cfg.subject || `[${alert.severity.toUpperCase()}] ${alert.ruleName} — alert firing`,
        text: `${alert.message}\n\nseverity: ${alert.severity}\nrule: ${alert.ruleName}`,
      });
      return { success: true };
    } catch (err: unknown) {
      return { success: false, error: (err as Error).message };
    }
  }
}
