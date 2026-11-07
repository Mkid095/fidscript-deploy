/**
 * Bounce rule matching — pure functions that classify an SMTP response
 * (DSN code, raw message, or complaint keyword) into a BounceType.
 *
 * The matcher has no dependencies on Prisma, Nest, or the network — it's
 * safe to call from anywhere and easy to unit test in isolation.
 */
import { Injectable } from '@nestjs/common';

export type BounceType = 'hard' | 'soft' | 'complaint';

export interface ParsedBounce {
  recipient: string;
  type: BounceType;
  code?: string;
  reason: string;
  messageId?: string;
}

const HARD_BOUNCE_CODES = [
  '5.1.1', '5.1.2', '5.1.6', '5.2.0', '5.2.1', '5.2.2',
  '5.4.4', '5.5.0', '5.6.0', '5.7.1',
  '550', '551', '553',
];

const SOFT_BOUNCE_CODES = [
  '4.2.1', '4.2.2', '4.4.1', '4.4.2', '4.5.0', '4.5.3', '4.7.1',
  '450', '451', '452', '421',
];

@Injectable()
export class BounceRuleMatcherService {
  /**
   * Match an SMTP response into a BounceType. Order of checks:
   *   1. Complaint keywords (CAN-SPAM complaint feedback loops).
   *   2. Hard-bounce DSN / SMTP codes.
   *   3. Soft-bounce DSN / SMTP codes.
   *   4. Keyword-based heuristics.
   *   5. Default: soft (safer — allows retry).
   */
  parse(input: {
    rawResponse?: string;
    code?: string;
    recipient: string;
    messageId?: string;
  }): ParsedBounce {
    const raw = input.rawResponse ?? '';
    const code = input.code || this.extractCode(raw) || undefined;
    const reason = raw || `Bounce with code ${code ?? 'unknown'}`;

    if (/complaint|spam report|fbl/i.test(raw)) {
      return { recipient: input.recipient, type: 'complaint', code, reason, messageId: input.messageId };
    }
    if (code && HARD_BOUNCE_CODES.some((c) => code.startsWith(c) || code === c)) {
      return { recipient: input.recipient, type: 'hard', code, reason, messageId: input.messageId };
    }
    if (code && SOFT_BOUNCE_CODES.some((c) => code.startsWith(c) || code === c)) {
      return { recipient: input.recipient, type: 'soft', code, reason, messageId: input.messageId };
    }
    if (/user unknown|mailbox not found|no such user|does not exist|recipient address rejected/i.test(raw)) {
      return { recipient: input.recipient, type: 'hard', code: code ?? '550', reason, messageId: input.messageId };
    }
    if (/mailbox full|quota exceeded|over quota/i.test(raw)) {
      return { recipient: input.recipient, type: 'soft', code: code ?? '452', reason, messageId: input.messageId };
    }
    if (/timeout|connection|temporarily|deferred|greylist/i.test(raw)) {
      return { recipient: input.recipient, type: 'soft', code: code ?? '451', reason, messageId: input.messageId };
    }
    return { recipient: input.recipient, type: 'soft', code, reason, messageId: input.messageId };
  }

  /**
   * Extract an SMTP/DSN code from a free-form response string.
   * Supports both DSN format ("5.1.1") and plain SMTP ("550 5.1.1 user unknown").
   */
  private extractCode(raw: string): string | undefined {
    const dsnMatch = raw.match(/(\d\.\d\.\d)/);
    if (dsnMatch) return dsnMatch[1];
    const smtpMatch = raw.match(/\b([45]\d{2})\b/);
    if (smtpMatch) return smtpMatch[1];
    return undefined;
  }
}
