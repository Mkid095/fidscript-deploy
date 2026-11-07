/**
 * Bounce + complaint parser.
 *
 * Parses SMTP DSN codes and Stalwart webhook payloads to classify bounces
 * as hard/permanent or soft/transient, then orchestrates the side-effects:
 * message status update, suppression list, abuse and reputation tracking.
 *
 * Hard bounce  → suppress recipient permanently
 * Soft bounce  → allow retry (worker handles backoff)
 * Complaint    → suppress recipient permanently (CAN-SPAM compliance)
 *
 * Split into:
 *   - BounceRuleMatcherService — pure rule-based classification
 *   - BounceParserService (this) — orchestration + side effects
 */
import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { EventService } from '@/modules/events/event.service';
import { AbuseDetectionService } from '@/modules/email/services/abuse-detection.service';
import { EmailReputationService } from '@/modules/email/services/email-reputation.service';
import { BounceRuleMatcherService, ParsedBounce } from './bounce-rule-matcher.service';

export { ParsedBounce, BounceType } from './bounce-rule-matcher.service';

@Injectable()
export class BounceParserService {
  private readonly logger = new Logger(BounceParserService.name);

  constructor(
    private prisma: PrismaService,
    private events: EventService,
    private matcher: BounceRuleMatcherService,
    private abuse: AbuseDetectionService,
    private reputation: EmailReputationService,
  ) {}

  /** Classify an SMTP response into a structured bounce. */
  parse(input: {
    rawResponse?: string;
    code?: string;
    recipient: string;
    messageId?: string;
  }): ParsedBounce {
    return this.matcher.parse(input);
  }

  /**
   * Process a parsed bounce: update message status, suppress if hard/
   * complaint, record abuse events, update reputation.
   */
  async process(parsed: ParsedBounce): Promise<void> {
    const { recipient, type, code, reason, messageId } = parsed;
    this.logger.log(`Processing bounce: type=${type} recipient=${recipient} code=${code}`);

    const [, domainName] = recipient.split('@');
    const emailDomain = domainName
      ? await this.prisma.emailDomain.findFirst({ where: { domain: domainName } })
      : null;
    const domainId = emailDomain?.id;
    const projectId = emailDomain?.projectId;

    if (messageId) {
      try {
        const message = await this.prisma.emailMessage.findUnique({ where: { id: messageId } });
        if (message) {
          const newStatus = type === 'hard' || type === 'complaint' ? 'BOUNCED' : 'SOFT_BOUNCE';
          const failureType = type === 'hard' ? 'RECIPIENT_REJECTED' : type === 'complaint' ? 'SPAM_REJECTED' : 'PROVIDER_ERROR';

          await this.prisma.emailMessage.update({
            where: { id: messageId },
            data: {
              status: newStatus,
              error: reason,
              failureType,
            },
          });

          await this.events.emit('email.bounced', message.projectId, {
            messageId, to: recipient, bounceType: type, code, reason,
          }, {});
        }
      } catch (err) {
        this.logger.error(`Failed to update message ${messageId}: ${(err as Error).message}`);
      }
    }

    if (type === 'hard' || type === 'complaint') {
      await this.suppressRecipient(recipient, type === 'complaint' ? 'COMPLAINT' : 'BOUNCE');
    }

    if (domainId && projectId) {
      await this.abuse.onBounce(domainId, projectId);
      await this.reputation.recordBounce(domainId, projectId);
    }
  }

  /**
   * Add a recipient to the suppression list.
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
      where: { domainId_email: { domainId: emailDomain.id, email: email.toLowerCase() } },
      create: { domainId: emailDomain.id, email: email.toLowerCase(), reason },
      update: { reason },
    }).catch(() => { /* already suppressed */ });

    this.logger.log(`Suppressed ${email} (${reason})`);
  }

  /** Check if a recipient is suppressed before sending. */
  async isSuppressed(email: string): Promise<boolean> {
    const [, domainName] = email.split('@');
    if (!domainName) return false;
    const suppressed = await this.prisma.emailSuppression.findFirst({
      where: { domain: { domain: domainName }, email: email.toLowerCase() },
    });
    return !!suppressed;
  }
}
