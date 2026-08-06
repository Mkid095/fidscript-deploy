import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import { JwtAuthGuard } from '@/modules/auth/jwt-auth.guard';
import { PlatformAdminGuard } from '@/modules/auth/guards/platform-admin.guard';
import { Roles } from '@/modules/auth/guards/roles.decorator';
import { Role } from '@prisma/client';

export interface MailConnectionInfo {
  /** Public hostname users should configure in their mail client (e.g. mail.deploy.fidscript.com). */
  hostname: string;
  imap: { host: string; port: number; tls: boolean };
  smtp: { host: string; port: number; secure: boolean; submissionPort: number };
  /** Stalwart supports PLAIN / LOGIN auth on both IMAP and submission. */
  authMethod: 'PLAIN' | 'LOGIN';
  usernameFormat: 'full-email';
  tlsVersion: 'TLSv1.2+';
}

@ApiTags('admin-mail-connection')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PlatformAdminGuard)
@Roles(Role.ADMIN, Role.OWNER)
@Controller('admin/mail/connection')
export class MailConnectionController {
  constructor(private readonly config: ConfigService) {}

  /**
   * GET /admin/mail/connection
   *
   * Returns the IMAP / SMTP / submission connection details so a platform admin
   * can configure Thunderbird / Apple Mail / Outlook against the self-hosted
   * Stalwart server. All values are public to authenticated admins — no secrets.
   */
  @Get()
  @ApiOperation({ summary: 'Return Stalwart IMAP/SMTP/submission connection details' })
  get(): MailConnectionInfo {
    const hostname = this.config.get<string>('PLATFORM_MAIL_HOST')
      ?? this.config.get<string>('STALWART_PUBLIC_HOSTNAME')
      ?? `mail.${this.config.get<string>('PLATFORM_DOMAIN', 'deploy.fidscript.com')}`;
    const smtpPort = Number(this.config.get('STALWART_SMTP_PORT', 587));
    return {
      hostname,
      imap: { host: hostname, port: 993, tls: true },
      smtp: { host: hostname, port: smtpPort, secure: smtpPort === 465, submissionPort: 587 },
      authMethod: 'PLAIN',
      usernameFormat: 'full-email',
      tlsVersion: 'TLSv1.2+',
    };
  }
}
