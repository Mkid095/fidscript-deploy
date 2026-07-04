/**
 * Bounce + complaint parser.
 *
 * Parses SMTP DSN (Delivery Status Notification) codes and Stalwart webhook
 * payloads to classify bounces as hard/permanent or soft/transient.
 *
 * Hard bounce  → suppress recipient permanently
 * Soft bounce  → allow retry (worker handles backoff)
 * Complaint    → suppress recipient permanently (CAN-SPAM compliance)
 */
import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { EventService } from '@/modules/events/event.service';
import { AbuseDetectionService } from '@/modules/email/services/abuse-detection.service';
import { EmailReputationService } from '@/modules/email/services/email-reputation.service';

export type BounceType = 'hard' | 'soft' | 'complaint';

export interface ParsedBounce {
  recipient: string;
  type: BounceType;
  code?: string;
  reason: string;
  messageId?: string;
}

// SMTP codes that indicate permanent failure (recipient will never accept mail)
const HARD_BOUNCE_CODES = [
  '5.1.1',   // User does not exist
  '5.1.2',   // Bad destination system address
  '5.1.6',   // Mailbox has moved (no forwarding address)
  '5.2.0',   // Other or undefined mailbox status
  '5.2.1',   // Mailbox disabled
  '5.2.2',   // Mailbox full (permanent — but some treat as soft)
  '5.4.4',   // Unable to route
  '5.5.0',   // Other protocol status
  '5.6.0',   // Other media error
  '5.7.1',   // Delivery not authorized
  '550',     // Mailbox unavailable
  '551',     // User not local
  '553',     // Mailbox name not allowed
];

// SMTP codes that are transient (retry)
const SOFT_BOUNCE_CODES = [
  '4.2.1',   // Mailbox disabled (temporary)
  '4.2.2',   // Mailbox full (temporary)
  '4.4.1',   // Connection timed out
  '4.4.2',   // Connection dropped
  '4.5.0',   // Other protocol status (temporary)
  '4.5.3',   // Too many recipients
  '4.7.1',   // Rate limited (temporary)
  '450',     // Mailbox unavailable (temporary)
  '451',     // Local error
  '452',     // Insufficient system storage
  '421',     // Service not available
];

@Injectable()
export class BounceParserService {
  private readonly logger = new Logger(BounceParserService.name);

  constructor(
    private prisma: PrismaService,
    private events: EventService,
    private abuse: AbuseDetectionService,
    private reputation: EmailReputationService,
  ) {}

  /**
   * Parse an SMTP response or DSN payload into a structured bounce.
   */
  parse(input: {
    rawResponse?: string;
    code?: string;
    recipient: string;
    messageId?: string;
  }): ParsedBounce {
    const raw = input.rawResponse ?? '';
    const code = input.code || this.extractCode(raw);
    const reason = raw || `Bounce with code ${code}`;

    // Check for complaint keywords
    if (/complaint|spam report|fbl/i.test(raw)) {
      return { recipient: input.recipient, type: 'complaint', code, reason, messageId: input.messageId };
    }

    // Check for hard bounce codes
    if (code && HARD_BOUNCE_CODES.some(c => code.startsWith(c) || code === c)) {
      return { recipient: input.recipient, type: 'hard', code, reason, messageId: input.messageId };
    }

    // Check for soft bounce codes
    if (code && SOFT_BOUNCE_CODES.some(c => code.startsWith(c) || code === c)) {
      return { recipient: input.recipient, type: 'soft', code, reason, messageId: input.messageId };
    }

    // Keyword-based detection
    if (/user unknown|mailbox not found|no such user|does not exist|recipient address rejected/i.test(raw)) {
      return { recipient: input.recipient, type: 'hard', code: code ?? '550', reason, messageId: input.messageId };
    }
    if (/mailbox full|quota exceeded|over quota/i.test(raw)) {
      return { recipient: input.recipient, type: 'soft', code: code ?? '452', reason, messageId: input.messageId };
    }
    if (/timeout|connection|temporarily|deferred|greylist/i.test(raw)) {
      return { recipient: input.recipient, type: 'soft', code: code ?? '451', reason, messageId: input.messageId };
    }

    // Default: treat as soft (safer — allows retry)
    return { recipient: input.recipient, type: 'soft', code, reason, messageId: input.messageId };
  }

  /**
   * Process a parsed bounce: update message status, suppress if hard/complaint,
   * record abuse events, update reputation.
   */
  async process(parsed: ParsedBounce): Promise<void> {
    const { recipient, type, code, reason, messageId } = parsed;

    this.logger.log(`Processing bounce: type=${type} recipient=${recipient} code=${code}`);

    // Look up domain for abuse/reputation tracking
    const [, domainName] = recipient.split('@');
    const emailDomain = domainName
      ? await this.prisma.emailDomain.findFirst({ where: { domain: domainName } })
      : null;
    const domainId = emailDomain?.id;
    const projectId = emailDomain?.projectId;

    // Update message status
    if (messageId) {
      try {
        const message = await this.prisma.emailMessage.findUnique({ where: { id: messageId } });
        if (message) {
          const newStatus = type === 'hard' ? 'BOUNCED' : type === 'complaint' ? 'BOUNCED' : 'SOFT_BOUNCE';
          const failureType = type === 'hard' ? 'RECIPIENT_REJECTED' : type === 'complaint' ? 'SPAM_REJECTED' : 'PROVIDER_ERROR';

          await this.prisma.emailMessage.update({
            where: { id: messageId },
            data: {
              status: newStatus as any,
              error: reason,
              failureType: failureType as any,
            } as any,
          });

          // Emit bounce event
          await this.events.emit('email.bounced', message.projectId, {
            messageId,
            to: recipient,
            bounceType: type,
            code,
            reason,
          }, {});
        }
      } catch (err) {
        this.logger.error(`Failed to update message ${messageId}: ${(err as Error).message}`);
      }
    }

    // Suppress recipient if hard bounce or complaint
    if (type === 'hard' || type === 'complaint') {
      await this.suppressRecipient(recipient, type === 'complaint' ? 'COMPLAINT' : 'BOUNCE');
    }

    // Record abuse + update reputation
    if (domainId && projectId) {
      await this.abuse.onBounce(domainId, projectId);
      await this.reputation.recordBounce(domainId, projectId);
    }
  }

  /**
   * Add a recipient to the suppression list.
   * Finds the matching EmailDomain and creates/updates the suppression entry.
   */
  async suppressRecipient(email: string, reason: 'BOUNCE' | 'COMPLAINT' | 'MANUAL'): Promise<void> {
    const [, domainName] = email.split('@');
    if (!domainName) return;

    const emailDomain = await this.prisma.emailDomain.findFirst({ where: { domain: domainName } });
    if (!emailDomain) {
      this.logger.debug(`Cannot suppress ${email} — domain ${domainName} not registered`);
      return;
    }

    await this.prisma.emailSuppression.upsert({
      where: {
        domainId_email: { domainId: emailDomain.id, email: email.toLowerCase() },
      },
      create: {
        domainId: emailDomain.id,
        email: email.toLowerCase(),
        reason,
      },
      update: { reason },
    }).catch(() => { /* already suppressed */ });

    this.logger.log(`Suppressed ${email} (${reason})`);
  }

  /**
   * Check if a recipient is suppressed before sending.
   * Returns true if the recipient should NOT receive mail.
   */
  async isSuppressed(email: string): Promise<boolean> {
    const [, domainName] = email.split('@');
    if (!domainName) return false;

    const suppressed = await this.prisma.emailSuppression.findFirst({
      where: { domain: { domain: domainName }, email: email.toLowerCase() },
    });
    return !!suppressed;
  }

  private extractCode(raw: string): string | undefined {
    // Match patterns like "550 5.1.1", "5.1.1", "550"
    const dsnMatch = raw.match(/(\d\.\d\.\d)/);
    if (dsnMatch) return dsnMatch[1];
    const smtpMatch = raw.match(/\b([45]\d{2})\b/);
    if (smtpMatch) return smtpMatch[1];
    return undefined;
  }
}
