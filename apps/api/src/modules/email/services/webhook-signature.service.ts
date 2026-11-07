import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import * as fs from 'fs';

/**
 * The signature Stalwart puts on a webhook.
 *
 * Two things were wrong with the check:
 *
 *  - **It was optional.** The comparison ran only when the header was
 *    present, so a caller who simply left the header off was let in — and
 *    the header is the only thing standing between the internet and the
 *    ability to inject mail into any tenant's mailbox.
 *  - **It was computed over the wrong bytes.** The body was re-serialized
 *    from the parsed JSON, so even a correctly signed webhook did not
 *    match.
 *
 * The secret is also read from the file the installer writes
 * (`STALWART_WEBHOOK_SECRET_FILE`), which nothing read before: the
 * installer generated the secret and the API never saw it, so the check
 * could never have passed either.
 */
@Injectable()
export class WebhookSignatureService {
  private readonly logger = new Logger(WebhookSignatureService.name);

  constructor(private config: ConfigService) {}

  /**
   * Check a signature over the raw request body.
   *
   * Throws when the signature is missing or does not match. There is no
   * "unsigned is allowed" path: if the platform has no webhook secret,
   * the webhook is closed.
   */
  verify(rawBody: Buffer | string, signature: string | undefined): void {
    if (!signature) {
      throw new UnauthorizedException('Missing webhook signature');
    }
    const secret = this.secret();
    if (!secret) {
      this.logger.warn(
        'A webhook arrived but the platform has no webhook secret — refusing it. ' +
          'Set STALWART_WEBHOOK_SECRET (or its _FILE) to accept webhooks.',
      );
      throw new UnauthorizedException('Webhooks are not configured on this platform');
    }
    const body = typeof rawBody === 'string' ? rawBody : rawBody.toString('utf8');
    const expected = 'sha256=' + crypto.createHmac('sha256', secret).update(body, 'utf8').digest('hex');
    const given = Buffer.from(signature);
    const wanted = Buffer.from(expected);
    // timingSafeEqual throws when the lengths differ, so they are compared
    // first — a wrong length is a wrong signature, not a server error.
    if (given.length !== wanted.length || !crypto.timingSafeEqual(given, wanted)) {
      throw new UnauthorizedException('Invalid webhook signature');
    }
  }

  /** The shared secret, from the environment or from the file the installer wrote. */
  private secret(): string {
    const fromEnv = this.config.get<string>('STALWART_WEBHOOK_SECRET', '');
    if (fromEnv) return fromEnv.trim();
    const file = this.config.get<string>(
      'STALWART_WEBHOOK_SECRET_FILE',
      '/run/secrets/stalwart_webhook_secret',
    );
    try {
      if (!fs.existsSync(file)) return '';
      return fs.readFileSync(file, 'utf8').trim();
    } catch {
      return '';
    }
  }
}
