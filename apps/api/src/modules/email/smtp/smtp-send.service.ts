import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '@/prisma/prisma.service';
import { EventService } from '@/modules/events/event.service';
import { RateLimitService } from '@/modules/email/services/rate-limit.service';
import { SendEmailDto } from '@/modules/email/dto/send-email.dto';
import { createStalwartTransport } from '@/modules/email/common/stalwart-transport';
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
    // Coerce to number: the env var is a STRING ("465" in docker-compose), and
    // "465" === 465 is false — so `secure: port === 465` in the transport
    // would compare string to number, return false, and nodemailer would connect
    // plain TCP to the SMTPS port (465) → 30s greeting timeout. Coercing here
    // + Number(opts.port) in the transport is defense in depth.
    const smtpPort = Number(this.configService.get<string>('STALWART_SMTP_PORT', '465'));

    // AUTH must use the FULL principal name (the full email), not the local
    // part alone. Stalwart v0.16 keys the directory on the full email
    // (e.g. "admin@deploy.fidscript.com"), so user="admin" returns 535 5.7.8
    // even with the correct password. The compose env SMTP_SUBMISSION_USER
    // (set to the full email) + SMTP_SUBMISSION_PASS (the matching token;
    // default = the file token) is the right credential. Confirmed end-to-end
    // by openssl AUTH PLAIN to the live :465 -> 235 2.7.0 Authentication
    // succeeded (with this exact full-email + file-token combination), while
    // the hardcoded "admin" principal is a separate fallback-admin account
    // whose bcrypt does NOT match the file token.
    const smtpUser = this.configService.get<string>('SMTP_SUBMISSION_USER', 'admin');
    const smtpPass = this.configService.get<string>('SMTP_SUBMISSION_PASS', this.adminToken);

    const transporter = await createStalwartTransport({
      host: smtpHost,
      port: smtpPort,
      user: smtpUser,
      pass: smtpPass,
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
      accepted = (res.accepted ?? [dto.to]).filter((a: unknown): a is string => typeof a === 'string');
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
      await this.eventService.emit('email.sent', projectId, {
        messageId: emailMessage.id,
        to: dto.to,
        from: dto.from,
      }, {});
    }

    return {
      messageId: emailMessage.id,
      accepted,
      status: errorMsg ? (result === 'bounced' ? 'BOUNCED' : 'FAILED') : 'SUBMITTED',
      error: errorMsg,
    };
  }
}
