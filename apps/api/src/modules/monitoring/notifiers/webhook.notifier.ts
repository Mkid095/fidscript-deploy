import { Injectable } from '@nestjs/common';
import { createHmac } from 'crypto';
import { Notifier, ChannelLike, AlertPayload, SendResult } from './notifier.interface';

/**
 * Phase 14 — webhook notifier. POSTs the alert JSON to the configured URL,
 * optionally signing the body with an HMAC-SHA256 of a shared `secret`
 * (header `x-fidscript-signature: sha256=<hex>`). 10s timeout.
 *
 * NOTE: this VPS has no external egress, so a real outbound webhook cannot be
 * delivered here — the dispatch path + delivery record are exercised, and live
 * delivery is documented as needs-egress (cf. Phase 12 function-runtime caveat).
 */
@Injectable()
export class WebhookNotifier implements Notifier {
  readonly type = 'webhook';

  async send(channel: ChannelLike, alert: AlertPayload): Promise<SendResult> {
    const cfg = channel.config as { url?: string; secret?: string };
    if (!cfg?.url) return { success: false, error: 'webhook channel missing "url"' };
    const body = JSON.stringify({ event: 'alert.firing', alert });
    const headers: Record<string, string> = { 'content-type': 'application/json' };
    if (cfg.secret) {
      headers['x-fidscript-signature'] = `sha256=${createHmac('sha256', cfg.secret).update(body).digest('hex')}`;
    }
    try {
      const res = await fetch(cfg.url, {
        method: 'POST',
        headers,
        body,
        signal: AbortSignal.timeout(10000),
      });
      if (!res.ok) return { success: false, error: `webhook responded ${res.status}` };
      return { success: true };
    } catch (err: unknown) {
      return { success: false, error: (err as Error).message };
    }
  }
}
