import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import { EmailProvider, SendEmailOptions } from './email-provider.interface.js';

@Injectable()
export class SmtpProvider implements EmailProvider {
  private transporter: nodemailer.Transporter;

  constructor(private configService: ConfigService) {
    this.transporter = nodemailer.createTransport({
      host: this.configService.get('SMTP_HOST', 'localhost'),
      port: this.configService.get('SMTP_PORT', 587),
      secure: this.configService.get('SMTP_SECURE', false),
      auth: this.configService.get('SMTP_USER')
        ? {
            user: this.configService.get('SMTP_USER'),
            pass: this.configService.get('SMTP_PASS'),
          }
        : undefined,
    });
  }

  async send(options: SendEmailOptions): Promise<{ messageId: string; accepted: string[]; rejected: string[] }> {
    const info = await this.transporter.sendMail({
      from: options.from || this.configService.get('SMTP_FROM', 'noreply@localhost'),
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

  async getQuota(mailbox: string): Promise<{ used: number; limit: number }> {
    return { used: 0, limit: this.configService.get('SMTP_QUOTA', 10737418240) };
  }

  async verifyDomain(domain: string): Promise<{ dkim: boolean; spf: boolean; dmarc: boolean }> {
    return { dkim: true, spf: true, dmarc: true };
  }

  async getDeliveryStatus(messageId: string): Promise<{ status: string; delivered?: boolean; bounced?: boolean }> {
    return { status: 'sent', delivered: true };
  }
}