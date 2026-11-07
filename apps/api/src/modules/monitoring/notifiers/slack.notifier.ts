import { Injectable } from '@nestjs/common';
import { Notifier, ChannelLike, AlertPayload, SendResult } from './notifier.interface';

/**
 * Phase 14 — Slack notifier. POSTs a Slack incoming-webhook payload to the
 * configured URL. Same no-egress caveat as the webhook notifier on this VPS.
 */
@Injectable()
export class SlackNotifier implements Notifier {
  readonly type = 'slack';

  async send(channel: ChannelLike, alert: AlertPayload): Promise<SendResult> {
    const cfg = channel.config as { url?: string };
    if (!cfg?.url) return { success: false, error: 'slack channel missing "url"' };
    const body = JSON.stringify({ text: `:rotating_light: *${alert.ruleName}* — ${alert.message}` });
    try {
      const res = await fetch(cfg.url, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body,
        signal: AbortSignal.timeout(10000),
      });
      if (!res.ok) return { success: false, error: `slack responded ${res.status}` };
      return { success: true };
    } catch (err: unknown) {
      return { success: false, error: (err as Error).message };
    }
  }
}
