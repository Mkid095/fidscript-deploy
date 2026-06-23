/**
 * Platform-admin mail-send endpoint.
 *
 * Distinct from PlatformMailService (system-internal: magic codes, alerts)
 * and SmtpSendService (project-scoped: requires a projectId, sender-identity,
 * records a row in email.messages). This controller lets a platform admin
 * send mail from a SPECIFIC mailbox (alert@, noreply@, postmaster@, or any
 * custom platform mailbox) — useful for the in-app compose UI.
 *
 * Auth: only platform admins.
 */
import {
  Controller, Post, Body, UseGuards, HttpCode, HttpStatus, BadRequestException, Inject,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '@/modules/auth/jwt-auth.guard';
import { PlatformAdminGuard } from '@/modules/auth/guards/platform-admin.guard';
import { Roles } from '@/modules/auth/guards/roles.decorator';
import { Role } from '@prisma/client';
import { ConfigService } from '@nestjs/config';
import { IEmailProvider, EMAIL_PROVIDER } from '@/modules/email/providers/i-email-provider';
import { AttachmentStorageService } from '@/modules/email/services/attachment-storage.service';
import * as nodemailer from 'nodemailer';

interface SendAttachmentDto {
  filename: string;
  /** Base64-encoded file content. */
  content: string;
  contentType?: string;
}

interface PlatformSendDto {
  /** Optional sender mailbox local part; defaults to admin@. */
  fromLocal?: string;
  to: string;
  subject: string;
  text?: string;
  html?: string;
  /** Base64-encoded attachments to embed in the sent email. */
  attachments?: SendAttachmentDto[];
}

@ApiTags('admin-platform-mail')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PlatformAdminGuard)
@Roles(Role.ADMIN, Role.OWNER)
@Controller('admin/platform-mail')
export class PlatformAdminMailController {
  constructor(
    private config: ConfigService,
    @Inject(EMAIL_PROVIDER) private email: IEmailProvider,
    private attachmentStorage: AttachmentStorageService,
  ) {}

  @Post('send')
  @HttpCode(HttpStatus.OK)
  async send(@Body() body: PlatformSendDto) {
    if (!body.to || !body.subject) {
      throw new BadRequestException('to and subject required');
    }

    const domain = this.config.get<string>('PLATFORM_DOMAIN', 'deploy.fidscript.com');
    const smtpHost = this.config.get<string>('STALWART_SMTP_HOST', 'fidscript_stalwart');
    const smtpPort = Number(this.config.get('STALWART_SMTP_PORT', 465));
    const systemPassword = this.config.get<string>('SYSTEM_MAILBOX_PASSWORD', '');
    const adminToken = this.config.get<string>('STALWART_ADMIN_TOKEN', '');

    const fromLocal = body.fromLocal ?? 'admin';
    const fromAddress = `${fromLocal}@${domain}`;
    const password = systemPassword || adminToken;

    // Decode and validate attachments
    const decodedAttachments: Array<{
      filename: string;
      content: Buffer;
      contentType?: string;
    }> = (body.attachments ?? []).map((att) => {
      if (!att.content || !att.filename) throw new BadRequestException('attachment must have content and filename');
      return {
        filename: att.filename,
        content: Buffer.from(att.content, 'base64'),
        contentType: att.contentType,
      };
    });

    const transporter = nodemailer.createTransport({
      host: smtpHost,
      port: smtpPort,
      secure: smtpPort === 465,
      auth: { user: fromAddress, pass: password },
      tls: { rejectUnauthorized: false },
      connectionTimeout: 5000,
      greetingTimeout: 5000,
    });

    const info = await transporter.sendMail({
      from: fromAddress,
      to: body.to,
      subject: body.subject,
      text: body.text,
      html: body.html,
      attachments: decodedAttachments,
    });

    // Store attachments externally (secondary copy) after the send succeeds
    let attachmentCount = 0;
    if (body.attachments?.length) {
      try {
        attachmentCount = await this.attachmentStorage.storeOutboundAttachments(
          fromLocal,
          info.messageId,
          (body.attachments ?? []).map((a) => ({
            filename: a.filename,
            bytes: Buffer.from(a.content, 'base64'),
            mimeType: a.contentType ?? 'application/octet-stream',
          })),
        );
      } catch (err: unknown) {
        // Non-fatal — the email was already sent. Log and continue.
        const msg = err instanceof Error ? err.message : String(err);
        console.error(`[PlatformAdminMailController] Failed to store outbound attachments: ${msg}`);
      }
    }

    return {
      status: 'sent',
      messageId: info.messageId,
      from: fromAddress,
      to: body.to,
      attachmentsStored: attachmentCount,
    };
  }
}