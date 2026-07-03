import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '@/prisma/prisma.service';
import { EventService } from '@/modules/events/event.service';
import { RateLimitService } from '@/modules/email/services/rate-limit.service';
import { EmailSendQueueService } from '@/modules/email/services/queue/email-send-queue.service';
import { SendEmailDto } from '@/modules/email/dto/send-email.dto';

/**
 * SMTP send enqueueing — validates, creates EmailMessage record, and enqueues
 * to NATS JetStream for async delivery by the EmailSendWorkerService.
 *
 * Direct SMTP delivery is NO LONGER done here. The worker handles:
 *   - SMTP connection + AUTH
 *   - Delivery attempt recording
 *   - Retry scheduling with exponential backoff
 *   - Status updates
 */
@Injectable()
export class SmtpSendService {
  constructor(
    private prisma: PrismaService,
    private configService: ConfigService,
    private eventService: EventService,
    private rateLimit: RateLimitService,
    private sendQueue: EmailSendQueueService,
  ) {}

  async send(projectId: string, dto: SendEmailDto) {
    const project = await this.prisma.project.findUnique({ where: { id: projectId } });
    if (!project) throw new NotFoundException('Project not found');

    if (dto.apiKeyId) {
      const check = await this.rateLimit.checkCanSend(dto.apiKeyId, projectId);
      if (!check.allowed) throw new ForbiddenException(check.reason);
    }

    let senderIdentityId: string | undefined;
    let senderDomainStatus: string | undefined;
    if (dto.from) {
      const identity = await this.prisma.senderIdentity.findFirst({
        where: { email: dto.from },
        include: { domain: { select: { status: true } } },
      });
      if (identity) {
        senderIdentityId = identity.id;
        senderDomainStatus = identity.domain.status;
      }
      if (senderDomainStatus && senderDomainStatus !== 'ACTIVE') {
        throw new BadRequestException(
          `Sender domain must be ACTIVE. Current status: ${senderDomainStatus}`,
        );
      }

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

    // Create the message record in QUEUED state
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

    // Enqueue to NATS for async delivery
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

    // Track API-key-backed usage
    if (dto.apiKeyId) {
      await this.prisma.emailApiUsage.upsert({
        where: {
          projectId_apiKeyId_date: { projectId, apiKeyId: dto.apiKeyId, date: new Date() },
        },
        create: {
          projectId,
          apiKeyId: dto.apiKeyId,
          date: new Date(),
          sends: 1,
          failures: 0,
          bounces: 0,
        },
        update: {
          sends: { increment: 1 },
        },
      });
    }

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
}
