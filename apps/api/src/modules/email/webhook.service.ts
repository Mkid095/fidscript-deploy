/**
 * Handles outbound webhook delivery for email events.
 * Called when mail arrives on an alias with a webhook target, or for delivery tracking events.
 */
import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';

export interface EmailWebhookPayload {
  event: 'delivered' | 'opened' | 'clicked' | 'bounced' | 'complained' | 'received';
  messageId: string;
  projectId: string;
  mailboxId?: string;
  to: string;
  from: string;
  subject?: string;
  timestamp: string;
  metadata?: Record<string, unknown>;
}

@Injectable()
export class WebhookService {
  private readonly logger = new Logger(WebhookService.name);

  /**
   * Deliver a webhook to a registered URL.
   * Retries up to 3 times with exponential backoff.
   */
  async deliver(url: string, payload: EmailWebhookPayload): Promise<{ delivered: boolean; attempts: number }> {
    let attempts = 0;
    const maxAttempts = 3;
    const delays = [1000, 5000, 15000];

    while (attempts < maxAttempts) {
      attempts++;
      try {
        await axios.post(url, payload, {
          headers: { 'Content-Type': 'application/json', 'User-Agent': 'FIDScript-Email/1.0' },
          timeout: 10000,
        });
        this.logger.log(`Webhook delivered to ${url} after ${attempts} attempt(s)`);
        return { delivered: true, attempts };
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        this.logger.warn(`Webhook attempt ${attempts}/${maxAttempts} failed for ${url}: ${msg}`);
        if (attempts < maxAttempts) {
          await this.sleep(delays[attempts - 1]);
        }
      }
    }

    this.logger.error(`Webhook delivery permanently failed for ${url} after ${maxAttempts} attempts`);
    return { delivered: false, attempts };
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
