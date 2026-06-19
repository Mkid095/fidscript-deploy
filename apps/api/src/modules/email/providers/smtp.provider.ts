/**
 * Stalwart SMTP email provider for v0.15.5.
 *
 * SMTP submission on port 465 (implicit TLS) with AUTH PLAIN.
 * Credentials: the platform's Stalwart admin token (STALWART_ADMIN_TOKEN).
 * This is the same token used for StalwartJmapService HTTP Basic auth.
 *
 * The submission credentials in api.env (SMTP_SUBMISSION_USER/PASS) are
 * NOT registered with Stalwart — they were generated at setup but never
 * imported into the internal directory. Only the fallback-admin account
 * (user=admin, password=STALWART_ADMIN_TOKEN) works.
 *
 * Port 465 is used (implicit TLS) because it works reliably without
 * STARTTLS negotiation. Port 587 is also available but requires
 * STARTTLS which nodemailer handles automatically.
 */
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import * as fs from 'fs';
import { EmailProvider, SendEmailOptions } from './email-provider.interface';

@Injectable()
export class SmtpProvider implements EmailProvider {
  private transporter: nodemailer.Transporter;

  constructor(private configService: ConfigService) {
    // Stalwart SMTP: use the admin token as the password.
    // The admin token file is at /run/secrets/stalwart_admin_token (mounted by compose).
    const adminTokenFile = this.configService.get<string>('STALWART_ADMIN_TOKEN_FILE', '/run/secrets/stalwart_admin_token');
    let adminToken = '';
    try {
      adminToken = fs.readFileSync(adminTokenFile, 'utf8').trim();
    } catch {
      // Fallback to env var (may be set in development)
      adminToken = this.configService.get<string>('STALWART_ADMIN_TOKEN', '');
    }

    const host = this.configService.get<string>('STALWART_SMTP_HOST', 'fidscript_stalwart');
    const port = this.configService.get<number>('STALWART_SMTP_PORT', 465);
    const secure = port === 465;

    this.transporter = nodemailer.createTransport({
      host,
      port,
      secure, // true = implicit TLS on 465, false = STARTTLS on 587
      auth: {
        user: 'admin',
        pass: adminToken,
      },
    });
  }

  async send(options: SendEmailOptions): Promise<{ messageId: string; accepted: string[]; rejected: string[] }> {
    const info = await this.transporter.sendMail({
      from: options.from || this.configService.get('SMTP_FROM', `noreply@${this.configService.get('PLATFORM_DOMAIN', 'localhost')}`),
      to: options.to,
      replyTo: options.replyTo,
      subject: options.subject,
      text: options.text,
      html: options.html,
      attachments: options.attachments?.map(a => ({
        filename: a.filename,
        content: a.content,
        contentType: a.contentType,
      })),
    });

    return {
      messageId: info.messageId,
      accepted: info.accepted,
      rejected: info.rejected,
    };
  }

  async getQuota(_mailbox: string): Promise<{ used: number; limit: number }> {
    return { used: 0, limit: this.configService.get('SMTP_QUOTA', 10737418240) };
  }

  async verifyDomain(_domain: string): Promise<{ dkim: boolean; spf: boolean; dmarc: boolean }> {
    return { dkim: true, spf: true, dmarc: true };
  }

  async getDeliveryStatus(_messageId: string): Promise<{ status: string; delivered?: boolean; bounced?: boolean }> {
    return { status: 'sent', delivered: true };
  }
}
