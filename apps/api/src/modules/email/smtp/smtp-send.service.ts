import { Injectable, NotFoundException, BadRequestException, ForbiddenException, HttpException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '@/prisma/prisma.service';
import { EventService } from '@/modules/events/event.service';
import { EmailRateLimitService } from '@/modules/email/services/email-rate-limit.service';
import { EmailReputationService } from '@/modules/email/services/email-reputation.service';
import { AbuseDetectionService } from '@/modules/email/services/abuse-detection.service';
import { EmailSendQueueService } from '@/modules/email/services/queue/email-send-queue.service';
import { SendEmailDto } from '@/modules/email/dto/send-email.dto';

/**
 * SMTP send enqueueing — validates, creates EmailMessage record, and enqueues
 * to NATS JetStream for async delivery by the EmailSendWorkerService.
 *
 * All rate limiting, reputation checks, and abuse detection run BEFORE enqueue.
 * Actual SMTP delivery is handled by the worker.
 */
@Injectable()
export class SmtpSendService {
  constructor(
    private prisma: PrismaService,
    private configService: ConfigService,
    private eventService: EventService,
    private rateLimit: EmailRateLimitService,
    private reputation: EmailReputationService,
    private abuse: AbuseDetectionService,
    private sendQueue: EmailSendQueueService,
  ) {}

  async send(
    projectId: string,
    dto: SendEmailDto,
    ipAddress?: string,
  ) {
    const project = await this.prisma.project.findUnique({ where: { id: projectId } });
    if (!project) throw new NotFoundException('Project not found');

    // ── 1. Rate limit check (all levels: IP → project → API key → domain) ──
    if (dto.apiKeyId) {
      const domain = this.extractDomain(dto.from);
      const limitResult = await this.rateLimit.checkAll(
        dto.apiKeyId,
        projectId,
        domain,
        ipAddress ?? 'unknown',
      );
      if (!limitResult.allowed) {
        const err = new HttpException(
          limitResult.reason ?? 'Rate limit exceeded',
          429,
        );
        (err as HttpException & { headers: Record<string, string> }).headers = {
          'Retry-After': String(limitResult.retryAfterSeconds ?? 60),
          'X-RateLimit-Limit': String(limitResult.limit ?? 0),
          'X-RateLimit-Remaining': String(limitResult.remaining ?? 0),
        };
        throw err;
      }
    }

    // ── 2. Sender identity + domain status ──
    let senderIdentityId: string | undefined;
    let domainId: string | undefined;
    let senderDomainStatus: string | undefined;
    let senderDomainId: string | undefined;

    if (dto.from) {
      const identity = await this.prisma.senderIdentity.findFirst({
        where: { email: dto.from },
        include: { domain: { select: { id: true, status: true } } },
      });
      if (identity) {
        senderIdentityId = identity.id;
        senderDomainId = identity.domain.id;
        senderDomainStatus = identity.domain.status;
      }
      if (senderDomainStatus && senderDomainStatus !== 'ACTIVE') {
        throw new BadRequestException(
          `Sender domain must be ACTIVE. Current status: ${senderDomainStatus}`,
        );
      }

      // ── 3. Reputation check (before enqueue) ──
      if (senderDomainId) {
        const repResult = await this.reputation.checkDomain(senderDomainId, projectId);
        if (!repResult.allowed) {
          throw new ForbiddenException(repResult.reason);
        }
        if (repResult.delayMs) {
          // Exponential delay for restricted tier — sleep then proceed
          await new Promise(resolve => setTimeout(resolve, repResult.delayMs));
        }
      }

      // Check suppression list
      const suppressed = await this.prisma.emailSuppression.findFirst({
        where: { domain: { domain: dto.from.split('@')[1] }, email: dto.to.toLowerCase() },
      });
      if (suppressed) {
        throw new ForbiddenException(
          `Recipient ${dto.to} is suppressed (${suppressed.reason}). Cannot send.`,
        );
      }
    }

    const from = dto.from ?? this.configService.get<string>('SMTP_FROM', 'noreply@localhost') ?? 'noreply@localhost';

    // ── 4. Create the message record in QUEUED state ──
    const emailMessage = await this.prisma.emailMessage.create({
      data: {
        projectId,
        senderIdentityId,
        from,
        to: dto.to,
        subject: dto.subject,
        textBody: dto.text,
        htmlBody: dto.html,
        status: 'QUEUED' as any,
        retryCount: 0 as any,
      } as any,
    });

    // ── 5. Enqueue to NATS ──
    await this.sendQueue.enqueue({
      messageId: emailMessage.id,
      projectId,
      from,
      to: dto.to,
      subject: dto.subject,
      text: dto.text,
      html: dto.html,
      replyTo: dto.replyTo,
      apiKeyId: dto.apiKeyId,
      attempt: 1,
    });

    // ── 6. Record usage (daily/monthly DB quota) ──
    if (dto.apiKeyId) {
      const domain = this.extractDomain(dto.from);
      await this.rateLimit.recordUsage(dto.apiKeyId, projectId, domain);
    }

    // ── 7. Abuse detection: track send for growth spike ──
    if (senderDomainId) {
      await this.abuse.onSend(senderDomainId, projectId);
    }

    // ── 8. Emit queued event ──
    await this.eventService.emit('email.queued', projectId, {
      messageId: emailMessage.id,
      to: dto.to,
      from,
    }, {});

    return {
      messageId: emailMessage.id,
      accepted: [dto.to],
      status: 'QUEUED',
      error: undefined,
    };
  }

  private extractDomain(from?: string): string {
    return from?.split('@')[1] ?? 'unknown';
  }
}
