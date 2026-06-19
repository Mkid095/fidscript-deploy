import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '@/prisma/prisma.service';
import { EventService } from '@/modules/events/event.service';
import { RateLimitService } from '@/modules/email/services/rate-limit.service';
import { SendEmailDto } from '@/modules/email/dto/send-email.dto';
import * as crypto from 'crypto';
import * as fs from 'fs';

/**
 * SMTP sending — connects to Stalwart, submits mail, records metadata.
 *
 * Stalwart v0.15.5: SMTP submission on port 465 (implicit TLS) with AUTH PLAIN.
 * Credentials: user=admin, password=STALWART_ADMIN_TOKEN (platform admin token).
 * This is the only credential that works — the SMTP_SUBMISSION_USER/PASS
 * generated at setup time are NOT registered in Stalwart's internal directory.
 */
@Injectable()
export class SmtpSendService {
  private adminToken: string;

  constructor(
    private prisma: PrismaService,
    private configService: ConfigService,
    private eventService: EventService,
    private rateLimit: RateLimitService,
  ) {
    // Load the admin token once at construction. The file is mounted by compose.
    const tokenFile = this.configService.get<string>('STALWART_ADMIN_TOKEN_FILE', '/run/secrets/stalwart_admin_token');
    try {
      this.adminToken = fs.readFileSync(tokenFile, 'utf8').trim();
    } catch {
      // Fallback for environments where the file isn't mounted
      this.adminToken = this.configService.get<string>('STALWART_ADMIN_TOKEN', '');
    }
  }

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

    // Stalwart v0.15.5: port 465 (implicit TLS), AUTH PLAIN with admin token.
    const smtpHost = this.configService.get<string>('STALWART_SMTP_HOST', 'fidscript_stalwart');
    const smtpPort = this.configService.get<number>('STALWART_SMTP_PORT', 465);
    const secure = smtpPort === 465;

    const { default: nodemailer } = await import('nodemailer');
    const transporter = nodemailer.createTransport({
      host: smtpHost,
      port: smtpPort,
      secure, // true = implicit TLS on 465, false = STARTTLS on 587
      auth: { user: 'admin', pass: this.adminToken },
    });

    let messageId = `<${Date.now()}-${crypto.randomBytes(6).toString('hex')}@${
      this.configService.get('PLATFORM_MAIL_HOST', 'mail.deploy.fidscript.com')
    }>`;
    let accepted: string[] = [];
    let errorMsg: string | undefined;
    let result: 'sent' | 'failed' | 'bounced' = 'sent';

    try {
      const res = await transporter.sendMail({
        from: dto.from ?? this.configService.get('SMTP_FROM', 'noreply@localhost'),
        to: dto.to,
        subject: dto.subject,
        text: dto.text,
        html: dto.html,
        replyTo: dto.replyTo,
      });
      messageId = res.messageId ?? messageId;
      accepted = (res.accepted ?? [dto.to]).filter((a): a is string => typeof a === 'string');
    } catch (err) {
      errorMsg = err instanceof Error ? err.message : String(err);
      result = errorMsg.includes('bounce') || errorMsg.includes('550') ? 'bounced' : 'failed';
    }

    const emailMessage = await this.prisma.emailMessage.create({
      data: {
        projectId,
        senderIdentityId,
        from: dto.from ?? this.configService.get('SMTP_FROM', 'noreply@localhost'),
        to: dto.to,
        subject: dto.subject,
        status: errorMsg ? (result === 'bounced' ? 'BOUNCED' : 'FAILED') : 'SUBMITTED',
        error: errorMsg,
      },
    });

    // Only track API-key-backed usage when an apiKeyId is provided.
    // Platform-initiated sends (notifications, no API key) skip usage tracking.
    if (dto.apiKeyId) {
      await this.prisma.emailApiUsage.upsert({
        where: {
          projectId_apiKeyId_date: { projectId, apiKeyId: dto.apiKeyId, date: new Date() },
        },
        create: {
          projectId,
          apiKeyId: dto.apiKeyId,
          date: new Date(),
          sends: result === 'sent' ? 1 : 0,
          failures: result === 'failed' ? 1 : 0,
          bounces: result === 'bounced' ? 1 : 0,
        },
        update: {
          sends: result === 'sent' ? { increment: 1 } : undefined,
          failures: result === 'failed' ? { increment: 1 } : undefined,
          bounces: result === 'bounced' ? { increment: 1 } : undefined,
        },
      });
    }

    if (!errorMsg) {
      await this.eventService.emit('email.sent', {
        messageId: emailMessage.id,
        projectId,
        to: dto.to,
        from: dto.from,
      });
    }

    return {
      messageId: emailMessage.id,
      accepted,
      status: errorMsg ? (result === 'bounced' ? 'BOUNCED' : 'FAILED') : 'SUBMITTED',
      error: errorMsg,
    };
  }
}
